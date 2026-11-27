package tools

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestArtifactCreatePostsAndReportsTheID(t *testing.T) {
	var got map[string]any
	var token string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token = r.Header.Get("X-OdooClaw-Token")
		_ = json.NewDecoder(r.Body).Decode(&got)
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "id": 42})
	}))
	defer srv.Close()

	tool := NewArtifactCreateTool(srv.URL, "secret")
	res := tool.Execute(context.Background(), map[string]any{
		"name":          "Q3 summary",
		"content":       "<p>Revenue grew 12%.</p>",
		"artifact_type": "document",
		"user_id":       float64(7),
	})
	if res.IsError {
		t.Fatalf("unexpected error: %s", res.ForLLM)
	}
	if token != "secret" {
		t.Fatalf("token not sent, got %q", token)
	}
	if got["name"] != "Q3 summary" {
		t.Fatalf("name mangled: %+v", got)
	}
	if got["user_id"] != float64(7) {
		t.Fatalf("user_id mangled: %+v", got)
	}
	if !strings.Contains(res.ForLLM, "42") {
		t.Fatalf("the id must be reported back, got %q", res.ForLLM)
	}
}

func TestArtifactCreateRequiresNameAndContent(t *testing.T) {
	tool := NewArtifactCreateTool("http://unused", "")
	if res := tool.Execute(context.Background(), map[string]any{"name": "Only a name"}); !res.IsError {
		t.Fatal("content is required")
	}
	if res := tool.Execute(context.Background(), map[string]any{"content": "<p>x</p>"}); !res.IsError {
		t.Fatal("name is required")
	}
}

func TestArtifactCreateReportsRefusal(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "nope", http.StatusBadRequest)
	}))
	defer srv.Close()
	tool := NewArtifactCreateTool(srv.URL, "")
	res := tool.Execute(context.Background(), map[string]any{
		"name": "x", "content": "<p>y</p>",
	})
	if !res.IsError {
		t.Fatal("a refusal must be an error result")
	}
	if !strings.Contains(res.ForLLM, "400") {
		t.Fatalf("the status must be reported, got %q", res.ForLLM)
	}
}
