package multimodel

import (
	"testing"
)

func TestParseClassificationResponse(t *testing.T) {
	tests := []struct {
		name       string
		input      string
		wantIntent Intent
		wantConf   float64
		wantErr    bool
	}{
		{
			name:       "valid tool_call response",
			input:      `{"intent": "tool_call", "confidence": 0.90, "reasoning": "requires odoo search"}`,
			wantIntent: IntentToolCall,
			wantConf:   0.90,
		},
		{
			name:       "valid greeting response",
			input:      `{"intent": "greeting", "confidence": 0.95, "reasoning": "simple greeting"}`,
			wantIntent: IntentGreeting,
			wantConf:   0.95,
		},
		{
			name:       "valid summary response",
			input:      `{"intent": "summary", "confidence": 0.85, "reasoning": "asks for summary"}`,
			wantIntent: IntentSummary,
			wantConf:   0.85,
		},
		{
			name:       "valid complex response",
			input:      `{"intent": "complex", "confidence": 0.80, "reasoning": "cross-module comparison"}`,
			wantIntent: IntentComplex,
			wantConf:   0.80,
		},
		{
			name:       "valid escalate response",
			input:      `{"intent": "escalate", "confidence": 0.95, "reasoning": "requests human"}`,
			wantIntent: IntentEscalate,
			wantConf:   0.95,
		},
		{
			name:       "JSON wrapped in markdown fences",
			input:      "```json\n{\"intent\": \"greeting\", \"confidence\": 0.95, \"reasoning\": \"hello\"}\n```",
			wantIntent: IntentGreeting,
			wantConf:   0.95,
		},
		{
			name:       "JSON with extra text around it",
			input:      "The intent is: {\"intent\": \"tool_call\", \"confidence\": 0.90, \"reasoning\": \"search\"} and that's it.",
			wantIntent: IntentToolCall,
			wantConf:   0.90,
		},
		{
			name:       "unknown intent string",
			input:      `{"intent": "something_else", "confidence": 0.5, "reasoning": "unknown"}`,
			wantIntent: IntentUnknown,
			wantConf:   0.5,
		},
		{
			name:    "invalid JSON",
			input:   "not json at all",
			wantErr: true,
		},
		{
			name:    "empty input",
			input:   "",
			wantErr: true,
		},
		{
			name:       "confidence clamped to max 1.0",
			input:      `{"intent": "greeting", "confidence": 1.5, "reasoning": "over"}`,
			wantIntent: IntentGreeting,
			wantConf:   1.0,
		},
		{
			name:       "confidence clamped to min 0.0",
			input:      `{"intent": "greeting", "confidence": -0.5, "reasoning": "negative"}`,
			wantIntent: IntentGreeting,
			wantConf:   0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseClassificationResponse(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("parseClassificationResponse() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil {
				return
			}
			if result.Intent != tt.wantIntent {
				t.Errorf("parseClassificationResponse() intent = %v, want %v", result.Intent, tt.wantIntent)
			}
			if result.Confidence != tt.wantConf {
				t.Errorf("parseClassificationResponse() confidence = %v, want %v", result.Confidence, tt.wantConf)
			}
		})
	}
}

func TestClassifyStringToIntent(t *testing.T) {
	tests := []struct {
		input string
		want  Intent
	}{
		{"greeting", IntentGreeting},
		{"Greeting", IntentGreeting},
		{"greet", IntentGreeting},
		{"hello", IntentGreeting},
		{"smalltalk", IntentGreeting},
		{"info", IntentInfo},
		{"information", IntentInfo},
		{"explain", IntentInfo},
		{"howto", IntentInfo},
		{"tool_call", IntentToolCall},
		{"tool", IntentToolCall},
		{"action", IntentToolCall},
		{"execute", IntentToolCall},
		{"search", IntentToolCall},
		{"create", IntentToolCall},
		{"summary", IntentSummary},
		{"summarize", IntentSummary},
		{"resumen", IntentSummary},
		{"complex", IntentComplex},
		{"analysis", IntentComplex},
		{"compare", IntentComplex},
		{"escalate", IntentEscalate},
		{"human", IntentEscalate},
		{"frustrated", IntentEscalate},
		{"unknown_string", IntentUnknown},
		{"", IntentUnknown},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := classifyStringToIntent(tt.input)
			if got != tt.want {
				t.Errorf("classifyStringToIntent(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

func TestIntentRouter(t *testing.T) {
	cfg := DefaultRouterConfig()
	router := NewIntentRouter(cfg)

	t.Run("routes tool_call to tool-model", func(t *testing.T) {
		intent := &IntentResult{Intent: IntentToolCall, Confidence: 0.9}
		model := router.Route(intent)
		if model == nil {
			t.Fatal("Route() returned nil for tool_call")
		}
		if model.Name != "tool-model" {
			t.Errorf("Route() model name = %q, want %q", model.Name, "tool-model")
		}
	})

	t.Run("routes summary to summarizer-model", func(t *testing.T) {
		intent := &IntentResult{Intent: IntentSummary, Confidence: 0.9}
		model := router.Route(intent)
		if model == nil {
			t.Fatal("Route() returned nil for summary")
		}
		if model.Name != "summarizer-model" {
			t.Errorf("Route() model name = %q, want %q", model.Name, "summarizer-model")
		}
	})

	t.Run("routes complex to tool-model (expanded context)", func(t *testing.T) {
		intent := &IntentResult{Intent: IntentComplex, Confidence: 0.9}
		model := router.Route(intent)
		if model == nil {
			t.Fatal("Route() returned nil for complex")
		}
		if model.Name != "tool-model" {
			t.Errorf("Route() model name = %q, want %q", model.Name, "tool-model")
		}
	})

	t.Run("routes unknown intent to fallback", func(t *testing.T) {
		intent := &IntentResult{Intent: IntentUnknown, Confidence: 0.3}
		model := router.Route(intent)
		if model == nil {
			t.Fatal("Route() returned nil for unknown intent")
		}
		if model.Name != "primary-model" {
			t.Errorf("Route() model name = %q, want %q", model.Name, "primary-model")
		}
	})

	t.Run("routes nil intent to fallback", func(t *testing.T) {
		model := router.Route(nil)
		if model == nil {
			t.Fatal("Route() returned nil for nil intent")
		}
		if model.Name != "primary-model" {
			t.Errorf("Route() model name = %q, want %q", model.Name, "primary-model")
		}
	})

	t.Run("GetModelConfig finds by name", func(t *testing.T) {
		model := router.GetModelConfig("tool-model")
		if model == nil {
			t.Fatal("GetModelConfig() returned nil for tool-model")
		}
		if model.Endpoint != "http://n100:8080/v1" {
			t.Errorf("GetModelConfig() endpoint = %q, want %q", model.Endpoint, "http://n100:8080/v1")
		}
	})

	t.Run("SupportedIntents returns configured intents", func(t *testing.T) {
		intents := router.SupportedIntents()
		if len(intents) < 3 {
			t.Errorf("SupportedIntents() returned %d intents, want >= 3", len(intents))
		}
	})

	t.Run("AddRoute adds new route", func(t *testing.T) {
		router.AddRoute(IntentEscalate, &ModelConfig{
			Name:     "escalation-handler",
			Endpoint: "http://localhost:9090/v1",
		})
		intent := &IntentResult{Intent: IntentEscalate, Confidence: 0.95}
		model := router.Route(intent)
		if model == nil || model.Name != "escalation-handler" {
			t.Errorf("After AddRoute, Route(escalate) = %v, want escalation-handler", model)
		}
	})
}

func TestGenerateGreetingResponse(t *testing.T) {
	tests := []struct {
		input   string
		wantSub string // substring expected in response
	}{
		{"Hola", "OdooClaw"},
		{"hello", "OdooClaw"},
		{"Hi there", "OdooClaw"},
		{"Gracias", "ayudarte"},
		{"Adiós", "Hasta luego"},
		{"Qué tal", "OdooClaw"}, // default
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			resp := generateGreetingResponse(tt.input)
			if resp == "" {
				t.Errorf("generateGreetingResponse(%q) returned empty", tt.input)
			}
			if tt.wantSub != "" && !contains(resp, tt.wantSub) {
				t.Errorf("generateGreetingResponse(%q) = %q, want to contain %q", tt.input, resp, tt.wantSub)
			}
		})
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsSubstring(s, substr))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestBuildClassificationMessages(t *testing.T) {
	t.Run("basic message without history", func(t *testing.T) {
		req := ClassificationRequest{
			Message: "Hola, ¿qué tal?",
		}
		msgs := buildClassificationMessages(req)
		if len(msgs) != 2 {
			t.Fatalf("Expected 2 messages (system + user), got %d", len(msgs))
		}
		if msgs[0].Role != "system" {
			t.Errorf("First message role = %q, want %q", msgs[0].Role, "system")
		}
		if msgs[1].Role != "user" {
			t.Errorf("Second message role = %q, want %q", msgs[1].Role, "user")
		}
	})

	t.Run("message with history", func(t *testing.T) {
		req := ClassificationRequest{
			Message: "Cuántos clientes hay?",
			History: []Message{
				{Role: "user", Content: "Hola"},
				{Role: "assistant", Content: "¡Hola! ¿En qué puedo ayudarte?"},
			},
		}
		msgs := buildClassificationMessages(req)
		if len(msgs) != 2 {
			t.Fatalf("Expected 2 messages, got %d", len(msgs))
		}
		// The user message should contain history context
		userMsg := msgs[1].Content
		if !containsSubstring(userMsg, "Hola") {
			t.Error("User message should contain history")
		}
	})

	t.Run("message with tools", func(t *testing.T) {
		req := ClassificationRequest{
			Message:       "Busca clientes",
			AvailableTools: []string{"odoo_search", "odoo_create"},
		}
		msgs := buildClassificationMessages(req)
		if len(msgs) != 2 {
			t.Fatalf("Expected 2 messages, got %d", len(msgs))
		}
		userMsg := msgs[1].Content
		if !containsSubstring(userMsg, "odoo_search") {
			t.Error("User message should contain tool names")
		}
	})
}
