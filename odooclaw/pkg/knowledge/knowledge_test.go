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
		Category:  CatWorkflow,
		Title:     "CRM Pipeline Workflow",
		Content:   "Leads progress through stages: New → Qualified → Proposition → Won",
		Tags:      []string{"crm", "pipeline", "workflow"},
		RiskLevel: RiskLow,
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
		assert.Equal(t, "tool_usage", string(r.Category))
	}

	// Count
	assert.Equal(t, 3, kb.Count())
}

func TestKnowledgeBase_GetRelevantTools(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	err = kb.Add(KnowledgeEntry{
		Category: CatToolUsage,
		Title:    "CRM Search",
		Content:  "Search for CRM leads",
		Tags:     []string{"crm", "tool:search_crm_leads"},
	})
	require.NoError(t, err)

	err = kb.Add(KnowledgeEntry{
		Category: CatToolUsage,
		Title:    "Invoice Create",
		Content:  "Create invoices",
		Tags:     []string{"account", "tool:create_invoice"},
	})
	require.NoError(t, err)

	// Get relevant tools for CRM query
	tools, err := kb.GetRelevantTools("CRM lead search", 5)
	require.NoError(t, err)
	assert.Contains(t, tools, "search_crm_leads")

	// Get relevant tools for accounting query
	tools, err = kb.GetRelevantTools("accounting invoice", 5)
	require.NoError(t, err)
	assert.Contains(t, tools, "create_invoice")
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
		Category: CatToolUsage,
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

func TestKnowledgeBase_ToolKnowledge(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	// Register tool knowledge
	tk := ToolKnowledge{
		ToolName:    "search_crm_leads",
		Description: "Search for CRM leads and opportunities",
		Category:    CatToolUsage,
		Tags:        []string{"crm", "lead"},
		Metadata:    map[string]string{"module": "crm", "odoo_version": "17"},
		Aliases:     []string{"buscar leads crm", "find CRM leads"},
		RiskLevel:   RiskLow,
		Dependencies: []string{"memory_search"},
		Examples:    []string{"search_crm_leads(query=\"acme\")"},
	}

	err = kb.RegisterToolKnowledge(tk)
	require.NoError(t, err)

	// Retrieve tool knowledge
	retrieved, err := kb.GetToolKnowledge("search_crm_leads")
	require.NoError(t, err)
	assert.Equal(t, "search_crm_leads", retrieved.ToolName)
	assert.Equal(t, RiskLow, retrieved.RiskLevel)
	assert.Contains(t, retrieved.Aliases, "buscar leads crm")
	assert.Contains(t, retrieved.Dependencies, "memory_search")
	assert.Equal(t, "crm", retrieved.Metadata["module"])

	// Get risk level
	risk := kb.GetToolRiskLevel("search_crm_leads")
	assert.Equal(t, RiskLow, risk)

	// Unknown tool defaults to low
	risk = kb.GetToolRiskLevel("unknown_tool")
	assert.Equal(t, RiskLow, risk)

	// Count tools
	assert.Equal(t, 1, kb.CountTools())
}

func TestKnowledgeBase_GetToolsByRisk(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	kb.RegisterToolKnowledge(ToolKnowledge{
		ToolName:  "read_file",
		RiskLevel: RiskLow,
	})
	kb.RegisterToolKnowledge(ToolKnowledge{
		ToolName:  "delete_record",
		RiskLevel: RiskHigh,
	})
	kb.RegisterToolKnowledge(ToolKnowledge{
		ToolName:  "edit_file",
		RiskLevel: RiskMedium,
	})

	lowTools := kb.GetToolsByRisk(RiskLow)
	assert.Contains(t, lowTools, "read_file")

	highTools := kb.GetToolsByRisk(RiskHigh)
	assert.Contains(t, highTools, "delete_record")

	mediumTools := kb.GetToolsByRisk(RiskMedium)
	assert.Contains(t, mediumTools, "edit_file")
}

func TestKnowledgeBase_GetToolsByModule(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	kb.RegisterToolKnowledge(ToolKnowledge{
		ToolName: "search_crm_leads",
		Metadata: map[string]string{"module": "crm"},
	})
	kb.RegisterToolKnowledge(ToolKnowledge{
		ToolName: "create_invoice",
		Metadata: map[string]string{"module": "account"},
	})

	crmTools := kb.GetToolsByModule("crm")
	assert.Contains(t, crmTools, "search_crm_leads")

	accountTools := kb.GetToolsByModule("account")
	assert.Contains(t, accountTools, "create_invoice")
}

func TestKnowledgeBase_GetToolAliases(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	kb.RegisterToolKnowledge(ToolKnowledge{
		ToolName: "search_crm_leads",
		Aliases:  []string{"buscar leads crm", "find CRM leads"},
	})

	aliases := kb.GetToolAliases("search_crm_leads")
	assert.Contains(t, aliases, "buscar leads crm")
	assert.Contains(t, aliases, "find CRM leads")

	// Unknown tool returns nil
	aliases = kb.GetToolAliases("unknown")
	assert.Nil(t, aliases)
}

func TestKnowledgeBase_GetToolDependencies(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	kb.RegisterToolKnowledge(ToolKnowledge{
		ToolName:     "edit_file",
		Dependencies: []string{"read_file"},
	})

	deps := kb.GetToolDependencies("edit_file")
	assert.Contains(t, deps, "read_file")

	// Unknown tool returns nil
	deps = kb.GetToolDependencies("unknown")
	assert.Nil(t, deps)
}

func TestKnowledgeBase_SearchTools(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	kb.RegisterToolKnowledge(ToolKnowledge{
		ToolName:    "search_crm_leads",
		Description: "Search for CRM leads and opportunities",
		Tags:        []string{"crm"},
	})
	kb.RegisterToolKnowledge(ToolKnowledge{
		ToolName:    "create_invoice",
		Description: "Create accounting invoices",
		Tags:        []string{"account"},
	})

	results, err := kb.SearchTools("CRM", 10)
	require.NoError(t, err)
	assert.NotEmpty(t, results)

	// Should find CRM-related tools
	found := false
	for _, r := range results {
		if r.ToolName == "search_crm_leads" {
			found = true
			break
		}
	}
	assert.True(t, found, "should find search_crm_leads for CRM query")
}

func TestKnowledgeBase_RiskLevels(t *testing.T) {
	// Verify all risk levels are defined
	assert.Equal(t, RiskLevel("low"), RiskLow)
	assert.Equal(t, RiskLevel("medium"), RiskMedium)
	assert.Equal(t, RiskLevel("high"), RiskHigh)
	assert.Equal(t, RiskLevel("critical"), RiskCritical)
}

func TestKnowledgeBase_Categories(t *testing.T) {
	// Verify all categories are defined
	assert.Equal(t, Category("tool_usage"), CatToolUsage)
	assert.Equal(t, Category("odoo_module"), CatOdooModule)
	assert.Equal(t, Category("workflow"), CatWorkflow)
	assert.Equal(t, Category("api_pattern"), CatApiPattern)
	assert.Equal(t, Category("alias"), CatAlias)
	assert.Equal(t, Category("dependency"), CatDependency)
	assert.Equal(t, Category("example"), CatExample)
	assert.Equal(t, Category("risk"), CatRisk)
}

func TestKnowledgeBase_Close(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)

	err = kb.Close()
	assert.NoError(t, err)

	// Closing again should be safe
	err = kb.Close()
	assert.NoError(t, err)
}

func TestKnowledgeBase_EmptySearch(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	// Search on empty KB should return empty results
	results, err := kb.Search("anything", "", 10)
	require.NoError(t, err)
	assert.Empty(t, results)

	tools, err := kb.GetRelevantTools("anything", 10)
	require.NoError(t, err)
	assert.Empty(t, tools)
}
