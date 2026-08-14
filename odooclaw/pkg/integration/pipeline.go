// Package integration provides the end-to-end pipeline that connects all
// OdooClaw components: Conversation Manager, Multi-model Router, Tool
// Retrieval, Context Optimization, Knowledge Base, and LLM Inference.
//
// Pipeline flow:
//
//	User → IntentClassifier → ModelRouter → ToolRetrieval
//	    → ContextOptimization → LLM Inference → Response
package integration

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/knowledge"
	"github.com/nicolasramos/odooclaw/pkg/logger"
	"github.com/nicolasramos/odooclaw/pkg/multimodel"
	"github.com/nicolasramos/odooclaw/pkg/providers"
	"github.com/nicolasramos/odooclaw/pkg/tools"
)

// PipelineConfig configures the end-to-end integration pipeline.
type PipelineConfig struct {
	// ToolRetrieval
	RetrievalEnabled bool
	RetrievalLimit   int // Max tools to retrieve (default: 5)

	// Context Optimization
	OptimizeEnabled bool
	MaxTokenBudget  int // Max tokens for tool definitions (default: 1000)

	// Knowledge Base
	KnowledgeEnabled bool

	// Multi-model pipeline (optional)
	MultiModelEnabled bool

	// Logging
	LogTimings bool
}

// DefaultPipelineConfig returns a sensible default configuration.
func DefaultPipelineConfig() PipelineConfig {
	return PipelineConfig{
		RetrievalEnabled:  true,
		RetrievalLimit:    5,
		OptimizeEnabled:   true,
		MaxTokenBudget:    1000,
		KnowledgeEnabled:  true,
		MultiModelEnabled: false,
		LogTimings:        true,
	}
}

// PipelineRequest is the input to the integration pipeline.
type PipelineRequest struct {
	UserMessage string
	SessionKey  string
	Channel     string
	ChatID      string
	SenderID    string
	Metadata    map[string]string
	History     []providers.Message
}

// PipelineResult is the output from the integration pipeline.
type PipelineResult struct {
	Response       string
	ModelUsed      string
	ToolsUsed      []string
	ToolCount      int // Tools sent to LLM (after filtering)
	TotalTools     int // Total registered tools
	TokensSaved    int
	Intent         *multimodel.IntentResult
	Latency        time.Duration
	StageTimings   map[string]time.Duration
	FromCache      bool
}

// Pipeline connects all components in an end-to-end flow.
type Pipeline struct {
	cfg PipelineConfig

	// Components
	toolRegistry  *tools.ToolRegistry
	retrieval     *tools.RetrievalEngine
	knowledge     *knowledge.KnowledgeBase
	optimizer     *tools.ContextOptimizer
	multiModel    *multimodel.Pipeline
	provider      providers.LLMProvider
	model         string

	// Metrics
	metrics      PipelineMetrics
	metricsMu    sync.RWMutex
}

// PipelineMetrics tracks aggregate pipeline performance.
type PipelineMetrics struct {
	TotalRequests   int64
	AvgLatencyMs    float64
	ToolsFiltered   int64
	TokensSaved     int64
	MultiModelHits  int64
	FallbackCount   int64
}

// NewPipeline creates a new integration pipeline.
func NewPipeline(
	cfg PipelineConfig,
	toolRegistry *tools.ToolRegistry,
	provider providers.LLMProvider,
	model string,
) *Pipeline {
	p := &Pipeline{
		cfg:          cfg,
		toolRegistry: toolRegistry,
		provider:     provider,
		model:        model,
	}

	// Initialize tool retrieval
	if cfg.RetrievalEnabled && toolRegistry != nil {
		engine, err := tools.NewRetrievalEngine(tools.NewSynonymRewriter())
		if err != nil {
			logger.WarnCF("integration", "Failed to create retrieval engine", map[string]any{
				"error": err.Error(),
			})
		} else {
			p.retrieval = engine
			toolRegistry.SetRetrievalEngine(engine)

			// Index all tools
			if err := engine.IndexTools(toolRegistry); err != nil {
				logger.WarnCF("integration", "Failed to index tools", map[string]any{
					"error": err.Error(),
				})
			}
		}
	}

	// Initialize context optimizer
	if cfg.OptimizeEnabled {
		p.optimizer = tools.NewContextOptimizer()
		p.optimizer.MaxTokens = cfg.MaxTokenBudget
	}

	// Initialize knowledge base
	if cfg.KnowledgeEnabled {
		kb, err := knowledge.NewKnowledgeBase()
		if err != nil {
			logger.WarnCF("integration", "Failed to create knowledge base", map[string]any{
				"error": err.Error(),
			})
		} else {
			p.knowledge = kb
			// Load Odoo domain knowledge for better retrieval
			if err := kb.LoadOdooDomainKnowledge(); err != nil {
				logger.WarnCF("integration", "Failed to load domain knowledge", map[string]any{
					"error": err.Error(),
				})
			}
		}
	}

	return p
}

// SetMultiModelPipeline attaches the multi-model pipeline for intent-based routing.
func (p *Pipeline) SetMultiModelPipeline(mp *multimodel.Pipeline) {
	p.multiModel = mp
}

// ProcessRequest processes a user message through the full integration pipeline.
func (p *Pipeline) ProcessRequest(ctx context.Context, req PipelineRequest) (*PipelineResult, error) {
	start := time.Now()
	timings := make(map[string]time.Duration)

	result := &PipelineResult{
		StageTimings: timings,
	}

	// Count total tools
	if p.toolRegistry != nil {
		result.TotalTools = p.toolRegistry.Count()
	}

	// Stage 1: Multi-model pre-processing (intent classification + routing)
	var intentResult *multimodel.IntentResult
	if p.multiModel != nil && p.cfg.MultiModelEnabled {
		stageStart := time.Now()

		var mmHistory []multimodel.Message
		for _, msg := range req.History {
			if msg.Role == "user" || msg.Role == "assistant" {
				mmHistory = append(mmHistory, multimodel.Message{
					Role:    msg.Role,
					Content: msg.Content,
				})
			}
		}

		pipelineReq := multimodel.PipelineRequest{
			Message:    req.UserMessage,
			SessionKey: req.SessionKey,
			History:    mmHistory,
			Metadata:   req.Metadata,
		}

		pipelineResult, err := p.multiModel.ProcessRequest(ctx, pipelineReq)
		if err != nil {
			logger.WarnCF("integration", "Multi-model pipeline failed", map[string]any{
				"error": err.Error(),
			})
			p.metricsMu.Lock()
			p.metrics.FallbackCount++
			p.metricsMu.Unlock()
		} else if pipelineResult.SkippedMain && pipelineResult.Response != "" {
			// Pipeline handled the request directly (greeting, escalation)
			result.Response = pipelineResult.Response
			result.ModelUsed = pipelineResult.ModelUsed
			result.Intent = pipelineResult.Intent
			result.Latency = time.Since(start)
			result.StageTimings["multimodel"] = time.Since(stageStart)

			p.metricsMu.Lock()
			p.metrics.TotalRequests++
			p.metrics.MultiModelHits++
			p.metricsMu.Unlock()

			return result, nil
		} else if pipelineResult.Intent != nil {
			intentResult = pipelineResult.Intent
		}

		timings["multimodel"] = time.Since(stageStart)
	}

	// Stage 2: Tool retrieval
	var retrievedTools []string
	if p.retrieval != nil && p.cfg.RetrievalEnabled {
		stageStart := time.Now()

		module := ""
		if intentResult != nil {
			// Extract module from intent if available
			module = intentResult.Model // The multimodel pipeline sets the model name
		}

		retrievedTools = p.toolRegistry.RetrieveRelevant(req.UserMessage, module, p.cfg.RetrievalLimit)
		timings["retrieval"] = time.Since(stageStart)

		if len(retrievedTools) > 0 {
			logger.InfoCF("integration", "Tools retrieved", map[string]any{
				"count":  len(retrievedTools),
				"module": module,
			})
		}
	}

	// Stage 3: Knowledge base enrichment
	if p.knowledge != nil && p.cfg.KnowledgeEnabled {
		stageStart := time.Now()

		kbTools, err := p.knowledge.GetRelevantTools(req.UserMessage, 3)
		if err == nil && len(kbTools) > 0 {
			// Merge KB-relevant tools with retrieved tools
			seen := make(map[string]bool)
			for _, t := range retrievedTools {
				seen[t] = true
			}
			for _, t := range kbTools {
				if !seen[t] {
					retrievedTools = append(retrievedTools, t)
				}
			}
		}

		timings["knowledge"] = time.Since(stageStart)
	}

	// Stage 4: Build optimized tool definitions
	var toolDefs []providers.ToolDefinition
	if p.toolRegistry != nil {
		stageStart := time.Now()

		if p.cfg.OptimizeEnabled && p.optimizer != nil && len(retrievedTools) > 0 {
			// Use retrieval-filtered definitions
			allDefs := p.toolRegistry.ToProviderDefsWithRetrieval(req.UserMessage, "", p.cfg.RetrievalLimit)
			toolDefs = tools.OptimizeToolDefs(allDefs, nil, retrievedTools, p.cfg.MaxTokenBudget)
			result.ToolCount = len(toolDefs)
		} else {
			// Fall back to all tools
			toolDefs = p.toolRegistry.ToProviderDefs()
			result.ToolCount = len(toolDefs)
		}

		timings["optimize"] = time.Since(stageStart)
	}

	// Stage 5: LLM inference
	stageStart := time.Now()

	if p.provider == nil {
		return nil, fmt.Errorf("LLM provider not configured")
	}

	// Build messages
	messages := buildMessages(req)

	// Call LLM
	response, err := p.provider.Chat(ctx, messages, toolDefs, p.model, nil)
	if err != nil {
		return nil, fmt.Errorf("LLM inference failed: %w", err)
	}

	timings["inference"] = time.Since(stageStart)

	result.Response = response.Content
	result.ModelUsed = p.model
	result.ToolsUsed = retrievedTools
	result.Intent = intentResult
	result.Latency = time.Since(start)
	result.StageTimings = timings

	// Calculate tokens saved
	if result.TotalTools > 0 && result.ToolCount > 0 {
		// Rough estimate: each filtered tool saves ~200 tokens
		result.TokensSaved = (result.TotalTools - result.ToolCount) * 200
	}

	// Update metrics
	p.metricsMu.Lock()
	p.metrics.TotalRequests++
	p.metrics.ToolsFiltered += int64(result.TotalTools - result.ToolCount)
	p.metrics.TokensSaved += int64(result.TokensSaved)
	p.metricsMu.Unlock()

	// Log timings
	if p.cfg.LogTimings {
		logger.InfoCF("integration", "Pipeline complete", map[string]any{
			"latency_ms":    result.Latency.Milliseconds(),
			"tools_sent":    result.ToolCount,
			"tools_total":   result.TotalTools,
			"tokens_saved":  result.TokensSaved,
			"model":         result.ModelUsed,
			"intent":        intentStr(result.Intent),
		})
	}

	return result, nil
}

// GetMetrics returns current pipeline metrics.
func (p *Pipeline) GetMetrics() PipelineMetrics {
	p.metricsMu.RLock()
	defer p.metricsMu.RUnlock()
	return p.metrics
}

// Close releases resources held by the pipeline.
func (p *Pipeline) Close() error {
	var errs []error
	if p.retrieval != nil {
		if err := p.retrieval.Close(); err != nil {
			errs = append(errs, err)
		}
	}
	if p.knowledge != nil {
		if err := p.knowledge.Close(); err != nil {
			errs = append(errs, err)
		}
	}
	if len(errs) > 0 {
		return fmt.Errorf("errors closing pipeline: %v", errs)
	}
	return nil
}

// --- helpers ---

func buildMessages(req PipelineRequest) []providers.Message {
	messages := make([]providers.Message, 0, len(req.History)+1)
	messages = append(messages, req.History...)
	messages = append(messages, providers.Message{
		Role:    "user",
		Content: req.UserMessage,
	})
	return messages
}

func intentStr(intent *multimodel.IntentResult) string {
	if intent == nil {
		return "none"
	}
	return fmt.Sprintf("%s (%.2f)", intent.Intent, intent.Confidence)
}
