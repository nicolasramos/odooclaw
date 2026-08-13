package conversation

import (
	"context"
	"strings"

	"github.com/nicolasramos/odooclaw/pkg/logger"
	"github.com/nicolasramos/odooclaw/pkg/providers"
)

// Intent represents the classified intent of a user message.
type Intent int

const (
	// IntentChat is a general conversational message that doesn't
	// require tool execution or special handling.
	IntentChat Intent = iota

	// IntentToolCall indicates the user wants to execute a specific
	// tool (e.g., search Odoo, create a record).
	IntentToolCall

	// IntentQuery indicates the user wants to retrieve information
	// from the knowledge base or Odoo.
	IntentQuery

	// IntentAction indicates the user wants to perform a business
	// action (e.g., create invoice, confirm order).
	IntentAction

	// IntentSystem indicates a system-level command or configuration
	// request (e.g., /show model, /switch channel).
	IntentSystem
)

// String returns a human-readable representation of the intent.
func (i Intent) String() string {
	switch i {
	case IntentChat:
		return "chat"
	case IntentToolCall:
		return "tool_call"
	case IntentQuery:
		return "query"
	case IntentAction:
		return "action"
	case IntentSystem:
		return "system"
	default:
		return "unknown"
	}
}

// IntentResult contains the classification result for a user message.
type IntentResult struct {
	Intent    Intent   `json:"intent"`
	Confidence float64 `json:"confidence"`
	Tools     []string `json:"tools,omitempty"` // Suggested tool names if IntentToolCall
	Module    string   `json:"module,omitempty"` // Odoo module domain (crm, sale, stock, etc.)
}

// IntentClassifier determines what the user wants to do with their message.
// It uses a lightweight approach: first rule-based heuristics, then
// falls back to LLM classification when confidence is low.
type IntentClassifier struct {
	provider providers.LLMProvider
	model    string
}

// NewIntentClassifier creates a new intent classifier.
// If provider is nil, only rule-based classification is used.
func NewIntentClassifier(provider providers.LLMProvider, model string) *IntentClassifier {
	return &IntentClassifier{
		provider: provider,
		model:    model,
	}
}

// Classify determines the intent of a user message.
// Uses fast rule-based heuristics first; falls back to LLM only when
// the heuristic confidence is below the threshold.
func (ic *IntentClassifier) Classify(ctx context.Context, message string, sessionContext []providers.Message) *IntentResult {
	// Phase 1: Fast rule-based classification
	result := ic.classifyByRules(message)
	if result.Confidence >= 0.8 {
		return result
	}

	// Phase 2: LLM-based classification (only if provider available)
	if ic.provider == nil {
		return result
	}

	llmResult, err := ic.classifyByLLM(ctx, message, sessionContext)
	if err != nil {
		logger.WarnCF("conversation", "LLM intent classification failed, using rule-based",
			map[string]any{"error": err.Error()})
		return result
	}

	// Use LLM result if it has higher confidence
	if llmResult.Confidence > result.Confidence {
		return llmResult
	}
	return result
}

// classifyByRules applies fast heuristic rules to classify intent.
func (ic *IntentClassifier) classifyByRules(message string) *IntentResult {
	lower := strings.ToLower(strings.TrimSpace(message))

	// System commands start with /
	if strings.HasPrefix(lower, "/") {
		return &IntentResult{
			Intent:     IntentSystem,
			Confidence: 1.0,
		}
	}

	// Odoo module keywords for tool call detection.
	// We iterate in explicit order (not map order) to ensure deterministic
	// matching: more specific modules first to avoid false positives.
	type moduleKeywords struct {
		module  string
		keywords []string
	}
	modules := []moduleKeywords{
		{module: "crm", keywords: []string{"oportunidad", "lead", "cliente potencial", "pipeline crm", "oportunidades"}},
		{module: "stock", keywords: []string{"inventario", "stock", "almacén", "cantidad stock", "ubicación"}},
		{module: "account", keywords: []string{"factura", "asiento contable", "contabilidad", "pago", "cobro", "impuesto"}},
		{module: "sale", keywords: []string{"pedido de venta", "orden de venta", "presupuesto de venta", "cotización de venta"}},
		{module: "hr", keywords: []string{"empleado", " nómina", "asistencia", "horas trabajadas", "vacaciones"}},
	}

	// Check for explicit tool call patterns
	toolPatterns := []string{
		"buscar", "search", "encontrar", "find",
		"crear", "create", "nuevo", "new",
		"actualizar", "update", "modificar", "modify",
		"eliminar", "delete", "borrar", "remove",
		"listar", "list", "mostrar", "show",
	}

	for _, pattern := range toolPatterns {
		if strings.Contains(lower, pattern) {
			// Determine module — check each module's keywords in order
			for _, mod := range modules {
				for _, kw := range mod.keywords {
					if strings.Contains(lower, kw) {
						return &IntentResult{
							Intent:     IntentToolCall,
							Confidence: 0.9,
							Module:     mod.module,
						}
					}
				}
			}
			return &IntentResult{
				Intent:     IntentToolCall,
				Confidence: 0.85,
			}
		}
	}

	// Check for query patterns (information retrieval)
	queryPatterns := []string{
		"¿cuántos", "¿cuántas", "cuántos", "cuántas",
		"¿cuánto", "¿cuánta", "cuánto", "cuánta",
		"¿qué pedidos", "¿qué facturas", "¿qué clientes",
		"¿qué productos", "¿qué registros",
		"cuál es", "dónde está", "cuándo",
		"¿puedes decir", "¿me puedes decir", "¿sabes",
		"¿qué sabes", "¿cómo está",
		"how many", "where is", "when was",
	}

	for _, pattern := range queryPatterns {
		if strings.Contains(lower, pattern) {
			// Check for module-specific queries
			for _, mod := range modules {
				for _, kw := range mod.keywords {
					if strings.Contains(lower, kw) {
						return &IntentResult{
							Intent:     IntentQuery,
							Confidence: 0.85,
							Module:     mod.module,
						}
					}
				}
			}
			return &IntentResult{
				Intent:     IntentQuery,
				Confidence: 0.75,
			}
		}
	}

	// Check for action patterns (business actions)
	actionPatterns := []string{
		"confirmar", "confirm",
		"enviar", "send",
		"aprobar", "approve",
		"procesar", "process",
		"registrar", "register",
	}

	for _, pattern := range actionPatterns {
		if strings.Contains(lower, pattern) {
			return &IntentResult{
				Intent:     IntentAction,
				Confidence: 0.8,
			}
		}
	}

	// Default: general chat
	return &IntentResult{
		Intent:     IntentChat,
		Confidence: 0.6,
	}
}

// classifyByLLM uses the LLM to classify intent when rules aren't confident enough.
func (ic *IntentClassifier) classifyByLLM(
	ctx context.Context,
	message string,
	sessionContext []providers.Message,
) (*IntentResult, error) {
	prompt := `You are an intent classifier for an Odoo ERP assistant. Classify the user's message into one of these intents:
- chat: General conversation, greetings, small talk
- tool_call: User wants to search, create, update, or delete Odoo records
- query: User wants to retrieve/read information from Odoo
- action: User wants to perform a business action (confirm, send, approve)
- system: System command (starts with /)

Respond with ONLY a JSON object:
{"intent": "<intent>", "confidence": <0.0-1.0>, "module": "<odoo_module_or_empty>"}

Odoo modules: crm, sale, stock, account, hr

User message: ` + message

	messages := []providers.Message{
		{Role: "user", Content: prompt},
	}

	response, err := ic.provider.Chat(ctx, messages, nil, ic.model, map[string]any{
		"max_tokens":  100,
		"temperature": 0.1,
	})
	if err != nil {
		return nil, err
	}

	// Parse the LLM response
	content := strings.TrimSpace(response.Content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	var parsed struct {
		Intent     string  `json:"intent"`
		Confidence float64 `json:"confidence"`
		Module     string  `json:"module"`
	}

	// Simple JSON parsing without external dependencies
	if err := parseIntentJSON(content, &parsed); err != nil {
		return nil, err
	}

	var intent Intent
	switch parsed.Intent {
	case "tool_call":
		intent = IntentToolCall
	case "query":
		intent = IntentQuery
	case "action":
		intent = IntentAction
	case "system":
		intent = IntentSystem
	default:
		intent = IntentChat
	}

	return &IntentResult{
		Intent:     intent,
		Confidence: parsed.Confidence,
		Module:     parsed.Module,
	}, nil
}

// parseIntentJSON is a minimal JSON parser for the intent classification response.
// It avoids adding external dependencies for a simple 3-field JSON.
func parseIntentJSON(s string, out *struct {
	Intent     string  `json:"intent"`
	Confidence float64 `json:"confidence"`
	Module     string  `json:"module"`
}) error {
	// Extract intent
	if idx := strings.Index(s, `"intent"`); idx != -1 {
		rest := s[idx+len(`"intent"`):]
		rest = strings.TrimSpace(rest)
		// Skip :"
		if len(rest) > 1 && rest[0] == ':' {
			rest = rest[1:]
		}
		rest = strings.TrimSpace(rest)
		if len(rest) > 1 && rest[0] == '"' {
			rest = rest[1:]
		}
		end := strings.Index(rest, `"`)
		if end != -1 {
			out.Intent = rest[:end]
		}
	}

	// Extract confidence
	if idx := strings.Index(s, `"confidence"`); idx != -1 {
		rest := s[idx+len(`"confidence"`):]
		rest = strings.TrimSpace(rest)
		if len(rest) > 1 && rest[0] == ':' {
			rest = rest[1:]
		}
		rest = strings.TrimSpace(rest)
		end := 0
		for end < len(rest) && (rest[end] >= '0' && rest[end] <= '9' || rest[end] == '.') {
			end++
		}
		if end > 0 {
			val := 0.0
			for i, c := range rest[:end] {
				if c == '.' {
					continue
				}
				digit := float64(c - '0')
				// Simple float parsing
				pos := 0
				for j := 0; j < i; j++ {
					if rest[j] == '.' {
						pos = j
						break
					}
				}
				if pos > 0 {
					divisor := 1.0
					for k := pos; k < i; k++ {
						divisor *= 10
					}
					val += digit / divisor
				} else {
					val = val*10 + digit
				}
			}
			out.Confidence = val
		}
	}

	// Extract module
	if idx := strings.Index(s, `"module"`); idx != -1 {
		rest := s[idx+len(`"module"`):]
		rest = strings.TrimSpace(rest)
		if len(rest) > 1 && rest[0] == ':' {
			rest = rest[1:]
		}
		rest = strings.TrimSpace(rest)
		if len(rest) > 1 && rest[0] == '"' {
			rest = rest[1:]
			end := strings.Index(rest, `"`)
			if end != -1 {
				out.Module = rest[:end]
			}
		}
	}

	return nil
}
