package tools

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/logger"
	"github.com/nicolasramos/odooclaw/pkg/providers"
)

type ToolRegistry struct {
	tools    map[string]Tool
	retrieval *RetrievalEngine
	mu       sync.RWMutex
}

func NewToolRegistry() *ToolRegistry {
	return &ToolRegistry{
		tools: make(map[string]Tool),
	}
}

func (r *ToolRegistry) Register(tool Tool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	name := tool.Name()
	if _, exists := r.tools[name]; exists {
		logger.WarnCF("tools", "Tool registration overwrites existing tool",
			map[string]any{"name": name})
	}
	r.tools[name] = tool
}

func (r *ToolRegistry) Get(name string) (Tool, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	tool, ok := r.tools[name]
	if ok {
		return tool, true
	}

	lookupKey := canonicalToolLookupKey(name)
	if lookupKey == "" {
		return nil, false
	}

	for registeredName, registeredTool := range r.tools {
		if canonicalToolLookupKey(registeredName) == lookupKey {
			return registeredTool, true
		}
	}

	return nil, false
}

func canonicalToolLookupKey(name string) string {
	var b strings.Builder
	b.Grow(len(name))
	for _, r := range strings.ToLower(name) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func (r *ToolRegistry) Execute(ctx context.Context, name string, args map[string]any) *ToolResult {
	return r.ExecuteWithContext(ctx, name, args, "", "", "", nil, nil)
}

// ExecuteWithContext executes a tool with channel/chatID context and optional async callback.
// If the tool implements AsyncTool and a non-nil callback is provided,
// the callback will be set on the tool before execution.
func (r *ToolRegistry) ExecuteWithContext(
	ctx context.Context,
	name string,
	args map[string]any,
	channel, chatID string,
	senderID string,
	metadata map[string]string,
	asyncCallback AsyncCallback,
) *ToolResult {
	logger.InfoCF("tool", "Tool execution started",
		map[string]any{
			"tool": name,
			"args": args,
		})

	tool, ok := r.Get(name)
	if !ok {
		logger.ErrorCF("tool", "Tool not found",
			map[string]any{
				"tool": name,
			})
		return ErrorResult(fmt.Sprintf("tool %q not found", name)).WithError(fmt.Errorf("tool not found"))
	}

	// If tool implements MessageContextualTool, provide full message context
	if msgCtxTool, ok := tool.(MessageContextualTool); ok && channel != "" && chatID != "" {
		msgCtxTool.SetMessageContext(channel, chatID, senderID, metadata)
	} else if contextualTool, ok := tool.(ContextualTool); ok && channel != "" && chatID != "" {
		// Backward-compatible context injection for tools that only need channel/chatID
		contextualTool.SetContext(channel, chatID)
	}

	// If tool implements AsyncTool and callback is provided, set callback
	if asyncTool, ok := tool.(AsyncTool); ok && asyncCallback != nil {
		asyncTool.SetCallback(asyncCallback)
		logger.DebugCF("tool", "Async callback injected",
			map[string]any{
				"tool": name,
			})
	}

	start := time.Now()
	result := tool.Execute(ctx, args)
	duration := time.Since(start)

	// Log based on result type
	if result.IsError {
		logger.ErrorCF("tool", "Tool execution failed",
			map[string]any{
				"tool":     name,
				"duration": duration.Milliseconds(),
				"error":    result.ForLLM,
			})
	} else if result.Async {
		logger.InfoCF("tool", "Tool started (async)",
			map[string]any{
				"tool":     name,
				"duration": duration.Milliseconds(),
			})
	} else {
		logger.InfoCF("tool", "Tool execution completed",
			map[string]any{
				"tool":          name,
				"duration_ms":   duration.Milliseconds(),
				"result_length": len(result.ForLLM),
			})
	}

	return result
}

// sortedToolNames returns tool names in sorted order for deterministic iteration.
// This is critical for KV cache stability: non-deterministic map iteration would
// produce different system prompts and tool definitions on each call, invalidating
// the LLM's prefix cache even when no tools have changed.
func (r *ToolRegistry) sortedToolNames() []string {
	names := make([]string, 0, len(r.tools))
	for name := range r.tools {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

func (r *ToolRegistry) GetDefinitions() []map[string]any {
	r.mu.RLock()
	defer r.mu.RUnlock()

	sorted := r.sortedToolNames()
	definitions := make([]map[string]any, 0, len(sorted))
	for _, name := range sorted {
		definitions = append(definitions, ToolToSchema(r.tools[name]))
	}
	return definitions
}

// ToProviderDefs converts tool definitions to provider-compatible format.
// This is the format expected by LLM provider APIs.
func (r *ToolRegistry) ToProviderDefs() []providers.ToolDefinition {
	r.mu.RLock()
	defer r.mu.RUnlock()

	sorted := r.sortedToolNames()
	definitions := make([]providers.ToolDefinition, 0, len(sorted))
	for _, name := range sorted {
		tool := r.tools[name]
		schema := ToolToSchema(tool)

		// Safely extract nested values with type checks
		fn, ok := schema["function"].(map[string]any)
		if !ok {
			continue
		}

		name, _ := fn["name"].(string)
		desc, _ := fn["description"].(string)
		params, _ := fn["parameters"].(map[string]any)

		definitions = append(definitions, providers.ToolDefinition{
			Type: "function",
			Function: providers.ToolFunctionDefinition{
				Name:        name,
				Description: desc,
				Parameters:  params,
			},
		})
	}
	return definitions
}

// List returns a list of all registered tool names.
func (r *ToolRegistry) List() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.sortedToolNames()
}

// Count returns the number of registered tools.
func (r *ToolRegistry) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.tools)
}

// GetSummaries returns human-readable summaries of all registered tools.
// Returns a slice of "name - description" strings.
func (r *ToolRegistry) GetSummaries() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	sorted := r.sortedToolNames()
	summaries := make([]string, 0, len(sorted))
	for _, name := range sorted {
		tool := r.tools[name]
		summaries = append(summaries, fmt.Sprintf("- `%s` - %s", tool.Name(), tool.Description()))
	}
	return summaries
}

// --- Tool Retrieval Integration ---

// SetRetrievalEngine attaches a RetrievalEngine for dynamic tool filtering.
func (r *ToolRegistry) SetRetrievalEngine(engine *RetrievalEngine) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.retrieval = engine
}

// GetRetrievalEngine returns the attached retrieval engine, if any.
func (r *ToolRegistry) GetRetrievalEngine() *RetrievalEngine {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.retrieval
}

// ClearDetrievalEngine detaches the retrieval engine.
func (r *ToolRegistry) ClearDetrievalEngine() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.retrieval = nil
}

// RetrieveRelevant returns the most relevant tool names for a query.
// Returns nil when no engine is attached.
func (r *ToolRegistry) RetrieveRelevant(query string, module string, limit int) []string {
	r.mu.RLock()
	engine := r.retrieval
	r.mu.RUnlock()

	if engine == nil {
		return nil
	}

	names, err := engine.Retrieve(query, module, limit)
	if err != nil {
		logger.WarnCF("tools", "Tool retrieval failed", map[string]any{
			"error": err.Error(),
		})
		return nil
	}
	return names
}

// ToProviderDefsWithRetrieval returns tool definitions filtered by retrieval.
// Always includes core tools (native, memory, system) with full schemas.
// Retrieved tools get compact schemas to reduce token count.
func (r *ToolRegistry) ToProviderDefsWithRetrieval(query string, module string, limit int) []providers.ToolDefinition {
	retrieved := r.RetrieveRelevant(query, module, limit)
	retrievedSet := make(map[string]bool, len(retrieved))
	for _, name := range retrieved {
		retrievedSet[name] = true
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	sorted := r.sortedToolNames()
	defs := make([]providers.ToolDefinition, 0, len(retrieved)+10)

	for _, name := range sorted {
		tool := r.tools[name]
		schema := ToolToSchema(tool)

		fn, ok := schema["function"].(map[string]any)
		if !ok {
			continue
		}
		tName, _ := fn["name"].(string)
		desc, _ := fn["description"].(string)
		params, _ := fn["parameters"].(map[string]any)

		// Core tools always included with full schema
		isCore := isCoreTool(name)
		if isCore || retrievedSet[name] {
			defs = append(defs, providers.ToolDefinition{
				Type: "function",
				Function: providers.ToolFunctionDefinition{
					Name:        tName,
					Description: desc,
					Parameters:  params,
				},
			})
		}
	}

	return defs
}

// isCoreTool determines if a tool is a "core" tool that should always be included.
func isCoreTool(name string) bool {
	corePrefixes := []string{
		"memory", "session", "web_search", "web_extract",
		"navigate", "read_note", "write_note", "search_notes",
		"skill_view", "skills_list", "skill_manage",
	}
	for _, prefix := range corePrefixes {
		if strings.HasPrefix(name, prefix) {
			return true
		}
	}
	return false
}
