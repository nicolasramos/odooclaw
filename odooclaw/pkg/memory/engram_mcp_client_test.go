package memory

import (
	"context"
	"errors"
	"testing"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type mcpCall struct {
	serverName string
	toolName   string
	arguments  map[string]any
}

type fakeMCPToolCaller struct {
	calls  []mcpCall
	result *sdkmcp.CallToolResult
	err    error
}

func (f *fakeMCPToolCaller) CallTool(
	_ context.Context,
	serverName, toolName string,
	arguments map[string]any,
) (*sdkmcp.CallToolResult, error) {
	f.calls = append(f.calls, mcpCall{
		serverName: serverName,
		toolName:   toolName,
		arguments:  arguments,
	})
	if f.err != nil {
		return nil, f.err
	}
	if f.result != nil {
		return f.result, nil
	}
	return &sdkmcp.CallToolResult{}, nil
}

func TestEngramMCPClientSaveCallsMemSave(t *testing.T) {
	caller := &fakeMCPToolCaller{}
	client := NewEngramMCPClient(caller, "")

	if err := client.Save(context.Background(), EngramSaveInput{
		Title:    "Architecture decision",
		Type:     "decision",
		Content:  "**What**: Use Engram for strategic memory.",
		Project:  "odooclaw",
		Scope:    "project",
		TopicKey: "architecture/engram",
	}); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	call := requireSingleMCPCall(t, caller)
	if call.serverName != "engram" {
		t.Fatalf("serverName = %q", call.serverName)
	}
	if call.toolName != "mem_save" {
		t.Fatalf("toolName = %q", call.toolName)
	}
	if call.arguments["topic_key"] != "architecture/engram" {
		t.Fatalf("topic_key = %v", call.arguments["topic_key"])
	}
}

func TestEngramMCPClientStartSessionCallsMemSessionStart(t *testing.T) {
	caller := &fakeMCPToolCaller{}
	client := NewEngramMCPClient(caller, "project-memory")

	if err := client.StartSession(context.Background(), EngramSessionStartInput{
		ID:        "sess-1",
		Directory: "/workspace",
	}); err != nil {
		t.Fatalf("StartSession() error = %v", err)
	}

	call := requireSingleMCPCall(t, caller)
	if call.serverName != "project-memory" {
		t.Fatalf("serverName = %q", call.serverName)
	}
	if call.toolName != "mem_session_start" {
		t.Fatalf("toolName = %q", call.toolName)
	}
	if call.arguments["directory"] != "/workspace" {
		t.Fatalf("directory = %v", call.arguments["directory"])
	}
}

func TestEngramMCPClientSearchCallsMemSearch(t *testing.T) {
	caller := &fakeMCPToolCaller{result: &sdkmcp.CallToolResult{
		Content: []sdkmcp.Content{
			&sdkmcp.TextContent{Text: `[{"title":"Decision","type":"decision","content":"Use MCP","score":0.7}]`},
		},
	}}
	client := NewEngramMCPClient(caller, "engram")

	results, err := client.Search(context.Background(), EngramSearchInput{
		Query:   "MCP",
		Project: "odooclaw",
		Scope:   "project",
		Limit:   5,
	})
	if err != nil {
		t.Fatalf("Search() error = %v", err)
	}

	call := requireSingleMCPCall(t, caller)
	if call.toolName != "mem_search" {
		t.Fatalf("toolName = %q", call.toolName)
	}
	if call.arguments["limit"] != 5 {
		t.Fatalf("limit = %v", call.arguments["limit"])
	}
	if len(results) != 1 || results[0].Title != "Decision" {
		t.Fatalf("results = %+v", results)
	}
}

func TestEngramMCPClientSummarizeSessionCallsMemSessionSummary(t *testing.T) {
	caller := &fakeMCPToolCaller{}
	client := NewEngramMCPClient(caller, "engram")

	if err := client.SummarizeSession(context.Background(), EngramSessionSummaryInput{
		SessionID: "sess-1",
		Content:   "## Goal\nIntegrate Engram",
	}); err != nil {
		t.Fatalf("SummarizeSession() error = %v", err)
	}

	call := requireSingleMCPCall(t, caller)
	if call.toolName != "mem_session_summary" {
		t.Fatalf("toolName = %q", call.toolName)
	}
	if call.arguments["session_id"] != "sess-1" {
		t.Fatalf("session_id = %v", call.arguments["session_id"])
	}
}

func TestEngramMCPClientPropagatesMCPError(t *testing.T) {
	wantErr := errors.New("mcp unavailable")
	caller := &fakeMCPToolCaller{err: wantErr}
	client := NewEngramMCPClient(caller, "engram")

	err := client.Save(context.Background(), EngramSaveInput{Content: "important"})
	if !errors.Is(err, wantErr) {
		t.Fatalf("Save() error = %v, want %v", err, wantErr)
	}
}

func TestEngramMCPClientReturnsToolErrors(t *testing.T) {
	caller := &fakeMCPToolCaller{result: &sdkmcp.CallToolResult{
		IsError: true,
		Content: []sdkmcp.Content{
			&sdkmcp.TextContent{Text: "permission denied"},
		},
	}}
	client := NewEngramMCPClient(caller, "engram")

	err := client.Save(context.Background(), EngramSaveInput{Content: "important"})
	if err == nil {
		t.Fatal("expected tool error")
	}
}

func requireSingleMCPCall(t *testing.T, caller *fakeMCPToolCaller) mcpCall {
	t.Helper()
	if len(caller.calls) != 1 {
		t.Fatalf("expected one MCP call, got %d", len(caller.calls))
	}
	return caller.calls[0]
}
