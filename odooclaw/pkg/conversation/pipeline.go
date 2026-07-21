package conversation

import (
	"context"
	"fmt"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/logger"
	"github.com/nicolasramos/odooclaw/pkg/providers"
	"github.com/nicolasramos/odooclaw/pkg/session"
	"github.com/nicolasramos/odooclaw/pkg/tools"
)

// PipelineContext carries data between pipeline stages.
// Each stage enriches or transforms the context as it passes through.
type PipelineContext struct {
	// Input
	UserMessage string
	SessionKey  string
	Channel     string
	ChatID      string
	SenderID    string
	Metadata    map[string]string

	// Intent classification result
	Intent *IntentResult

	// Session state
	History    []providers.Message
	Summary    string
	SessionMgr *session.SessionManager

	// Tool retrieval results (from Tool Retrieval Engine)
	FilteredTools    []string // Tool names after retrieval filtering
	ToolFilterActive bool     // Whether tool filtering was applied

	// LLM response
	LLMResponse *providers.LLMResponse

	// Final response
	Response string

	// Timing
	StartTime    time.Time
	StageTimings map[string]time.Duration

	// Error tracking
	Err error
}

// StageFunc is a function that processes a PipelineContext.
// Returns a new (possibly modified) context and an error.
type StageFunc func(ctx context.Context, pctx *PipelineContext) error

// Pipeline defines an ordered sequence of stages that process a user message
// through the conversation manager. Each stage is a pluggable function.
type Pipeline struct {
	stages   []namedStage
	toolReg  *tools.ToolRegistry
	fallback tools.Tool // All-tools fallback when retrieval is unavailable
}

type namedStage struct {
	name  string
	stage StageFunc
}

// NewPipeline creates a new pipeline with the standard stages.
// The tool registry is used for tool retrieval; pass nil to skip retrieval.
func NewPipeline(toolReg *tools.ToolRegistry) *Pipeline {
	p := &Pipeline{
		stages:  make([]namedStage, 0),
		toolReg: toolReg,
	}
	return p
}

// AddStage appends a named stage to the pipeline.
func (p *Pipeline) AddStage(name string, stage StageFunc) *Pipeline {
	p.stages = append(p.stages, namedStage{name: name, stage: stage})
	return p
}

// Execute runs the full pipeline for a user message.
func (p *Pipeline) Execute(ctx context.Context, pctx *PipelineContext) error {
	pctx.StageTimings = make(map[string]time.Duration)

	for _, ns := range p.stages {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		stageStart := time.Now()
		logger.DebugCF("conversation", "Pipeline stage start",
			map[string]any{
				"stage":      ns.name,
				"session":    pctx.SessionKey,
				"msg_length": len(pctx.UserMessage),
			})

		if err := ns.stage(ctx, pctx); err != nil {
			pctx.Err = err
			pctx.StageTimings[ns.name] = time.Since(stageStart)
			logger.ErrorCF("conversation", "Pipeline stage failed",
				map[string]any{
					"stage":   ns.name,
					"error":   err.Error(),
					"elapsed": time.Since(stageStart).String(),
				})
			return fmt.Errorf("pipeline stage %q failed: %w", ns.name, err)
		}

		pctx.StageTimings[ns.name] = time.Since(stageStart)
		logger.DebugCF("conversation", "Pipeline stage complete",
			map[string]any{
				"stage":   ns.name,
				"elapsed": time.Since(stageStart).String(),
			})
	}

	return nil
}

// --- Standard Pipeline Stages ---

// StageEnrichContext loads session history and summary into the pipeline context.
func StageEnrichContext() StageFunc {
	return func(ctx context.Context, pctx *PipelineContext) error {
		if pctx.SessionMgr == nil {
			return fmt.Errorf("session manager not set in pipeline context")
		}

		pctx.History = pctx.SessionMgr.GetHistory(pctx.SessionKey)
		pctx.Summary = pctx.SessionMgr.GetSummary(pctx.SessionKey)

		logger.DebugCF("conversation", "Context enriched",
			map[string]any{
				"session":       pctx.SessionKey,
				"history_msgs":  len(pctx.History),
				"has_summary":   pctx.Summary != "",
			})
		return nil
	}
}

// StageClassifyIntent determines what the user wants to do.
func StageClassifyIntent(classifier *IntentClassifier) StageFunc {
	return func(ctx context.Context, pctx *PipelineContext) error {
		if classifier == nil {
			// No classifier available — default to chat
			pctx.Intent = &IntentResult{
				Intent:     IntentChat,
				Confidence: 0.5,
			}
			return nil
		}

		pctx.Intent = classifier.Classify(ctx, pctx.UserMessage, pctx.History)

		logger.InfoCF("conversation", "Intent classified",
			map[string]any{
				"intent":     pctx.Intent.Intent.String(),
				"confidence": pctx.Intent.Confidence,
				"module":     pctx.Intent.Module,
			})
		return nil
	}
}

// ToolRetriever is the interface that the Tool Retrieval Engine (NRA-220)
// must implement to enable dynamic tool filtering.
type ToolRetriever interface {
	Retrieve(query string, module string, limit int) ([]string, error)
}

// StageFilterTools applies tool retrieval to reduce the tool set sent to the LLM.
// If the Tool Retrieval Engine (NRA-220) is not available, all tools are passed.
func StageFilterTools(toolReg *tools.ToolRegistry) StageFunc {
	return func(ctx context.Context, pctx *PipelineContext) error {
		if toolReg == nil {
			pctx.ToolFilterActive = false
			return nil
		}

		// Check if Tool Retrieval Engine is available via interface assertion
		if retriever, ok := interface{}(toolReg).(ToolRetriever); ok {
			tools, err := retriever.Retrieve(pctx.UserMessage, pctx.Intent.Module, 5)
			if err != nil {
				logger.WarnCF("conversation", "Tool retrieval failed, using all tools",
					map[string]any{"error": err.Error()})
				pctx.ToolFilterActive = false
				return nil
			}
			pctx.FilteredTools = tools
			pctx.ToolFilterActive = len(tools) > 0

			logger.InfoCF("conversation", "Tools filtered by retrieval",
				map[string]any{
					"count":     len(tools),
					"module":    pctx.Intent.Module,
					"retrieval": true,
				})
		} else {
			pctx.ToolFilterActive = false
			logger.DebugCF("conversation", "Tool Retrieval Engine not available, using all tools",
				map[string]any{})
		}

		return nil
	}
}

// StageOptimizeContext reduces context size before sending to the LLM.
// This is a stub for NRA-256 (Context Optimization) — when implemented,
// it will compress context to <1K tokens while preserving critical information.
func StageOptimizeContext() StageFunc {
	return func(ctx context.Context, pctx *PipelineContext) error {
		// TODO(NRA-256): Implement context optimization
		// For now, pass through with basic truncation
		if len(pctx.History) > 20 {
			pctx.History = pctx.History[len(pctx.History)-20:]
			logger.DebugCF("conversation", "Context truncated (optimization stub)",
				map[string]any{
					"remaining_msgs": len(pctx.History),
				})
		}
		return nil
	}
}

// StageInfer calls the LLM with the enriched context and available tools.
func StageInfer(
	provider providers.LLMProvider,
	model string,
	maxTokens int,
	temperature float64,
	toolDefsForLLM func(filteredTools []string, allTools *tools.ToolRegistry) []providers.ToolDefinition,
) StageFunc {
	return func(ctx context.Context, pctx *PipelineContext) error {
		if provider == nil {
			return fmt.Errorf("LLM provider not configured")
		}

		// Build messages
		messages := buildInferenceMessages(pctx)

		// Build tool definitions based on filtered tools
		var toolDefs []providers.ToolDefinition
		if toolDefsForLLM != nil && pctx.ToolFilterActive {
			toolDefs = toolDefsForLLM(pctx.FilteredTools, nil)
		} else if pctx.SessionMgr != nil {
			// When no filtering, use a closure that can access toolReg
			toolDefs = toolDefsForLLM(nil, nil)
		}

		inferStart := time.Now()

		response, err := provider.Chat(ctx, messages, toolDefs, model, map[string]any{
			"max_tokens":  maxTokens,
			"temperature": temperature,
		})
		if err != nil {
			return fmt.Errorf("LLM inference failed: %w", err)
		}

		pctx.LLMResponse = response
		pctx.Response = response.Content

		logger.InfoCF("conversation", "LLM inference complete",
			map[string]any{
				"model":          model,
				"response_len":   len(response.Content),
				"tool_calls":     len(response.ToolCalls),
				"elapsed":        time.Since(inferStart).String(),
				"inference_time": time.Since(inferStart).Milliseconds(),
			})
		return nil
	}
}

// StagePostExecute saves the conversation to session history.
func StagePostExecute() StageFunc {
	return func(ctx context.Context, pctx *PipelineContext) error {
		if pctx.SessionMgr == nil {
			return nil
		}

		// Save user message
		pctx.SessionMgr.AddMessage(pctx.SessionKey, "user", pctx.UserMessage)

		// Save assistant response
		if pctx.Response != "" {
			pctx.SessionMgr.AddMessage(pctx.SessionKey, "assistant", pctx.Response)
		}

		// Persist session
		if err := pctx.SessionMgr.Save(pctx.SessionKey); err != nil {
			logger.WarnCF("conversation", "Failed to save session",
				map[string]any{"error": err.Error()})
		}

		logger.DebugCF("conversation", "Post-execute complete",
			map[string]any{
				"session":      pctx.SessionKey,
				"response_len": len(pctx.Response),
			})
		return nil
	}
}

// buildInferenceMessages constructs the message array for LLM inference.
func buildInferenceMessages(pctx *PipelineContext) []providers.Message {
	messages := make([]providers.Message, 0)

	// System prompt (if summary exists, include it)
	if pctx.Summary != "" {
		messages = append(messages, providers.Message{
			Role:    "system",
			Content: fmt.Sprintf("Conversation context summary:\n%s", pctx.Summary),
		})
	}

	// History
	messages = append(messages, pctx.History...)

	// Current user message
	messages = append(messages, providers.Message{
		Role:    "user",
		Content: pctx.UserMessage,
	})

	return messages
}
