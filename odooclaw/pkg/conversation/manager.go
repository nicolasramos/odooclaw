package conversation

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/logger"
	"github.com/nicolasramos/odooclaw/pkg/providers"
	"github.com/nicolasramos/odooclaw/pkg/session"
	"github.com/nicolasramos/odooclaw/pkg/tools"
)

// ManagerConfig holds configuration for the Conversation Manager.
type ManagerConfig struct {
	// LLM settings
	Provider    providers.LLMProvider
	Model       string
	MaxTokens   int
	Temperature float64

	// Tool settings
	ToolRegistry *tools.ToolRegistry

	// Intent classification
	IntentClassifier *IntentClassifier

	// Pipeline customization
	Stages []string // Empty = default stages
}

// Manager manages conversation state, integrates memory, and connects
// all components in a pipeline end-to-end.
//
// Architecture:
//
//	User → Conversation Manager → Intent Classifier → Tool Retrieval
//	       → Qwen 1.5B (llama.cpp N100) → MCP Odoo → Response → User
type Manager struct {
	config    ManagerConfig
	sessions  map[string]*sessionState
	mu        sync.RWMutex
	pipeline  *Pipeline
}

type sessionState struct {
	state     State
	session   *session.Session
	lastError error
	createdAt time.Time
}

// NewManager creates a new Conversation Manager.
func NewManager(config ManagerConfig) *Manager {
	m := &Manager{
		config:   config,
		sessions: make(map[string]*sessionState),
	}

	// Build default pipeline
	m.pipeline = m.buildPipeline()

	return m
}

// Process processes a user message through the full pipeline.
// This is the main entry point for the conversation manager.
func (m *Manager) Process(
	ctx context.Context,
	sessionKey string,
	userMessage string,
	channel string,
	chatID string,
	senderID string,
	metadata map[string]string,
) (string, error) {
	// 1. Get or create session state
	ss := m.getOrCreateSession(sessionKey)

	// 2. Check state machine — can we accept new input?
	if !ss.state.CanTransitionTo(StateProcessing) {
		return "", fmt.Errorf("conversation in state %s, cannot process new message", ss.state)
	}

	// 3. Transition to processing
	m.transition(sessionKey, StateProcessing)

	// 4. Build pipeline context
	pctx := &PipelineContext{
		UserMessage: userMessage,
		SessionKey:  sessionKey,
		Channel:     channel,
		ChatID:      chatID,
		SenderID:    senderID,
		Metadata:    metadata,
		SessionMgr:  session.NewSessionManager(""), // Ephemeral for pipeline
		StartTime:   time.Now(),
	}

	// Load history from persistent session
	if ss.session != nil {
		pctx.History = ss.session.Messages
		pctx.Summary = ss.session.Summary
	}

	// 5. Execute pipeline
	err := m.pipeline.Execute(ctx, pctx)
	if err != nil {
		m.transition(sessionKey, StateError)
		ss.lastError = err
		return "", err
	}

	// 6. Check if response requires tool execution
	if pctx.LLMResponse != nil && len(pctx.LLMResponse.ToolCalls) > 0 {
		m.transition(sessionKey, StateWaitingTool)
		// Tool execution happens in the agent loop (existing code)
		// The pipeline prepares the context, the agent loop handles tool calls
	}

	// 7. Save session state
	m.saveSessionState(sessionKey, pctx)

	// 8. Transition back to idle
	m.transition(sessionKey, StateIdle)

	return pctx.Response, nil
}

// GetState returns the current state of a conversation session.
func (m *Manager) GetState(sessionKey string) State {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if ss, ok := m.sessions[sessionKey]; ok {
		return ss.state
	}
	return StateIdle
}

// SetState manually sets the state of a conversation session.
// Use with caution — this bypasses the state machine's transition rules.
func (m *Manager) SetState(sessionKey string, state State) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	ss, ok := m.sessions[sessionKey]
	if !ok {
		ss = &sessionState{
			state:     StateIdle,
			createdAt: time.Now(),
		}
		m.sessions[sessionKey] = ss
	}

	if !ss.state.CanTransitionTo(state) {
		return fmt.Errorf("cannot transition from %s to %s", ss.state, state)
	}

	ss.state = state
	return nil
}

// GetSession returns the session data for a given key.
func (m *Manager) GetSession(sessionKey string) *session.Session {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if ss, ok := m.sessions[sessionKey]; ok && ss.session != nil {
		return ss.session
	}
	return nil
}

// ListSessions returns all active session keys and their states.
func (m *Manager) ListSessions() map[string]State {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[string]State, len(m.sessions))
	for key, ss := range m.sessions {
		result[key] = ss.state
	}
	return result
}

// GetPipeline returns the pipeline for external inspection/testing.
func (m *Manager) GetPipeline() *Pipeline {
	return m.pipeline
}

// --- Internal helpers ---

func (m *Manager) getOrCreateSession(sessionKey string) *sessionState {
	m.mu.Lock()
	defer m.mu.Unlock()

	if ss, ok := m.sessions[sessionKey]; ok {
		return ss
	}

	ss := &sessionState{
		state:     StateIdle,
		createdAt: time.Now(),
	}
	m.sessions[sessionKey] = ss
	return ss
}

func (m *Manager) transition(sessionKey string, newState State) {
	m.mu.Lock()
	defer m.mu.Unlock()

	ss, ok := m.sessions[sessionKey]
	if !ok {
		return
	}

	if !ss.state.CanTransitionTo(newState) {
		logger.WarnCF("conversation", "Invalid state transition",
			map[string]any{
				"session":   sessionKey,
				"from":      ss.state.String(),
				"to":        newState.String(),
			})
		return
	}

	oldState := ss.state
	ss.state = newState

	logger.DebugCF("conversation", "State transition",
		map[string]any{
			"session": sessionKey,
			"from":    oldState.String(),
			"to":      newState.String(),
		})
}

func (m *Manager) saveSessionState(sessionKey string, pctx *PipelineContext) {
	m.mu.Lock()
	defer m.mu.Unlock()

	ss, ok := m.sessions[sessionKey]
	if !ok {
		return
	}

	// Create or update session
	if ss.session == nil {
		ss.session = &session.Session{
			Key:      sessionKey,
			Messages: []providers.Message{},
			Created:  time.Now(),
		}
	}

	// Add messages
	ss.session.Messages = append(ss.session.Messages,
		providers.Message{Role: "user", Content: pctx.UserMessage},
	)
	if pctx.Response != "" {
		ss.session.Messages = append(ss.session.Messages,
			providers.Message{Role: "assistant", Content: pctx.Response},
		)
	}
	ss.session.Updated = time.Now()
}

// buildPipeline creates the default pipeline with all standard stages.
func (m *Manager) buildPipeline() *Pipeline {
	p := NewPipeline(m.config.ToolRegistry)

	// Stage 1: Enrich context (load history)
	p.AddStage("enrich_context", StageEnrichContext())

	// Stage 2: Classify intent
	p.AddStage("classify_intent", StageClassifyIntent(m.config.IntentClassifier))

	// Stage 3: Filter tools via retrieval engine
	p.AddStage("filter_tools", StageFilterTools(m.config.ToolRegistry))

	// Stage 4: Optimize context (NRA-256 stub)
	p.AddStage("optimize_context", StageOptimizeContext())

	// Stage 5: LLM inference
	p.AddStage("infer", StageInfer(
		m.config.Provider,
		m.config.Model,
		m.config.MaxTokens,
		m.config.Temperature,
		nil, // toolDefsForLLM — handled by agent loop for now
	))

	// Stage 6: Post-execute (save session)
	p.AddStage("post_execute", StagePostExecute())

	return p
}
