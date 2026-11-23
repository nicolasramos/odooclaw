package tools

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestKnowledgeSearchFormatsHitsWithLinks(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true,
			"results": []map[string]any{
				{
					"id":          3,
					"name":        "Vacaciones",
					"snippet":     "Los empleados tienen 23 dias laborables.",
					"backend_url": "/web#id=3&model=document.page&view_type=form",
					"updated":     "2026-11-01T10:00:00",
				},
			},
		})
	}))
	defer srv.Close()
	tool := NewKnowledgeSearchTool(srv.URL, "")
	res := tool.Execute(context.Background(), map[string]any{"query": "vacaciones"})
	if res.IsError {
		t.Fatalf("unexpected error: %s", res.ForLLM)
	}
	for _, want := range []string{"Vacaciones", "23 dias", "/web#id=3", "Updated"} {
		if !strings.Contains(res.ForLLM, want) {
			t.Fatalf("result is missing %q:\n%s", want, res.ForLLM)
		}
	}
}

func TestKnowledgeSearchNoResultsSaysSo(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "results": []any{}})
	}))
	defer srv.Close()
	tool := NewKnowledgeSearchTool(srv.URL, "")
	res := tool.Execute(context.Background(), map[string]any{"query": "jubilacion"})
	if res.IsError {
		t.Fatalf("no results is not an error: %s", res.ForLLM)
	}
	if !strings.Contains(res.ForLLM, "No knowledge page matches") {
		t.Fatalf("the model must be told there is nothing, got %q", res.ForLLM)
	}
}

func TestKnowledgeSearchRequiresQuery(t *testing.T) {
	tool := NewKnowledgeSearchTool("http://unused", "")
	if res := tool.Execute(context.Background(), map[string]any{}); !res.IsError {
		t.Fatal("query is required")
	}
}
