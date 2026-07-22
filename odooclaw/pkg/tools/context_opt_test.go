package tools

import (
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/providers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestContextOptimizer_CompactSchema(t *testing.T) {
	tool := &mockTool{
		name:        "search_crm_leads",
		description: "Search for CRM leads and opportunities",
		params: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"query": map[string]any{
					"type":        "string",
					"description": "The search query",
					"minLength":   1,
				},
				"limit": map[string]any{
					"type":        "integer",
					"description": "Max results",
					"default":     10,
				},
			},
			"required": []any{"query"},
		},
	}

	schema := CompactSchema(tool)
	require.NotNil(t, schema)

	fn, ok := schema["function"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "search_crm_leads", fn["name"])
	assert.Equal(t, "Search for CRM leads and opportunities", fn["description"])

	params, ok := fn["parameters"].(map[string]any)
	require.True(t, ok)

	// Should have type, required, properties
	assert.Equal(t, "object", params["type"])
	assert.NotNil(t, params["required"])
	assert.NotNil(t, params["properties"])

	// Properties should be compact (no descriptions, constraints)
	props, ok := params["properties"].(map[string]any)
	require.True(t, ok)

	queryProp, ok := props["query"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "string", queryProp["type"])
	assert.Nil(t, queryProp["description"], "compact schema should strip descriptions")
	assert.Nil(t, queryProp["minLength"], "compact schema should strip constraints")
}

func TestEstimateTokens(t *testing.T) {
	defs := []providers.ToolDefinition{
		{
			Type: "function",
			Function: providers.ToolFunctionDefinition{
				Name:        "search_crm_leads",
				Description: "Search for CRM leads",
				Parameters: map[string]any{
					"properties": map[string]any{
						"query": map[string]any{"type": "string"},
					},
				},
			},
		},
	}

	tokens := EstimateTokens(defs)
	assert.Greater(t, tokens, 0)
	assert.Less(t, tokens, 100, "should be a reasonable token estimate")
}

func TestOptimizeToolDefs_BudgetConstraint(t *testing.T) {
	defs := make([]providers.ToolDefinition, 20)
	for i := range defs {
		defs[i] = providers.ToolDefinition{
			Type: "function",
			Function: providers.ToolFunctionDefinition{
				Name:        "tool_" + string(rune('a'+i)),
				Description: "Description for tool " + string(rune('a'+i)),
				Parameters: map[string]any{
					"properties": map[string]any{
						"param1": map[string]any{"type": "string"},
					},
				},
			},
		}
	}

	// With a tight budget, should get fewer tools
	optimized := OptimizeToolDefs(defs, nil, nil, 100)
	assert.Less(t, len(optimized), len(defs), "should reduce tool count to fit budget")

	// With no budget, should return all
	optimized = OptimizeToolDefs(defs, nil, nil, 0)
	assert.Equal(t, len(defs), len(optimized), "with no budget, should return all tools")
}

func TestOptimizeToolDefs_CoreToolsAlwaysIncluded(t *testing.T) {
	defs := []providers.ToolDefinition{
		{
			Type: "function",
			Function: providers.ToolFunctionDefinition{
				Name:        "memory_search",
				Description: "Search memory",
			},
		},
		{
			Type: "function",
			Function: providers.ToolFunctionDefinition{
				Name:        "some_odoo_tool",
				Description: "An Odoo tool",
			},
		},
	}

	optimized := OptimizeToolDefs(defs, nil, nil, 50)
	names := make(map[string]bool)
	for _, d := range optimized {
		names[d.Function.Name] = true
	}
	assert.True(t, names["memory_search"], "core tool should always be included")
}

func TestBuildCompactToolList(t *testing.T) {
	defs := []providers.ToolDefinition{
		{
			Type: "function",
			Function: providers.ToolFunctionDefinition{
				Name:        "search_crm_leads",
				Description: "Search for CRM leads and opportunities",
			},
		},
		{
			Type: "function",
			Function: providers.ToolFunctionDefinition{
				Name:        "create_invoice",
				Description: "Create a new accounting invoice",
			},
		},
	}

	list := BuildCompactToolList(defs)
	assert.Contains(t, list, "search_crm_leads")
	assert.Contains(t, list, "create_invoice")
	assert.Contains(t, list, "Available tools:")
}
