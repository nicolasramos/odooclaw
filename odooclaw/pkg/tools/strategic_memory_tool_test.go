package tools

import (
	"context"
	"errors"
	"strings"
	"testing"

	corememory "github.com/nicolasramos/odooclaw/pkg/memory"
)

type fakeStrategicMemoryRouter struct {
	inputs []corememory.RoutedMemoryInput
	result corememory.RoutedMemoryResult
	err    error
}

func (f *fakeStrategicMemoryRouter) Save(
	_ context.Context,
	input corememory.RoutedMemoryInput,
) (corememory.RoutedMemoryResult, error) {
	f.inputs = append(f.inputs, input)
	return f.result, f.err
}

func TestStrategicMemorySaveToolRoutesStrategicMemory(t *testing.T) {
	router := &fakeStrategicMemoryRouter{result: corememory.RoutedMemoryResult{Saved: true}}
	tool := NewStrategicMemorySaveTool(router)

	result := tool.Execute(context.Background(), map[string]any{
		"title":     "Chose Engram MCP internal mode",
		"type":      "decision",
		"content":   "**What**: Use Engram internally.\n**Why**: Avoid memory noise.",
		"project":   "odooclaw",
		"scope":     "project",
		"topic_key": "architecture/engram-mcp",
	})

	if result.IsError {
		t.Fatalf("Execute() returned error: %s", result.ForLLM)
	}
	if len(router.inputs) != 1 {
		t.Fatalf("expected one routed memory input, got %d", len(router.inputs))
	}
	input := router.inputs[0]
	if input.Route != corememory.MemoryRouteStrategic {
		t.Fatalf("Route = %q", input.Route)
	}
	if input.TopicKey != "architecture/engram-mcp" {
		t.Fatalf("TopicKey = %q", input.TopicKey)
	}
}

func TestStrategicMemorySaveToolRejectsOperationalTypes(t *testing.T) {
	tool := NewStrategicMemorySaveTool(&fakeStrategicMemoryRouter{})

	result := tool.Execute(context.Background(), map[string]any{
		"title":   "Invoice context",
		"type":    "chat",
		"content": "Currently reviewing invoice INV/2026/001.",
	})

	if !result.IsError {
		t.Fatal("expected unsupported strategic memory type error")
	}
}

func TestStrategicMemorySaveToolReportsDisabledEngram(t *testing.T) {
	router := &fakeStrategicMemoryRouter{result: corememory.RoutedMemoryResult{Saved: false}}
	tool := NewStrategicMemorySaveTool(router)

	result := tool.Execute(context.Background(), map[string]any{
		"title":   "Decision",
		"type":    "decision",
		"content": "**What**: Keep memory scoped.",
	})

	if result.IsError {
		t.Fatalf("Execute() returned error: %s", result.ForLLM)
	}
	if !strings.Contains(result.ForLLM, "Engram is disabled") {
		t.Fatalf("ForLLM = %q", result.ForLLM)
	}
}

func TestStrategicMemorySaveToolPropagatesRouterErrors(t *testing.T) {
	wantErr := errors.New("engram unavailable")
	tool := NewStrategicMemorySaveTool(&fakeStrategicMemoryRouter{err: wantErr})

	result := tool.Execute(context.Background(), map[string]any{
		"title":   "Decision",
		"type":    "decision",
		"content": "**What**: Keep memory scoped.",
	})

	if !result.IsError {
		t.Fatal("expected router error")
	}
	if !errors.Is(result.Err, wantErr) {
		t.Fatalf("Err = %v, want %v", result.Err, wantErr)
	}
}
