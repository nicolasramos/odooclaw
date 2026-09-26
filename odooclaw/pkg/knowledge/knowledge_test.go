package knowledge

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestKnowledgeBase_AddAndSearch(t *testing.T) {
	tmpDir := t.TempDir()
	kb, err := NewKnowledgeBase(tmpDir)
	require.NoError(t, err)
	defer kb.Close()

	// Add entries
	err = kb.Add(KnowledgeEntry{
		Category:  CatToolUsage,
		Title:     "CRM Lead Search",
		Content:   "Use search_crm_leads to find CRM leads by name, email, or phone",
		Tags:      []string{"crm", "lead", "tool:search_crm_leads"},
		RiskLevel: RiskLow,
		Metadata:  map[string]string{"module": "crm"},
	})
	require.NoError(t, err)

	err = kb.Add(KnowledgeEntry{
		Category:  CatToolUsage,
		Title:     "Invoice Creation",
		Content:   "Use create_invoice to create accounting invoices for partners",
		Tags:      []string{"account", "invoice", "tool:create_invoice"},
		RiskLevel: RiskHigh,
		Metadata:  map[string]string{"module": "account"},
	})
	require.NoError(t, err)

	err = kb.Add(KnowledgeEntry{
		Category:  CatOdooModule,
		Title:     "VeriFactu Configuration",
		Content:   "Configure VeriFactu compliance settings for Spanish accounting",
		Tags:      []string{"compliance", "spain", "verifactu"},
		RiskLevel: RiskMedium,
		Metadata:  map[string]string{"module": "account"},
	})
	require.NoError(t, err)

	// Test search with natural language (terms that exist in content)
	results, err := kb.Search("configure VeriFactu", "", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, results)

	// Verify the VeriFactu entry is found
	found := false
	for _, r := range results {
		if r.Title == "VeriFactu Configuration" {
			found = true
			break
		}
	}
	assert.True(t, found, "VeriFactu entry should be found")

	// Test search with tool name
	results, err = kb.Search("search_crm_leads", "", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, results)

	// Test search on empty KB should return empty results
	results, err = kb.Search("anything", "", 10)
	require.NoError(t, err)
	assert.Empty(t, results)

	tools, err := kb.GetRelevantTools("anything", 10)
	require.NoError(t, err)
	assert.Empty(t, tools)
}

func TestKnowledgeBase_Persistence(t *testing.T) {
	tmpDir := t.TempDir()

	// Create first KB instance and add entries
	kb1, err := NewKnowledgeBase(tmpDir)
	require.NoError(t, err)

	err = kb1.Add(KnowledgeEntry{
		Category:  CatToolUsage,
		Title:     "Persistence Test",
		Content:   "This entry should persist across restarts",
		Tags:      []string{"test", "persistence"},
		RiskLevel: RiskLow,
	})
	require.NoError(t, err)
	assert.NoError(t, kb1.Close())

	// Open a new KB instance from the same directory
	kb2, err := NewKnowledgeBase(tmpDir)
	require.NoError(t, err)
	defer kb2.Close()

	// Search should find the entry from the previous instance
	results, err := kb2.Search("persistence", "", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, results)

	found := false
	for _, r := range results {
		if r.Title == "Persistence Test" {
			found = true
			break
		}
	}
	assert.True(t, found, "Entry should persist across KB instances")
}

func TestKnowledgeBase_DBCPath(t *testing.T) {
	tmpDir := t.TempDir()
	kb, err := NewKnowledgeBase(tmpDir)
	require.NoError(t, err)
	defer kb.Close()

	expectedPath := filepath.Join(tmpDir, "knowledge", "kb.sqlite")
	assert.Equal(t, expectedPath, kb.DBPath())
}

func TestKnowledgeBase_SyncKnowledge(t *testing.T) {
	tmpDir := t.TempDir()
	kb, err := NewKnowledgeBase(tmpDir)
	require.NoError(t, err)
	defer kb.Close()

	// Create knowledge directory with test files
	kbDir := filepath.Join(tmpDir, "knowledge")
	require.NoError(t, os.MkdirAll(kbDir, 0o755))

	// Write test .md file with frontmatter
	mdContent := `---
title: Test Entry
category: tool_usage
tags: test, sync
aliases: test-alias
---

This is test content for sync.`
	require.NoError(t, os.WriteFile(filepath.Join(kbDir, "test-entry.md"), []byte(mdContent), 0o644))

	// Sync should index the file
	count, err := kb.SyncKnowledge(tmpDir)
	require.NoError(t, err)
	assert.Equal(t, 1, count)

	// Search should find the synced entry
	results, err := kb.Search("test content", "", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, results)

	found := false
	for _, r := range results {
		if r.Title == "Test Entry" {
			found = true
			break
		}
	}
	assert.True(t, found, "Synced entry should be searchable")
}

func TestKnowledgeBase_SyncKnowledge_EmptyDir(t *testing.T) {
	tmpDir := t.TempDir()
	kb, err := NewKnowledgeBase(tmpDir)
	require.NoError(t, err)
	defer kb.Close()

	// No knowledge directory should return 0, nil
	count, err := kb.SyncKnowledge(tmpDir)
	require.NoError(t, err)
	assert.Equal(t, 0, count)
}

func TestBuildMatchQuery(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		output string
	}{
		{
			name:   "single word",
			input:  "hello",
			output: `"hello"`,
		},
		{
			name:   "multiple words",
			input:  "how to configure VeriFactu",
			output: `"how" "to" "configure" "verifactu"`,
		},
		{
			name:   "empty string",
			input:  "",
			output: "",
		},
		{
			name:   "extra whitespace",
			input:  "  hello   world  ",
			output: `"hello" "world"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := buildMatchQuery(tt.input)
			assert.Equal(t, tt.output, result)
		})
	}
}

func TestKnowledgeBase_SearchTools(t *testing.T) {
	tmpDir := t.TempDir()
	kb, err := NewKnowledgeBase(tmpDir)
	require.NoError(t, err)
	defer kb.Close()

	// Register tool knowledge
	err = kb.RegisterToolKnowledge(ToolKnowledge{
		ToolName:  "search_crm_leads",
		Description: "Search CRM leads by name, email, or phone",
		Category:  "crm",
		Tags:      []string{"crm", "lead"},
		RiskLevel: RiskLow,
	})
	require.NoError(t, err)

	// Search tools
	results, err := kb.SearchTools("crm leads", 10)
	require.NoError(t, err)
	assert.NotEmpty(t, results)
	assert.Equal(t, "search_crm_leads", results[0].ToolName)
}
