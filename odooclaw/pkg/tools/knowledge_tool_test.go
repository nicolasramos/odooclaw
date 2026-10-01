package tools

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeKnowledgeWriter struct {
	title    string
	content  string
	category string
	tags     []string
	err      error
}

func (f *fakeKnowledgeWriter) AddKnowledge(title, content, category string, tags []string) error {
	f.title, f.content, f.category, f.tags = title, content, category, tags
	return f.err
}

func TestKnowledgeAddTool_BasicSave(t *testing.T) {
	w := &fakeKnowledgeWriter{}
	tool := NewKnowledgeAddTool(w)

	res := tool.Execute(context.Background(), map[string]any{
		"title":    "VeriFactu steps",
		"content":  "Activate module, register cert, sync regime.",
		"category": "odoo_module",
		"tags":     []any{"verifactu", "account"},
	})
	require.NotNil(t, res)
	assert.False(t, res.IsError)
	assert.Equal(t, "VeriFactu steps", w.title)
	assert.Equal(t, "odoo_module", w.category)
	assert.Equal(t, []string{"verifactu", "account"}, w.tags)
}

func TestKnowledgeAddTool_DefaultsAndValidation(t *testing.T) {
	w := &fakeKnowledgeWriter{}
	tool := NewKnowledgeAddTool(w)

	// Missing content -> error result.
	res := tool.Execute(context.Background(), map[string]any{"title": "x"})
	require.NotNil(t, res)
	assert.True(t, res.IsError)

	// Unknown category falls back to workflow.
	res = tool.Execute(context.Background(), map[string]any{
		"title": "t", "content": "c", "category": "bogus",
	})
	require.NotNil(t, res)
	assert.False(t, res.IsError)
	assert.Equal(t, "workflow", w.category)
}

func TestKnowledgeAddTool_NilWriter(t *testing.T) {
	tool := NewKnowledgeAddTool(nil)
	res := tool.Execute(context.Background(), map[string]any{"title": "t", "content": "c"})
	require.NotNil(t, res)
	assert.True(t, res.IsError)
}

func TestKnowledgeAddTool_IsCoreTool(t *testing.T) {
	assert.True(t, isCoreTool("knowledge_add"), "knowledge_add must be a core tool (NRA-3845)")
}
