package memory

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSearchContextPrioritizesMatchingOdooScope(t *testing.T) {
	memoryDir := t.TempDir()
	writeMemoryFile(t, filepath.Join(memoryDir, "MEMORY.md"), "# Memory\n\nGlobal reminder about invoices.")
	writeMemoryFile(t, filepath.Join(memoryDir, "scopes", "odoo", "company-7", "entity-res.partner-42.md"), "Partner 42 requested invoice consolidation and Friday follow-up.")
	writeMemoryFile(t, filepath.Join(memoryDir, "scopes", "odoo", "company-9", "entity-res.partner-99.md"), "Partner 99 requested invoice consolidation but belongs to another company.")

	store := NewStore(memoryDir)
	results, err := store.SearchContext(SearchOptions{
		Query:   "invoice consolidation follow-up",
		Limit:   2,
		Channel: "odoo",
		ChatID:  "res.partner_42",
		Metadata: map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(results) == 0 {
		t.Fatal("expected search results")
	}
	if !strings.Contains(filepath.ToSlash(results[0].Path), "scopes/odoo/company-7/entity-res.partner-42.md") {
		t.Fatalf("expected matching scoped result first, got %s", results[0].Path)
	}
	for _, result := range results {
		if strings.Contains(filepath.ToSlash(result.Path), "company-9/entity-res.partner-99.md") {
			t.Fatalf("unexpected cross-scope leak in results: %s", result.Path)
		}
	}
}

func TestBuildRelevantContextFormatsScopedResults(t *testing.T) {
	memoryDir := t.TempDir()
	writeMemoryFile(t, filepath.Join(memoryDir, "scopes", "odoo", "sender-18.md"), "Customer 18 prefers concise deployment updates and asks for status every morning.")

	store := NewStore(memoryDir)
	context, err := store.BuildRelevantContext(SearchOptions{
		Query:    "concise deployment updates",
		Limit:    3,
		Channel:  "odoo",
		SenderID: "18",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(context, "## Relevant Memory Recall") {
		t.Fatal("expected relevant memory section")
	}
	if !strings.Contains(context, "sender-18.md") {
		t.Fatal("expected scoped filename in relevant memory section")
	}
	if !strings.Contains(context, "prefers concise deployment updates") {
		t.Fatal("expected scoped content in relevant memory section")
	}
}

func writeMemoryFile(t *testing.T, path string, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}
