package integration

import (
	"context"
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/providers"
	"github.com/nicolasramos/odooclaw/pkg/tools"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Mock Provider ---

type mockProvider struct {
	response *providers.LLMResponse
}

func (m *mockProvider) Chat(_ context.Context, _ []providers.Message, _ []providers.ToolDefinition, _ string, _ map[string]any) (*providers.LLMResponse, error) {
	return m.response, nil
}

func (m *mockProvider) GetDefaultModel() string { return "test-model" }

// --- Test helpers ---

type integrationMockTool struct {
	name        string
	description string
	params      map[string]any
}

func (m *integrationMockTool) Name() string                    { return m.name }
func (m *integrationMockTool) Description() string             { return m.description }
func (m *integrationMockTool) Parameters() map[string]any       { return m.params }
func (m *integrationMockTool) Execute(_ context.Context, _ map[string]any) *tools.ToolResult {
	return tools.NewToolResult("ok")
}

func setupTestPipeline(t *testing.T) (*Pipeline, *tools.ToolRegistry) {
	t.Helper()

	registry := tools.NewToolRegistry()

	// Register tools across different domains
	registry.Register(&integrationMockTool{
		name:        "search_crm_leads",
		description: "Search for CRM leads and opportunities",
		params:      map[string]any{"type": "object", "properties": map[string]any{"query": map[string]any{"type": "string"}}},
	})
	registry.Register(&integrationMockTool{
		name:        "create_invoice",
		description: "Create a new accounting invoice",
		params:      map[string]any{"type": "object", "properties": map[string]any{"partner_id": map[string]any{"type": "integer"}}},
	})
	registry.Register(&integrationMockTool{
		name:        "check_stock_quantity",
		description: "Check inventory stock levels",
		params:      map[string]any{"type": "object", "properties": map[string]any{"product_id": map[string]any{"type": "integer"}}},
	})
	registry.Register(&integrationMockTool{
		name:        "send_message",
		description: "Send a message to a channel",
		params:      map[string]any{"type": "object", "properties": map[string]any{"content": map[string]any{"type": "string"}}},
	})
	registry.Register(&integrationMockTool{
		name:        "memory_search",
		description: "Search conversation memory",
		params:      map[string]any{"type": "object", "properties": map[string]any{"query": map[string]any{"type": "string"}}},
	})

	provider := &mockProvider{
		response: &providers.LLMResponse{
			Content:   "Test response",
			ToolCalls: nil,
		},
	}

	cfg := DefaultPipelineConfig()
	pipeline := NewPipeline(cfg, registry, provider, "test-model")

	return pipeline, registry
}

// --- Tests ---

func TestPipeline_BasicProcessRequest(t *testing.T) {
	pipeline, _ := setupTestPipeline(t)
	defer pipeline.Close()

	result, err := pipeline.ProcessRequest(context.Background(), PipelineRequest{
		UserMessage: "Hola, ¿qué tal?",
		SessionKey:  "test-session",
	})

	require.NoError(t, err)
	assert.Equal(t, "Test response", result.Response)
	assert.Equal(t, "test-model", result.ModelUsed)
	assert.Greater(t, result.TotalTools, 0)
}

func TestPipeline_ToolRetrievalIntegration(t *testing.T) {
	pipeline, _ := setupTestPipeline(t)
	defer pipeline.Close()

	// CRM query should retrieve CRM tools
	result, err := pipeline.ProcessRequest(context.Background(), PipelineRequest{
		UserMessage: "Buscar leads en CRM",
		SessionKey:  "test-session",
	})

	require.NoError(t, err)
	assert.NotEmpty(t, result.ToolsUsed, "should have retrieved tools")
	assert.Less(t, result.ToolCount, result.TotalTools, "should have filtered tools")
	assert.Greater(t, result.TokensSaved, 0, "should have saved tokens")
}

func TestPipeline_KnowledgeBaseIntegration(t *testing.T) {
	pipeline, _ := setupTestPipeline(t)
	defer pipeline.Close()

	// Knowledge base should enhance retrieval
	result, err := pipeline.ProcessRequest(context.Background(), PipelineRequest{
		UserMessage: "Crear factura para cliente",
		SessionKey:  "test-session",
	})

	require.NoError(t, err)
	assert.NotNil(t, result)
}

func TestPipeline_ContextOptimization(t *testing.T) {
	pipeline, _ := setupTestPipeline(t)
	defer pipeline.Close()

	result, err := pipeline.ProcessRequest(context.Background(), PipelineRequest{
		UserMessage: "Check stock quantity",
		SessionKey:  "test-session",
	})

	require.NoError(t, err)
	assert.NotZero(t, result.StageTimings["optimize"], "optimize stage should have run")
}

func TestPipeline_MetricsTracking(t *testing.T) {
	pipeline, _ := setupTestPipeline(t)
	defer pipeline.Close()

	// Process a few requests
	for i := 0; i < 3; i++ {
		_, err := pipeline.ProcessRequest(context.Background(), PipelineRequest{
			UserMessage: "test message",
			SessionKey:  "test-session",
		})
		require.NoError(t, err)
	}

	metrics := pipeline.GetMetrics()
	assert.GreaterOrEqual(t, metrics.TotalRequests, int64(3))
}

func TestPipeline_NoProvider(t *testing.T) {
	registry := tools.NewToolRegistry()
	pipeline := NewPipeline(DefaultPipelineConfig(), registry, nil, "test-model")
	defer pipeline.Close()

	_, err := pipeline.ProcessRequest(context.Background(), PipelineRequest{
		UserMessage: "test",
	})
	assert.Error(t, err, "should fail without provider")
}

func TestPipeline_WithHistory(t *testing.T) {
	pipeline, _ := setupTestPipeline(t)
	defer pipeline.Close()

	result, err := pipeline.ProcessRequest(context.Background(), PipelineRequest{
		UserMessage: "Now search for products",
		SessionKey:  "test-session",
		History: []providers.Message{
			{Role: "user", Content: "Hola"},
			{Role: "assistant", Content: "¡Hola! ¿En qué puedo ayudarte?"},
			{Role: "user", Content: "Show me the CRM leads"},
			{Role: "assistant", Content: "Here are the CRM leads..."},
		},
	})

	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "test-model", result.ModelUsed)
}

func TestPipeline_Close(t *testing.T) {
	pipeline, _ := setupTestPipeline(t)

	err := pipeline.Close()
	assert.NoError(t, err)
}
