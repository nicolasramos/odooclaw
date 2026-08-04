package conversation

import (
	"context"
	"testing"
)

func TestClassifyByRules_SystemCommand(t *testing.T) {
	classifier := NewIntentClassifier(nil, "")
	result := classifier.classifyByRules("/show model")

	if result.Intent != IntentSystem {
		t.Errorf("Expected IntentSystem, got %v", result.Intent)
	}
	if result.Confidence != 1.0 {
		t.Errorf("Expected confidence 1.0, got %f", result.Confidence)
	}
}

func TestClassifyByRules_ToolCall(t *testing.T) {
	classifier := NewIntentClassifier(nil, "")

	tests := []struct {
		message      string
		expectedMod  string
	}{
		{"buscar oportunidades en CRM", "crm"},
		{"crear un pedido de venta", "sale"},
		{"buscar productos en inventario", "stock"},
		{"listar facturas de cliente", "account"},
	}

	for _, tt := range tests {
		t.Run(tt.message, func(t *testing.T) {
			result := classifier.classifyByRules(tt.message)
			if result.Intent != IntentToolCall {
				t.Errorf("Expected IntentToolCall, got %v", result.Intent)
			}
			if tt.expectedMod != "" && result.Module != tt.expectedMod {
				t.Errorf("Expected module %q, got %q", tt.expectedMod, result.Module)
			}
		})
	}
}

func TestClassifyByRules_Query(t *testing.T) {
	classifier := NewIntentClassifier(nil, "")

	tests := []string{
		"¿cuántos clientes tenemos?",
		"¿qué pedidos hay pendientes?",
		"cuánto stock queda del producto X",
	}

	for _, msg := range tests {
		t.Run(msg, func(t *testing.T) {
			result := classifier.classifyByRules(msg)
			if result.Intent != IntentQuery {
				t.Errorf("Expected IntentQuery for %q, got %v", msg, result.Intent)
			}
		})
	}
}

func TestClassifyByRules_Action(t *testing.T) {
	classifier := NewIntentClassifier(nil, "")

	tests := []string{
		"confirmar el pedido",
		"enviar la factura por email",
		"aprobar la solicitud",
	}

	for _, msg := range tests {
		t.Run(msg, func(t *testing.T) {
			result := classifier.classifyByRules(msg)
			if result.Intent != IntentAction {
				t.Errorf("Expected IntentAction for %q, got %v", msg, result.Intent)
			}
		})
	}
}

func TestClassifyByRules_DefaultChat(t *testing.T) {
	classifier := NewIntentClassifier(nil, "")

	// Pure greetings should be classified as chat
	tests := []struct {
		message string
		expect  Intent
	}{
		{"hola", IntentChat},
		{"buenos días", IntentChat},
		{"hello", IntentChat},
		{"thank you", IntentChat},
	}

	for _, tt := range tests {
		t.Run(tt.message, func(t *testing.T) {
			result := classifier.classifyByRules(tt.message)
			if result.Intent != tt.expect {
				t.Errorf("Expected %v for %q, got %v", tt.expect, tt.message, result.Intent)
			}
		})
	}
}

func TestClassify_NoProvider(t *testing.T) {
	classifier := NewIntentClassifier(nil, "")
	result := classifier.Classify(context.Background(), "buscar clientes en CRM", nil)

	if result.Intent != IntentToolCall {
		t.Errorf("Expected IntentToolCall, got %v", result.Intent)
	}
}

func TestIntent_String(t *testing.T) {
	tests := []struct {
		intent   Intent
		expected string
	}{
		{IntentChat, "chat"},
		{IntentToolCall, "tool_call"},
		{IntentQuery, "query"},
		{IntentAction, "action"},
		{IntentSystem, "system"},
		{Intent(99), "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			if got := tt.intent.String(); got != tt.expected {
				t.Errorf("Intent.String() = %q, want %q", got, tt.expected)
			}
		})
	}
}
