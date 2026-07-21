package multimodel

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/providers"
	"github.com/nicolasramos/odooclaw/pkg/providers/openai_compat"
)

// Pipeline orchestrates the multi-model architecture.
//
// For each user message, the pipeline:
// 1. Classifies the intent using a lightweight model
// 2. Routes to the appropriate model based on intent
// 3. For simple intents (greeting/info), generates a direct response
// 4. For tool_call/summary/complex, delegates to the specialized model
// 5. Returns the result with metadata about which model was used
//
// The pipeline is designed to be inserted BEFORE the main AgentLoop LLM call.
// When the pipeline can handle a request entirely (e.g., greeting, simple info),
// it returns a response that bypasses the main model entirely, saving tokens.
//
// When the pipeline determines a specialized model should be used, it returns
// the model config so the caller can use it instead of the default model.
type Pipeline struct {
	classifier IntentClassifier
	router     ModelRouter
	primary    providers.LLMProvider // Existing primary LLM provider (cloud)

	// Metrics
	metrics      PipelineMetrics
	metricsMu    sync.RWMutex
	classifyCount atomic.Int64
	classifyErr   atomic.Int64
	tokensSaved   atomic.Int64

	// Callback for metrics reporting
	onMetrics func(PipelineMetrics)
}

// PipelineConfig configures the multi-model pipeline.
type PipelineConfig struct {
	Classifier ClassifierConfig `json:"classifier"`
	Router     RouterConfig     `json:"router"`
	Enabled    bool             `json:"enabled"`
}

// NewPipeline creates a new multi-model pipeline.
//
// Parameters:
//   - cfg: Pipeline configuration (classifier endpoint, routes, etc.)
//   - primary: The existing primary LLM provider (used for fallback and greeting responses)
func NewPipeline(cfg PipelineConfig, primary providers.LLMProvider) *Pipeline {
	classifier := NewLLMClassifier(cfg.Classifier)
	router := NewIntentRouter(cfg.Router)

	return &Pipeline{
		classifier: classifier,
		router:     router,
		primary:    primary,
	}
}

// ProcessRequest processes a user message through the multi-model pipeline.
//
// Returns:
//   - If the pipeline can handle the request directly (greeting, info): returns the response
//   - If a specialized model should be used: returns the model config and empty response
//   - If the primary model should be used: returns nil config and empty response
func (p *Pipeline) ProcessRequest(ctx context.Context, req PipelineRequest) (*PipelineResult, error) {
	start := time.Now()

	// Step 1: Classify intent
	classifyReq := ClassificationRequest{
		Message:        req.Message,
		History:        req.History,
		AvailableTools: req.AvailableTools,
		ModuleHints:    req.ModuleHints,
	}

	intentResult, err := p.classifier.Classify(ctx, classifyReq)
	if err != nil {
		// Classification failed — log and fall through to primary model
		p.classifyErr.Add(1)
		log.Printf("multimodel: classification failed, falling back to primary: %v", err)
		return &PipelineResult{
			Intent:      &IntentResult{Intent: IntentUnknown, Confidence: 0},
			ModelUsed:   "primary-model",
			Latency:     time.Since(start),
			SkippedMain: false,
		}, nil
	}
	p.classifyCount.Add(1)

	log.Printf("multimodel: classified intent=%s confidence=%.2f latency=%v",
		intentResult.Intent, intentResult.Confidence, intentResult.Latency)

	// Step 2: Route to appropriate model
	modelCfg := p.router.Route(intentResult)
	if modelCfg != nil {
		intentResult.Model = modelCfg.Name
	}

	// Step 3: Handle based on intent
	switch intentResult.Intent {
	case IntentGreeting:
		return p.handleGreeting(ctx, req, intentResult, start)

	case IntentInfo:
		// Info requests can often be answered without tool calls
		// Use primary model but with reduced context
		return &PipelineResult{
			Intent:      intentResult,
			ModelUsed:   "primary-model",
			Latency:     time.Since(start),
			SkippedMain: false, // Still uses main model, but with less context
		}, nil

	case IntentToolCall:
		return p.handleToolCall(ctx, req, intentResult, modelCfg, start)

	case IntentSummary:
		return p.handleSummary(ctx, req, intentResult, modelCfg, start)

	case IntentComplex:
		return p.handleComplex(ctx, req, intentResult, modelCfg, start)

	case IntentEscalate:
		return p.handleEscalation(ctx, req, intentResult, start)

	default:
		// Unknown intent — fall through to primary model
		return &PipelineResult{
			Intent:      intentResult,
			ModelUsed:   "primary-model",
			Latency:     time.Since(start),
			SkippedMain: false,
		}, nil
	}
}

// handleGreeting generates a direct response for greetings without using any LLM.
func (p *Pipeline) handleGreeting(_ context.Context, req PipelineRequest, intent *IntentResult, start time.Time) (*PipelineResult, error) {
	// For greetings, we can generate a direct response without any LLM call
	greeting := generateGreetingResponse(req.Message)

	p.tokensSaved.Add(100) // Approximate tokens saved

	return &PipelineResult{
		Response:    greeting,
		Intent:      intent,
		ModelUsed:   "direct-response",
		Latency:     time.Since(start),
		TokensUsed:  0,
		SkippedMain: true,
	}, nil
}

// handleToolCall sets up the pipeline for tool calling with the specialized model.
func (p *Pipeline) handleToolCall(_ context.Context, _ PipelineRequest, intent *IntentResult, modelCfg *ModelConfig, start time.Time) (*PipelineResult, error) {
	if modelCfg == nil {
		// No specialized model configured — use primary
		return &PipelineResult{
			Intent:      intent,
			ModelUsed:   "primary-model",
			Latency:     time.Since(start),
			SkippedMain: false,
		}, nil
	}

	// For tool calls, we return the model config so the caller can use it
	// The actual tool execution happens in the AgentLoop
	return &PipelineResult{
		Intent:      intent,
		ModelUsed:   modelCfg.Name,
		Latency:     time.Since(start),
		SkippedMain: false, // Still needs LLM, just a different one
	}, nil
}

// handleSummary sets up the pipeline for summarization.
func (p *Pipeline) handleSummary(_ context.Context, _ PipelineRequest, intent *IntentResult, modelCfg *ModelConfig, start time.Time) (*PipelineResult, error) {
	if modelCfg == nil {
		return &PipelineResult{
			Intent:      intent,
			ModelUsed:   "primary-model",
			Latency:     time.Since(start),
			SkippedMain: false,
		}, nil
	}

	return &PipelineResult{
		Intent:      intent,
		ModelUsed:   modelCfg.Name,
		Latency:     time.Since(start),
		SkippedMain: false,
	}, nil
}

// handleComplex sets up the pipeline for complex queries.
func (p *Pipeline) handleComplex(_ context.Context, _ PipelineRequest, intent *IntentResult, modelCfg *ModelConfig, start time.Time) (*PipelineResult, error) {
	if modelCfg == nil {
		return &PipelineResult{
			Intent:      intent,
			ModelUsed:   "primary-model",
			Latency:     time.Since(start),
			SkippedMain: false,
		}, nil
	}

	return &PipelineResult{
		Intent:      intent,
		ModelUsed:   modelCfg.Name,
		Latency:     time.Since(start),
		SkippedMain: false,
	}, nil
}

// handleEscalation returns a direct escalation response.
func (p *Pipeline) handleEscalation(_ context.Context, _ PipelineRequest, intent *IntentResult, start time.Time) (*PipelineResult, error) {
	return &PipelineResult{
		Response:    "Voy a conectar con un representante de soporte. Un momento por favor.",
		Intent:      intent,
		ModelUsed:   "direct-response",
		Latency:     time.Since(start),
		TokensUsed:  0,
		SkippedMain: true,
	}, nil
}

// generateGreetingResponse returns a context-aware greeting response.
func generateGreetingResponse(message string) string {
	lower := strings.ToLower(strings.TrimSpace(message))

	switch {
	case strings.Contains(lower, "hola") || strings.Contains(lower, "hello") || strings.Contains(lower, "hi"):
		return "¡Hola! Soy OdooClaw, tu asistente de Odoo. ¿En qué puedo ayudarte?"
	case strings.Contains(lower, "gracias") || strings.Contains(lower, "thanks"):
		return "¡De nada! ¿Hay algo más en lo que pueda ayudarte?"
	case strings.Contains(lower, "adiós") || strings.Contains(lower, "bye"):
		return "¡Hasta luego! Que tengas un buen día."
	default:
		return "¡Hola! Soy OdooClaw, tu asistente de Odoo. ¿En qué puedo ayudarte?"
	}
}

// GetMetrics returns the current pipeline metrics.
func (p *Pipeline) GetMetrics() PipelineMetrics {
	p.metricsMu.RLock()
	defer p.metricsMu.RUnlock()

	return PipelineMetrics{
		ClassificationsTotal: p.classifyCount.Load(),
		ClassificationErrors: p.classifyErr.Load(),
		TokensSaved:          p.tokensSaved.Load(),
	}
}

// GetRouter returns the pipeline's intent router for inspection.
func (p *Pipeline) GetRouter() ModelRouter {
	return p.router
}

// GetClassifier returns the pipeline's intent classifier for inspection.
func (p *Pipeline) GetClassifier() IntentClassifier {
	return p.classifier
}

// Close releases resources held by the pipeline.
func (p *Pipeline) Close() error {
	if err := p.classifier.Close(); err != nil {
		return fmt.Errorf("failed to close classifier: %w", err)
	}
	return nil
}

// GetModelForIntent is a convenience method that returns the OpenAI-compatible
// provider for a given intent, or nil if the primary model should be used.
//
// This is used by the AgentLoop to select the right provider for each request.
func (p *Pipeline) GetModelForIntent(intent *IntentResult) *openai_compat.Provider {
	if intent == nil {
		return nil
	}

	modelCfg := p.router.Route(intent)
	if modelCfg == nil || modelCfg.Endpoint == "" {
		return nil // Use primary model
	}

	return openai_compat.NewProvider("local", modelCfg.Endpoint, "",
		openai_compat.WithRequestTimeout(modelCfg.Timeout))
}
