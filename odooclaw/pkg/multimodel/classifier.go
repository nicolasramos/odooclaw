package multimodel

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/providers/openai_compat"
	"github.com/nicolasramos/odooclaw/pkg/providers/protocoltypes"
)

// LLMClassifier implements IntentClassifier using a lightweight LLM
// via an OpenAI-compatible HTTP endpoint (e.g., llama.cpp on N100).
//
// The classifier sends a structured prompt to a small model (300-700M)
// asking it to classify the user's intent into one of the predefined
// categories. The response is parsed as JSON.
type LLMClassifier struct {
	provider *openai_compat.Provider
	model    string
	timeout  time.Duration
}

// ClassifierConfig configures the LLM-based intent classifier.
type ClassifierConfig struct {
	Endpoint string        `json:"endpoint"`   // e.g. "http://n100:8080/v1"
	APIKey   string        `json:"api_key"`    // Often empty for local llama.cpp
	Model    string        `json:"model"`      // e.g. "local-model"
	Timeout  time.Duration `json:"timeout"`    // Classification timeout
}

// NewLLMClassifier creates a new classifier using an LLM endpoint.
func NewLLMClassifier(cfg ClassifierConfig) *LLMClassifier {
	if cfg.Timeout == 0 {
		cfg.Timeout = 5 * time.Second
	}
	if cfg.Model == "" {
		cfg.Model = "local-model"
	}

	apiKey := cfg.APIKey
	if apiKey == "" {
		apiKey = "local"
	}

	return &LLMClassifier{
		provider: openai_compat.NewProvider(apiKey, cfg.Endpoint, ""),
		model:    cfg.Model,
		timeout:  cfg.Timeout,
	}
}

// classifyPrompt is the system prompt for intent classification.
// It instructs the model to return a JSON object with the intent and confidence.
const classifyPrompt = `You are an intent classifier for an Odoo ERP assistant. Analyze the user message and classify it into exactly ONE of these intents:

- "greeting": Simple greeting, smalltalk, "hello", "hi", "thanks", "bye"
- "info": General information about Odoo, how-to questions, explanations
- "tool_call": Requires executing an action in Odoo (search, create, update, delete records, send emails, generate reports)
- "summary": User wants a summary of data, documents, or previous conversations
- "complex": Multi-step analysis, comparisons, calculations across multiple Odoo modules
- "escalate": User is frustrated, asks for a human, or the query is outside Odoo scope

Respond with ONLY a JSON object (no markdown, no explanation):
{"intent": "<intent>", "confidence": <0.0-1.0>, "reasoning": "<one line>"}

Examples:
User: "Hola" → {"intent": "greeting", "confidence": 0.95, "reasoning": "simple greeting"}
User: "Cuántos clientes tenemos?" → {"intent": "tool_call", "confidence": 0.90, "reasoning": "requires odoo search"}
User: "Resume las ventas de este mes" → {"intent": "summary", "confidence": 0.85, "reasoning": "asks for summary"}
User: "Compara facturas vs pagos del Q1" → {"intent": "complex", "confidence": 0.80, "reasoning": "cross-module comparison"}
User: "Quiero hablar con un humano" → {"intent": "escalate", "confidence": 0.95, "reasoning": "requests human"}`

// Classify determines the intent of a user message.
func (c *LLMClassifier) Classify(ctx context.Context, req ClassificationRequest) (*IntentResult, error) {
	start := time.Now()

	// Build classification messages
	messages := buildClassificationMessages(req)

	// Apply timeout
	classifyCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	// Call the lightweight model
	response, err := c.provider.Chat(
		classifyCtx,
		messages,
		nil, // No tools needed for classification
		c.model,
		nil, // No special options
	)
	if err != nil {
		return nil, fmt.Errorf("classifier LLM call failed: %w", err)
	}

	// Parse the response
	result, err := parseClassificationResponse(response.Content)
	if err != nil {
		return nil, fmt.Errorf("failed to parse classification: %w", err)
	}

	result.Latency = time.Since(start)
	if response.Usage != nil {
		result.Tokens = response.Usage.TotalTokens
	}

	return result, nil
}

// buildClassificationMessages constructs the messages for classification.
func buildClassificationMessages(req ClassificationRequest) []protocoltypes.Message {
	var msgs []protocoltypes.Message

	// System prompt
	msgs = append(msgs, protocoltypes.Message{
		Role:    "system",
		Content: classifyPrompt,
	})

	// Build user prompt with context
	var userPrompt strings.Builder
	userPrompt.WriteString("Classify this user message:\n\n")

	// Add relevant history (last 3 turns max to save tokens)
	if len(req.History) > 0 {
		historyLen := len(req.History)
		if historyLen > 6 {
			historyLen = 6
		}
		start := len(req.History) - historyLen
		userPrompt.WriteString("Recent conversation:\n")
		for _, msg := range req.History[start:] {
			role := msg.Role
			if role == "assistant" {
				role = "bot"
			}
			// Truncate long messages
			content := msg.Content
			if len(content) > 100 {
				content = content[:100] + "..."
			}
			userPrompt.WriteString(fmt.Sprintf("%s: %s\n", role, content))
		}
		userPrompt.WriteString("\n")
	}

	// Add current message
	userPrompt.WriteString(fmt.Sprintf("Current message: %s\n", req.Message))

	// Add tool context if available
	if len(req.AvailableTools) > 0 {
		tools := req.AvailableTools
		if len(tools) > 10 {
			tools = tools[:10]
		}
		userPrompt.WriteString(fmt.Sprintf("\nAvailable tools: %s\n", strings.Join(tools, ", ")))
	}

	msgs = append(msgs, protocoltypes.Message{
		Role:    "user",
		Content: userPrompt.String(),
	})

	return msgs
}

// classificationResponse is the raw JSON response from the classifier model.
type classificationResponse struct {
	Intent     string  `json:"intent"`
	Confidence float64 `json:"confidence"`
	Reasoning  string  `json:"reasoning"`
}

// parseClassificationResponse parses the LLM's classification output.
func parseClassificationResponse(content string) (*IntentResult, error) {
	// Clean up the response - strip markdown fences if present
	content = strings.TrimSpace(content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	var raw classificationResponse
	if err := json.Unmarshal([]byte(content), &raw); err != nil {
		// Try to extract JSON from the response if it's embedded
		start := strings.Index(content, "{")
		end := strings.LastIndex(content, "}")
		if start >= 0 && end > start {
			jsonStr := content[start : end+1]
			if err2 := json.Unmarshal([]byte(jsonStr), &raw); err2 != nil {
				return nil, fmt.Errorf("invalid JSON in classifier response: %w (raw: %s)", err, content)
			}
		} else {
			return nil, fmt.Errorf("no JSON found in classifier response: %s", content)
		}
	}

	// Map string intent to Intent type
	intent := classifyStringToIntent(raw.Intent)

	// Clamp confidence to [0, 1]
	confidence := raw.Confidence
	if confidence < 0 {
		confidence = 0
	}
	if confidence > 1 {
		confidence = 1
	}

	return &IntentResult{
		Intent:     intent,
		Confidence: confidence,
		Model:      "", // Router will set this
	}, nil
}

// classifyStringToIntent maps a string to an Intent constant.
func classifyStringToIntent(s string) Intent {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "greeting", "greet", "hello", "smalltalk":
		return IntentGreeting
	case "info", "information", "explain", "howto":
		return IntentInfo
	case "tool_call", "tool", "action", "execute", "search", "create", "update", "delete":
		return IntentToolCall
	case "summary", "summarize", "resumen":
		return IntentSummary
	case "complex", "analysis", "compare", "calculation":
		return IntentComplex
	case "escalate", "human", "frustrated":
		return IntentEscalate
	default:
		log.Printf("multimodel: unknown intent string %q, defaulting to unknown", s)
		return IntentUnknown
	}
}

// Close releases resources held by the classifier.
func (c *LLMClassifier) Close() error {
	return nil
}
