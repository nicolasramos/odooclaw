package tools

import (
	"context"
	"fmt"
	"strings"

	corememory "github.com/nicolasramos/odooclaw/pkg/memory"
)

type strategicMemoryRouter interface {
	Save(context.Context, corememory.RoutedMemoryInput) (corememory.RoutedMemoryResult, error)
}

type StrategicMemorySaveTool struct {
	router strategicMemoryRouter
}

func NewStrategicMemorySaveTool(router strategicMemoryRouter) *StrategicMemorySaveTool {
	return &StrategicMemorySaveTool{router: router}
}

func (t *StrategicMemorySaveTool) Name() string {
	return "memory_save_strategic"
}

func (t *StrategicMemorySaveTool) Description() string {
	return "Save high-value strategic memory such as decisions, bug fixes, conventions, discoveries, or stable preferences. Do not use for transient chat context or Odoo record state."
}

func (t *StrategicMemorySaveTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title": map[string]any{
				"type":        "string",
				"description": "Short searchable title for the strategic memory.",
			},
			"type": map[string]any{
				"type":        "string",
				"description": "Memory category: decision, architecture, bugfix, discovery, pattern, config, or preference.",
			},
			"content": map[string]any{
				"type":        "string",
				"description": "Structured memory content. Prefer **What**, **Why**, **Where**, and **Learned** sections.",
			},
			"project": map[string]any{
				"type":        "string",
				"description": "Optional Engram project name, for example odooclaw.",
			},
			"scope": map[string]any{
				"type":        "string",
				"description": "Optional memory scope, usually project.",
			},
			"topic_key": map[string]any{
				"type":        "string",
				"description": "Optional stable topic key for evolving memories.",
			},
		},
		"required": []string{"title", "type", "content"},
	}
}

func (t *StrategicMemorySaveTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	if t == nil || t.router == nil {
		return ErrorResult("strategic memory router is not configured")
	}

	title, errResult := parseRequiredStringArg(args, "title")
	if errResult != nil {
		return errResult
	}
	memoryType, errResult := parseRequiredStringArg(args, "type")
	if errResult != nil {
		return errResult
	}
	content, errResult := parseRequiredStringArg(args, "content")
	if errResult != nil {
		return errResult
	}

	if !isStrategicMemoryType(memoryType) {
		return ErrorResult(fmt.Sprintf("unsupported strategic memory type %q", memoryType))
	}

	result, err := t.router.Save(ctx, corememory.RoutedMemoryInput{
		Route:    corememory.MemoryRouteStrategic,
		Title:    title,
		Type:     strings.TrimSpace(memoryType),
		Content:  content,
		Project:  optionalStringArg(args, "project"),
		Scope:    optionalStringArg(args, "scope"),
		TopicKey: optionalStringArg(args, "topic_key"),
	})
	if err != nil {
		return ErrorResult(fmt.Sprintf("strategic memory save failed: %v", err)).WithError(err)
	}

	if !result.Saved {
		return SilentResult("Strategic memory was routed but not persisted because Engram is disabled.")
	}

	return SilentResult("Strategic memory saved.")
}

func optionalStringArg(args map[string]any, key string) string {
	if raw, ok := args[key].(string); ok {
		return strings.TrimSpace(raw)
	}
	return ""
}

func isStrategicMemoryType(memoryType string) bool {
	switch strings.TrimSpace(strings.ToLower(memoryType)) {
	case "decision", "architecture", "bugfix", "discovery", "pattern", "config", "preference":
		return true
	default:
		return false
	}
}
