package tools

import (
	"context"
	"fmt"
	"strings"
)

// KnowledgeWriter is the minimal surface the knowledge_add tool needs from
// the knowledge base. Declared here (instead of importing pkg/knowledge)
// because pkg/knowledge already imports pkg/tools via its indexer; the
// concrete adapter lives in pkg/agent.
type KnowledgeWriter interface {
	AddKnowledge(title, content, category string, tags []string) error
}

// KnowledgeAddTool lets the model persist what it learns into the
// persistent knowledge base (NRA-3845). Registered as a core tool so
// retrieval never filters it out.
type KnowledgeAddTool struct {
	writer KnowledgeWriter
}

func NewKnowledgeAddTool(writer KnowledgeWriter) *KnowledgeAddTool {
	return &KnowledgeAddTool{writer: writer}
}

func (t *KnowledgeAddTool) Name() string { return "knowledge_add" }

func (t *KnowledgeAddTool) Description() string {
	return "Save a durable piece of domain knowledge (Odoo modules, workflows, tool usage, fixes) into the persistent knowledge base so it can be retrieved in future conversations. Use it when you learn something worth remembering beyond this session."
}

func (t *KnowledgeAddTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title": map[string]any{
				"type":        "string",
				"description": "Short searchable title, e.g. \"VeriFactu activation steps\".",
			},
			"content": map[string]any{
				"type":        "string",
				"description": "The knowledge itself: facts, steps, decisions. Self-contained.",
			},
			"category": map[string]any{
				"type":        "string",
				"description": "One of: tool_usage, odoo_module, workflow, api_pattern, example, risk. Default: workflow.",
			},
			"tags": map[string]any{
				"type":        "array",
				"items":       map[string]any{"type": "string"},
				"description": "Optional tags, e.g. [\"verifactu\", \"account\"]. For tool entries prefix the tool as \"tool:<name>\".",
			},
		},
		"required": []string{"title", "content"},
	}
}

var validKnowledgeCategories = map[string]bool{
	"tool_usage": true, "odoo_module": true, "workflow": true,
	"api_pattern": true, "alias": true, "dependency": true,
	"example": true, "risk": true,
}

func (t *KnowledgeAddTool) Execute(_ context.Context, args map[string]any) *ToolResult {
	if t.writer == nil {
		return ErrorResult("knowledge base is not available")
	}

	title, _ := args["title"].(string)
	content, _ := args["content"].(string)
	if strings.TrimSpace(title) == "" || strings.TrimSpace(content) == "" {
		return ErrorResult("knowledge_add requires non-empty title and content")
	}

	category := strings.TrimSpace(knowledgeStringArg(args["category"]))
	if category == "" {
		category = "workflow"
	}
	if !validKnowledgeCategories[category] {
		category = "workflow"
	}

	var tags []string
	switch v := args["tags"].(type) {
	case []string:
		tags = v
	case []any:
		for _, item := range v {
			if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
				tags = append(tags, strings.TrimSpace(s))
			}
		}
	}

	if err := t.writer.AddKnowledge(strings.TrimSpace(title), strings.TrimSpace(content), category, tags); err != nil {
		return ErrorResult(fmt.Sprintf("failed to save knowledge: %v", err))
	}

	return NewToolResult(fmt.Sprintf("Knowledge saved: %q (category: %s, tags: %s)", title, category, strings.Join(tags, ", ")))
}

func knowledgeStringArg(v any) string {
	s, _ := v.(string)
	return s
}
