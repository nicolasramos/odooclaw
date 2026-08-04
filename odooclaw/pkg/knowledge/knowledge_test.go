package knowledge

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestKnowledgeBase_AddAndSearch(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	// Add entries
	err = kb.Add(KnowledgeEntry{
		Category: "tool_usage",
		Title:    "CRM Lead Search",
		Content:  "Use search_crm_leads to find CRM leads by name, email, or phone",
		Tags:     []string{"crm", "lead", "tool:search_crm_leads"},
	})
	require.NoError(t, err)

	err = kb.Add(KnowledgeEntry{
		Category: "tool_usage",
		Title:    "Invoice Creation",
		Content:  "Use create_invoice to create accounting invoices for partners",
		Tags:     []string{"account", "invoice", "tool:create_invoice"},
	})
	require.NoError(t, err)

	err = kb.Add(KnowledgeEntry{
		Category: "workflow",
		Title:    "CRM Pipeline Workflow",
		Content:  "Leads progress through stages: New → Qualified → Proposition → Won",
		Tags:     []string{"crm", "pipeline", "workflow"},
	})
	require.NoError(t, err)

	// Search
	results, err := kb.Search("CRM lead", "", 10)
	require.NoError(t, err)
	assert.NotEmpty(t, results)

	// Search by category
	results, err = kb.Search("invoice", "tool_usage", 10)
	require.NoError(t, err)
	assert.NotEmpty(t, results)
	for _, r := range results {
		assert.Equal(t, "tool_usage", r.Category)
	}

	// Count
	assert.Equal(t, 3, kb.Count())
}

func TestKnowledgeBase_GetRelevantTools(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	err = kb.Add(KnowledgeEntry{
		Category: "tool_usage",
		Title:    "CRM Search",
		Content:  "Search for CRM leads",
		Tags:     []string{"crm", "tool:search_crm_leads"},
	})
	require.NoError(t, err)

	err = kb.Add(KnowledgeEntry{
		Category: "tool_usage",
		Title:    "Invoice Create",
		Content:  "Create invoices",
		Tags:     []string{"account", "tool:create_invoice"},
	})
	require.NoError(t, err)

	// Get relevant tools for CRM query
	tools, err := kb.GetRelevantTools("CRM lead search", 5)
	require.NoError(t, err)
	assert.Contains(t, tools, "search_crm_leads")
}

func TestKnowledgeBase_LoadOdooDomainKnowledge(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	err = kb.LoadOdooDomainKnowledge()
	require.NoError(t, err)

	// Should have loaded domain entries
	assert.Greater(t, kb.Count(), 0)

	// Search for CRM
	results, err := kb.Search("CRM leads opportunities", "", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, results)
}

func TestKnowledgeBase_FallbackSearch(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	err = kb.Add(KnowledgeEntry{
		Category: "test",
		Title:    "Test Entry",
		Content:  "Some content here",
		Tags:     []string{"test"},
	})
	require.NoError(t, err)

	// Force a search that might trigger fallback
	results, err := kb.Search("content", "", 10)
	require.NoError(t, err)
	assert.NotEmpty(t, results)
}
