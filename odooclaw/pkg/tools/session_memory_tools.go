package tools

import (
	"context"
	"fmt"

	corememory "github.com/nicolasramos/odooclaw/pkg/memory"
)

// sessionMemoryToolBase wires the NRA-511 structured session memory store
// with the tool layer. Session key = channel:chatID.
type sessionMemoryToolBase struct {
	store   *corememory.SessionMemoryStore
	channel string
	chatID  string
}

func (b *sessionMemoryToolBase) sessionKey() string {
	if b.chatID == "" {
		return "default"
	}
	return b.channel + ":" + b.chatID
}

func (b *sessionMemoryToolBase) SetMessageContext(channel, chatID, senderID string, metadata map[string]string) {
	b.channel = channel
	b.chatID = chatID
}

// MemorySetSessionStateTool updates the structured per-session state:
// current company, partner, module or document. This is the NRA-511
// "memoria estructurada" — the model records business context instead of
// relying on raw history.
type MemorySetSessionStateTool struct {
	sessionMemoryToolBase
}

func NewMemorySetSessionStateTool(store *corememory.SessionMemoryStore) *MemorySetSessionStateTool {
	return &MemorySetSessionStateTool{sessionMemoryToolBase: sessionMemoryToolBase{store: store}}
}

func (t *MemorySetSessionStateTool) Name() string {
	return "memory_set_session_state"
}

func (t *MemorySetSessionStateTool) Description() string {
	return "Update the structured session memory (current company, partner, module or document being worked on). Use after identifying the active record, so the next turns keep context without full history."
}

func (t *MemorySetSessionStateTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"field": map[string]any{
				"type":        "string",
				"enum":        []string{"current_company", "current_partner", "current_module", "current_document"},
				"description": "Which session field to update.",
			},
			"value": map[string]any{
				"type":        "object",
				"description": "Field value: {value: <int|string>} for company/partner/module, or {model, res_id, action} for document.",
			},
		},
		"required": []string{"field", "value"},
	}
}

func (t *MemorySetSessionStateTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	_ = ctx
	if t.store == nil {
		return ErrorResult("session memory not available")
	}
	field, _ := args["field"].(string)
	value, _ := args["value"].(map[string]any)
	if field == "" || value == nil {
		return ErrorResult("field and value are required")
	}

	var val any
	switch field {
	case "current_company", "current_partner":
		if n, ok := value["value"].(float64); ok {
			val = n
		} else if n, ok := value["id"].(float64); ok {
			val = n
		} else {
			return ErrorResult(fmt.Sprintf("field %s expects a numeric value", field))
		}
	case "current_module":
		if s, ok := value["value"].(string); ok {
			val = s
		} else {
			return ErrorResult("field current_module expects a string value")
		}
	case "current_document":
		model, _ := value["model"].(string)
		resID, _ := value["res_id"].(float64)
		action, _ := value["action"].(string)
		if model == "" {
			return ErrorResult("current_document requires 'model'")
		}
		val = map[string]any{"model": model, "res_id": resID, "action": action}
	default:
		return ErrorResult(fmt.Sprintf("unknown field: %s", field))
	}

	if err := t.store.UpdateField(t.sessionKey(), field, val); err != nil {
		return ErrorResult(err.Error())
	}
	summary := t.store.GetSessionSummary(t.sessionKey())
	return NewToolResult(fmt.Sprintf("Session state updated. %s", summary))
}

// MemorySetPendingTool records an action awaiting explicit user confirmation.
type MemorySetPendingTool struct {
	sessionMemoryToolBase
}

func NewMemorySetPendingTool(store *corememory.SessionMemoryStore) *MemorySetPendingTool {
	return &MemorySetPendingTool{sessionMemoryToolBase: sessionMemoryToolBase{store: store}}
}

func (t *MemorySetPendingTool) Name() string {
	return "memory_set_pending_confirmation"
}

func (t *MemorySetPendingTool) Description() string {
	return "Record a tool call that is waiting for explicit user confirmation (destructive or critical actions). The pending action is remembered across turns."
}

func (t *MemorySetPendingTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"tool": map[string]any{
				"type":        "string",
				"description": "Tool name awaiting confirmation, e.g. odoo_unlink.",
			},
			"args": map[string]any{
				"type":        "object",
				"description": "Arguments to execute upon confirmation.",
			},
			"reason": map[string]any{
				"type":        "string",
				"description": "Why confirmation is needed.",
			},
		},
		"required": []string{"tool", "reason"},
	}
}

func (t *MemorySetPendingTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	_ = ctx
	if t.store == nil {
		return ErrorResult("session memory not available")
	}
	toolName, _ := args["tool"].(string)
	reason, _ := args["reason"].(string)
	if toolName == "" || reason == "" {
		return ErrorResult("tool and reason are required")
	}
	rawArgs, _ := args["args"].(map[string]any)
	val := map[string]any{"tool": toolName, "args": rawArgs, "reason": reason}
	if err := t.store.UpdateField(t.sessionKey(), "pending_confirmation", val); err != nil {
		return ErrorResult(err.Error())
	}
	return NewToolResult(fmt.Sprintf("Pending confirmation recorded: %s (%s)", toolName, reason))
}

// MemoryClearPendingTool clears the pending confirmation queue.
type MemoryClearPendingTool struct {
	sessionMemoryToolBase
}

func NewMemoryClearPendingTool(store *corememory.SessionMemoryStore) *MemoryClearPendingTool {
	return &MemoryClearPendingTool{sessionMemoryToolBase: sessionMemoryToolBase{store: store}}
}

func (t *MemoryClearPendingTool) Name() string {
	return "memory_clear_pending"
}

func (t *MemoryClearPendingTool) Description() string {
	return "Clear all pending confirmations for the current session (call after the user confirmed or rejected)."
}

func (t *MemoryClearPendingTool) Parameters() map[string]any {
	return map[string]any{"type": "object", "properties": map[string]any{}}
}

func (t *MemoryClearPendingTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	_ = ctx
	_ = args
	if t.store == nil {
		return ErrorResult("session memory not available")
	}
	if err := t.store.ClearPendingConfirmations(t.sessionKey()); err != nil {
		return ErrorResult(err.Error())
	}
	return NewToolResult("Pending confirmations cleared.")
}
