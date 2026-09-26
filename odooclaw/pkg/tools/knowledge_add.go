package tools

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// KnowledgeAddTool allows the model to add knowledge entries directly into the KB.
type KnowledgeAddTool struct {
	workspace string
}

// NewKnowledgeAddTool creates a tool for adding knowledge entries to the KB.
func NewKnowledgeAddTool(workspace string) *KnowledgeAddTool {
	return &KnowledgeAddTool{workspace: workspace}
}

func (t *KnowledgeAddTool) Name() string {
	return "knowledge_add"
}

func (t *KnowledgeAddTool) Description() string {
	return "Add a knowledge entry to the persistent knowledge base. Use this to save domain knowledge, tool usage patterns, or workflow information that the agent learns during operation. Entries persist across restarts in knowledge/kb.sqlite."
}

func (t *KnowledgeAddTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title": map[string]any{
				"type":        "string",
				"description": "Title of the knowledge entry",
			},
			"content": map[string]any{
				"type":        "string",
				"description": "The knowledge content",
			},
			"category": map[string]any{
				"type":        "string",
				"description": "Category: tool_usage, odoo_module, workflow",
				"enum":        []string{"tool_usage", "odoo_module", "workflow"},
			},
			"tags": map[string]any{
				"type":        "string",
				"description": "Comma-separated tags",
			},
			"aliases": map[string]any{
				"type":        "string",
				"description": "Comma-separated aliases for search",
			},
			"risk_level": map[string]any{
				"type":        "string",
				"description": "Risk level: low, medium, high, critical",
				"enum":        []string{"low", "medium", "high", "critical"},
			},
		},
		"required": []string{"title", "content"},
	}
}

func (t *KnowledgeAddTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	title, _ := args["title"].(string)
	content, _ := args["content"].(string)
	if title == "" || content == "" {
		return NewToolResult("Missing required fields: title and content").WithError(fmt.Errorf("missing title or content"))
	}

	category, _ := args["category"].(string)
	if category == "" {
		category = "tool_usage"
	}

	tagsStr, _ := args["tags"].(string)
	var tags []string
	if tagsStr != "" {
		tags = strings.Split(tagsStr, ",")
		for i := range tags {
			tags[i] = strings.TrimSpace(tags[i])
		}
	}

	aliasesStr, _ := args["aliases"].(string)
	var aliases []string
	if aliasesStr != "" {
		aliases = strings.Split(aliasesStr, ",")
		for i := range aliases {
			aliases[i] = strings.TrimSpace(aliases[i])
		}
	}

	riskLevel, _ := args["risk_level"].(string)
	if riskLevel == "" {
		riskLevel = "low"
	}

	// Write to knowledge/*.md file
	kbDir := filepath.Join(t.workspace, "knowledge")
	if err := os.MkdirAll(kbDir, 0o755); err != nil {
		return NewToolResult("Failed to create knowledge directory").WithError(err)
	}

	safeName := strings.ToLower(strings.ReplaceAll(title, " ", "-"))
	safeName = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return '-'
	}, safeName)
	safeName = strings.TrimSuffix(safeName, "-")
	filename := safeName + ".md"
	filepath := filepath.Join(kbDir, filename)

	var sb strings.Builder
	sb.WriteString("---\n")
	sb.WriteString(fmt.Sprintf("title: %s\n", title))
	sb.WriteString(fmt.Sprintf("category: %s\n", category))
	if len(tags) > 0 {
		sb.WriteString(fmt.Sprintf("tags: %s\n", strings.Join(tags, ",")))
	}
	if len(aliases) > 0 {
		sb.WriteString(fmt.Sprintf("aliases: %s\n", strings.Join(aliases, ",")))
	}
	if riskLevel != "low" {
		sb.WriteString(fmt.Sprintf("risk_level: %s\n", riskLevel))
	}
	sb.WriteString("---\n\n")
	sb.WriteString(content)

	if err := os.WriteFile(filepath, []byte(sb.String()), 0o644); err != nil {
		return NewToolResult("Failed to write knowledge file").WithError(err)
	}

	return NewToolResult(fmt.Sprintf("Knowledge entry added: %s", title))
}
