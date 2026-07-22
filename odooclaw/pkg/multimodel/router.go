package multimodel

import (
	"fmt"
	"strings"
)

// IntentRouter implements ModelRouter by mapping intents to model configurations.
//
// The router maintains a mapping from Intent → ModelConfig. When a classified
// intent arrives, the router selects the appropriate model endpoint and
// parameters. It also provides fallback logic when the primary model for
// an intent is unavailable.
type IntentRouter struct {
	routes   map[Intent]*ModelConfig
	fallback *ModelConfig
}

// RouterConfig configures the intent router.
type RouterConfig struct {
	// Routes maps intent types to model configurations.
	Routes map[string]*ModelConfig `json:"routes"`

	// Fallback is the model to use when no route matches or the primary fails.
	Fallback *ModelConfig `json:"fallback"`
}

// NewIntentRouter creates a router from configuration.
func NewIntentRouter(cfg RouterConfig) *IntentRouter {
	r := &IntentRouter{
		routes:   make(map[Intent]*ModelConfig),
		fallback: cfg.Fallback,
	}

	for intentStr, modelCfg := range cfg.Routes {
		intent := classifyStringToIntent(intentStr)
		r.routes[intent] = modelCfg
	}

	return r
}

// Route selects the model configuration for a given intent.
func (r *IntentRouter) Route(intent *IntentResult) *ModelConfig {
	if intent == nil {
		return r.fallback
	}

	// Look up route for this intent
	if modelCfg, ok := r.routes[intent.Intent]; ok {
		return modelCfg
	}

	// If the intent is unknown and confidence is low, use fallback
	if intent.Intent == IntentUnknown || intent.Confidence < 0.5 {
		return r.fallback
	}

	// For known intents without a specific route, use the fallback
	return r.fallback
}

// GetModelConfig returns the configuration for a specific model name.
func (r *IntentRouter) GetModelConfig(name string) *ModelConfig {
	for _, cfg := range r.routes {
		if cfg.Name == name || strings.EqualFold(cfg.Name, name) {
			return cfg
		}
	}
	if r.fallback != nil && (r.fallback.Name == name || strings.EqualFold(r.fallback.Name, name)) {
		return r.fallback
	}
	return nil
}

// AddRoute adds or updates a route for a given intent.
func (r *IntentRouter) AddRoute(intent Intent, model *ModelConfig) {
	r.routes[intent] = model
}

// SetFallback sets the fallback model configuration.
func (r *IntentRouter) SetFallback(model *ModelConfig) {
	r.fallback = model
}

// SupportedIntents returns all intents that have routes configured.
func (r *IntentRouter) SupportedIntents() []Intent {
	intents := make([]Intent, 0, len(r.routes))
	for intent := range r.routes {
		intents = append(intents, intent)
	}
	return intents
}

// String returns a human-readable description of the routing table.
func (r *IntentRouter) String() string {
	var sb strings.Builder
	sb.WriteString("IntentRouter:\n")
	for intent, cfg := range r.routes {
		sb.WriteString(fmt.Sprintf("  %s → %s (%s)\n", intent, cfg.Name, cfg.Endpoint))
	}
	if r.fallback != nil {
		sb.WriteString(fmt.Sprintf("  fallback → %s (%s)\n", r.fallback.Name, r.fallback.Endpoint))
	}
	return sb.String()
}

// DefaultRouterConfig returns a sensible default routing configuration
// for the standard OdooClaw multi-model setup.
func DefaultRouterConfig() RouterConfig {
	return RouterConfig{
		Routes: map[string]*ModelConfig{
			"tool_call": {
				Name:        "tool-model",
				Endpoint:    "http://n100:8080/v1",
				ModelID:     "qwen2.5-1.5b-lora",
				MaxTokens:   2048,
				Temperature: 0.1,
			},
			"summary": {
				Name:        "summarizer-model",
				Endpoint:    "http://n100:8081/v1",
				ModelID:     "summarizer-300m",
				MaxTokens:   4096,
				Temperature: 0.3,
			},
			"complex": {
				Name:        "tool-model",
				Endpoint:    "http://n100:8080/v1",
				ModelID:     "qwen2.5-1.5b-lora",
				MaxTokens:   4096,
				Temperature: 0.2,
			},
		},
		Fallback: &ModelConfig{
			Name:        "primary-model",
			Endpoint:    "", // Uses existing LLM provider (cloud)
			ModelID:     "",
			MaxTokens:   4096,
			Temperature: 0.7,
		},
	}
}
