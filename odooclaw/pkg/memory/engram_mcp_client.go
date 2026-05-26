package memory

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

const defaultEngramMCPServer = "engram"

type MCPToolCaller interface {
	CallTool(
		ctx context.Context,
		serverName, toolName string,
		arguments map[string]any,
	) (*sdkmcp.CallToolResult, error)
}

type EngramMCPClient struct {
	caller     MCPToolCaller
	serverName string
}

func NewEngramMCPClient(caller MCPToolCaller, serverName string) *EngramMCPClient {
	serverName = strings.TrimSpace(serverName)
	if serverName == "" {
		serverName = defaultEngramMCPServer
	}

	return &EngramMCPClient{
		caller:     caller,
		serverName: serverName,
	}
}

func (c *EngramMCPClient) StartSession(ctx context.Context, input EngramSessionStartInput) error {
	_, err := c.call(ctx, "mem_session_start", map[string]any{
		"id":        strings.TrimSpace(input.ID),
		"directory": strings.TrimSpace(input.Directory),
	})
	return err
}

func (c *EngramMCPClient) Save(ctx context.Context, input EngramSaveInput) error {
	args := compactMap(map[string]any{
		"title":     strings.TrimSpace(input.Title),
		"type":      strings.TrimSpace(input.Type),
		"content":   strings.TrimSpace(input.Content),
		"project":   strings.TrimSpace(input.Project),
		"scope":     strings.TrimSpace(input.Scope),
		"topic_key": strings.TrimSpace(input.TopicKey),
	})

	_, err := c.call(ctx, "mem_save", args)
	return err
}

func (c *EngramMCPClient) Search(ctx context.Context, input EngramSearchInput) ([]EngramSearchResult, error) {
	args := compactMap(map[string]any{
		"query":   strings.TrimSpace(input.Query),
		"project": strings.TrimSpace(input.Project),
		"scope":   strings.TrimSpace(input.Scope),
		"type":    strings.TrimSpace(input.Type),
		"limit":   input.Limit,
	})

	result, err := c.call(ctx, "mem_search", args)
	if err != nil {
		return nil, err
	}

	return parseEngramSearchResults(extractMCPText(result.Content)), nil
}

func (c *EngramMCPClient) SummarizeSession(ctx context.Context, input EngramSessionSummaryInput) error {
	_, err := c.call(ctx, "mem_session_summary", compactMap(map[string]any{
		"session_id": strings.TrimSpace(input.SessionID),
		"content":    strings.TrimSpace(input.Content),
	}))
	return err
}

func (c *EngramMCPClient) call(
	ctx context.Context,
	toolName string,
	args map[string]any,
) (*sdkmcp.CallToolResult, error) {
	if c == nil || c.caller == nil {
		return nil, fmt.Errorf("engram MCP caller is not configured")
	}

	result, err := c.caller.CallTool(ctx, c.serverName, toolName, args)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("engram MCP tool %s returned nil result", toolName)
	}
	if result.IsError {
		return nil, fmt.Errorf("engram MCP tool %s returned error: %s", toolName, extractMCPText(result.Content))
	}

	return result, nil
}

func compactMap(values map[string]any) map[string]any {
	compact := make(map[string]any, len(values))
	for key, value := range values {
		switch typed := value.(type) {
		case string:
			if typed != "" {
				compact[key] = typed
			}
		case int:
			if typed > 0 {
				compact[key] = typed
			}
		default:
			if typed != nil {
				compact[key] = typed
			}
		}
	}
	return compact
}

func extractMCPText(content []sdkmcp.Content) string {
	parts := make([]string, 0, len(content))
	for _, item := range content {
		if text, ok := item.(*sdkmcp.TextContent); ok {
			parts = append(parts, text.Text)
		}
	}
	return strings.Join(parts, "\n")
}

func parseEngramSearchResults(raw string) []EngramSearchResult {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}

	var results []EngramSearchResult
	if err := json.Unmarshal([]byte(trimmed), &results); err == nil {
		return results
	}

	return []EngramSearchResult{{Content: trimmed}}
}
