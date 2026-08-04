package tools

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Test helpers ---

// mockTool implements Tool for testing.
type mockTool struct {
	name        string
	description string
	params      map[string]any
	domain      string
}

func (m *mockTool) Name() string                    { return m.name }
func (m *mockTool) Description() string             { return m.description }
func (m *mockTool) Parameters() map[string]any       { return m.params }
func (m *mockTool) Execute(_ context.Context, _ map[string]any) *ToolResult {
	return NewToolResult("ok")
}

func (m *mockTool) Domain() string { return m.domain }

// --- Retrieval Engine Tests ---

func TestRetrievalEngine_IndexAndRetrieve(t *testing.T) {
	engine, err := NewRetrievalEngine(NoopRewriter{})
	require.NoError(t, err)
	defer engine.Close()

	registry := NewToolRegistry()
	registry.Register(&mockTool{
		name:        "search_crm_leads",
		description: "Search for CRM leads and opportunities",
		params:      map[string]any{"type": "object", "properties": map[string]any{"query": map[string]any{"type": "string"}}},
		domain:      DomainCRM,
	})
	registry.Register(&mockTool{
		name:        "create_invoice",
		description: "Create a new accounting invoice",
		params:      map[string]any{"type": "object", "properties": map[string]any{"partner_id": map[string]any{"type": "integer"}}},
		domain:      DomainAccounting,
	})
	registry.Register(&mockTool{
		name:        "check_stock_quantity",
		description: "Check inventory stock levels for products",
		params:      map[string]any{"type": "object", "properties": map[string]any{"product_id": map[string]any{"type": "integer"}}},
		domain:      DomainInventory,
	})
	registry.Register(&mockTool{
		name:        "send_message",
		description: "Send a message to a chat channel",
		params:      map[string]any{"type": "object", "properties": map[string]any{"content": map[string]any{"type": "string"}}},
		domain:      DomainGeneral,
	})

	// Index tools
	err = engine.IndexTools(registry)
	require.NoError(t, err)
	assert.True(t, engine.IsIndexed())

	// Test: retrieve CRM-related tools
	results, err := engine.Retrieve("buscar leads crm oportunidades", "", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, results)
	// search_crm_leads should be in the results
	found := false
	for _, name := range results {
		if name == "search_crm_leads" {
			found = true
			break
		}
	}
	assert.True(t, found, "search_crm_leads should be in results for CRM query")

	// Test: retrieve accounting tools
	results, err = engine.Retrieve("crear factura invoice", "", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, results)
	found = false
	for _, name := range results {
		if name == "create_invoice" {
			found = true
			break
		}
	}
	assert.True(t, found, "create_invoice should be in results for invoice query")

	// Test: retrieve stock tools
	results, err = engine.Retrieve("check stock quantity inventory", "", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, results)
}

func TestRetrievalEngine_RetrieveWithDomain(t *testing.T) {
	engine, err := NewRetrievalEngine(NoopRewriter{})
	require.NoError(t, err)
	defer engine.Close()

	registry := NewToolRegistry()
	registry.Register(&mockTool{
		name:        "search_crm_leads",
		description: "Search for CRM leads",
		domain:      DomainCRM,
	})
	registry.Register(&mockTool{
		name:        "search_sale_orders",
		description: "Search for sale orders",
		domain:      DomainSales,
	})
	registry.Register(&mockTool{
		name:        "search_employees",
		description: "Search for employees",
		domain:      DomainHR,
	})

	err = engine.IndexTools(registry)
	require.NoError(t, err)

	// Search with module filter — CRM tools should appear first
	results, err := engine.Retrieve("search", "crm", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, results)
	// First result should be CRM-related
	if len(results) > 0 {
		assert.Equal(t, "search_crm_leads", results[0])
	}
}

func TestRetrievalEngine_SynonymRewriter(t *testing.T) {
	engine, err := NewRetrievalEngine(NewSynonymRewriter())
	require.NoError(t, err)
	defer engine.Close()

	registry := NewToolRegistry()
	registry.Register(&mockTool{
		name:        "delete_record",
		description: "Delete a record from Odoo",
		domain:      DomainGeneral,
	})

	err = engine.IndexTools(registry)
	require.NoError(t, err)

	// "delete" is a key in synonyms — should expand to "delete OR remove OR destroy OR borrar OR eliminar"
	// FTS5 should match "delete" in the indexed tool name
	results, err := engine.Retrieve("delete", "", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, results)
}

func TestRetrievalEngine_FallbackSearch(t *testing.T) {
	engine, err := NewRetrievalEngine(NoopRewriter{})
	require.NoError(t, err)
	defer engine.Close()

	registry := NewToolRegistry()
	registry.Register(&mockTool{
		name:        "custom_special_tool",
		description: "A very specific custom tool for testing",
	})

	err = engine.IndexTools(registry)
	require.NoError(t, err)

	// FTS5 might fail on certain queries, fallback should work
	results, err := engine.Retrieve("specific custom", "", 5)
	require.NoError(t, err)
	// Should find it via FTS5 or fallback
	assert.NotEmpty(t, results)
}

func TestRetrievalEngine_NilEngine(t *testing.T) {
	var engine *RetrievalEngine
	results, err := engine.Retrieve("test", "", 5)
	require.NoError(t, err)
	assert.Nil(t, results)
}

// --- Registry Retrieval Integration Tests ---

func TestRegistry_SetRetrievalEngine(t *testing.T) {
	registry := NewToolRegistry()
	engine, err := NewRetrievalEngine(NoopRewriter{})
	require.NoError(t, err)
	defer engine.Close()

	registry.Register(&mockTool{
		name:        "test_tool",
		description: "A test tool",
	})

	registry.SetRetrievalEngine(engine)
	assert.NotNil(t, registry.GetRetrievalEngine())

	err = engine.IndexTools(registry)
	require.NoError(t, err)

	// Should find the tool via retrieval
	results := registry.RetrieveRelevant("test", "", 5)
	assert.NotEmpty(t, results)

	// Clear
	registry.ClearDetrievalEngine()
	assert.Nil(t, registry.GetRetrievalEngine())

	// Should return nil when no engine
	results = registry.RetrieveRelevant("test", "", 5)
	assert.Nil(t, results)
}

func TestRegistry_ToProviderDefsWithRetrieval(t *testing.T) {
	registry := NewToolRegistry()

	// Register tools
	registry.Register(&mockTool{
		name:        "search_crm_leads",
		description: "Search for CRM leads",
		domain:      DomainCRM,
	})
	registry.Register(&mockTool{
		name:        "create_invoice",
		description: "Create an invoice",
		domain:      DomainAccounting,
	})
	registry.Register(&mockTool{
		name:        "memory_search",
		description: "Search memory",
		domain:      DomainGeneral,
	})

	engine, err := NewRetrievalEngine(NoopRewriter{})
	require.NoError(t, err)
	defer engine.Close()

	registry.SetRetrievalEngine(engine)
	err = engine.IndexTools(registry)
	require.NoError(t, err)

	// Get retrieval-filtered defs for CRM query
	defs := registry.ToProviderDefsWithRetrieval("buscar leads", "", 5)

	// Should include core tools (memory_search) + CRM tools
	assert.NotEmpty(t, defs)
	names := make(map[string]bool)
	for _, d := range defs {
		names[d.Function.Name] = true
	}
	assert.True(t, names["memory_search"], "core tool should always be included")
}
