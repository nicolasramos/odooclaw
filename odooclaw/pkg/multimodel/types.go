// Package multimodel implements a multi-model architecture for OdooClaw.
//
// The architecture routes user messages through specialized models based on
// intent classification, maximizing quality while minimizing cost and latency.
//
// Pipeline flow:
//
//	User → IntentClassifier (300M) → Decision
//	  ├─ greeting/info → Direct response (no LLM call)
//	  ├─ tool_call → ToolRetrieval → ToolModel (1.5B LoRA) → MCP Odoo → Response
//	  ├─ summary → SummarizerModel (300M) → Response
//	  └─ complex → ToolModel with expanded context → Response
package multimodel

import (
	"context"
	"time"
)

// Intent represents the classified intent of a user message.
type Intent string

const (
	IntentGreeting  Intent = "greeting"  // Simple greeting, smalltalk
	IntentInfo      Intent = "info"      // General information request
	IntentToolCall  Intent = "tool_call" // Requires Odoo tool invocation
	IntentSummary   Intent = "summary"   // Summarization / long response
	IntentComplex   Intent = "complex"   // Complex query needing expanded context
	IntentEscalate  Intent = "escalate"  // Should escalate to human
	IntentUnknown   Intent = "unknown"   // Could not classify
)

// IntentResult contains the classification result for a user message.
type IntentResult struct {
	Intent     Intent    `json:"intent"`
	Confidence float64   `json:"confidence"` // 0.0 - 1.0
	Model      string    `json:"model"`      // Which model should handle this
	Latency    time.Duration `json:"latency"`
	Tokens     int       `json:"tokens"`    // Tokens used for classification
}

// ClassificationRequest is the input to the intent classifier.
type ClassificationRequest struct {
	Message       string            `json:"message"`
	History       []Message         `json:"history,omitempty"` // Recent conversation context
	AvailableTools []string         `json:"available_tools,omitempty"`
	ModuleHints   map[string]string `json:"module_hints,omitempty"` // e.g. "current_module": "crm"
}

// Message represents a conversation message for context.
type Message struct {
	Role    string `json:"role"`    // "user" or "assistant"
	Content string `json:"content"`
}

// IntentClassifier classifies user messages into intents.
type IntentClassifier interface {
	// Classify determines the intent of a user message.
	// Returns the intent classification with confidence score.
	Classify(ctx context.Context, req ClassificationRequest) (*IntentResult, error)

	// Close releases resources held by the classifier.
	Close() error
}

// ModelRouter routes classified intents to appropriate model configurations.
type ModelRouter interface {
	// Route selects the model configuration for a given intent.
	Route(intent *IntentResult) *ModelConfig

	// GetModelConfig returns the configuration for a specific model name.
	GetModelConfig(name string) *ModelConfig
}

// ModelConfig describes a model endpoint and its parameters.
type ModelConfig struct {
	Name       string  `json:"name"`
	Endpoint   string  `json:"endpoint"`    // llama.cpp HTTP endpoint
	ModelID    string  `json:"model_id"`    // Model identifier for the endpoint
	MaxTokens  int     `json:"max_tokens"`
	Temperature float64 `json:"temperature"`
	Timeout    time.Duration `json:"timeout"`
}

// PipelineRequest is the input to the multi-model pipeline.
type PipelineRequest struct {
	Message       string            `json:"message"`
	SessionKey    string            `json:"session_key"`
	History       []Message         `json:"history,omitempty"`
	AvailableTools []string         `json:"available_tools,omitempty"`
	ModuleHints   map[string]string `json:"module_hints,omitempty"`
	Metadata      map[string]string `json:"metadata,omitempty"`
}

// PipelineResult is the output from the multi-model pipeline.
type PipelineResult struct {
	Response    string        `json:"response"`
	Intent      *IntentResult `json:"intent"`
	ModelUsed   string        `json:"model_used"`
	ToolCalls   []ToolCall    `json:"tool_calls,omitempty"`
	Latency     time.Duration `json:"latency"`
	TokensUsed  int           `json:"tokens_used"`
	SkippedMain bool          `json:"skipped_main"` // True if main model was bypassed
}

// ToolCall represents a tool invocation requested by the pipeline.
type ToolCall struct {
	Name      string         `json:"name"`
	Arguments map[string]any `json:"arguments"`
}

// PipelineMetrics tracks pipeline performance.
type PipelineMetrics struct {
	ClassificationsTotal int64         `json:"classifications_total"`
	ClassificationErrors int64         `json:"classification_errors"`
	AvgClassificationMs  float64       `json:"avg_classification_ms"`
	RoutedByIntent       map[Intent]int64 `json:"routed_by_intent"`
	TokensSaved          int64         `json:"tokens_saved"`
}
