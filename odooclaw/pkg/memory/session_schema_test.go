package memory

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSessionMemoryStore(t *testing.T) {
	dir := t.TempDir()
	memDir := filepath.Join(dir, "memory")
	store := NewSessionMemoryStore(memDir)

	// Load of non-existent key -> nil, no error
	mem, err := store.Load("telegram:123")
	if err != nil {
		t.Fatalf("Load missing: %v", err)
	}
	if mem != nil {
		t.Fatalf("expected nil for missing key, got %+v", mem)
	}

	// Touch creates and increments
	if err := store.Touch("telegram:123"); err != nil {
		t.Fatalf("Touch: %v", err)
	}
	if err := store.Touch("telegram:123"); err != nil {
		t.Fatalf("Touch 2: %v", err)
	}
	mem, err = store.Load("telegram:123")
	if err != nil || mem == nil {
		t.Fatalf("Load after touch: %v", err)
	}
	if mem.MessageCount != 2 {
		t.Fatalf("MessageCount = %d, want 2", mem.MessageCount)
	}

	// UpdateField: scalar fields
	if err := store.UpdateField("telegram:123", "current_company", float64(10)); err != nil {
		t.Fatalf("Update company: %v", err)
	}
	if err := store.UpdateField("telegram:123", "current_partner", float64(42)); err != nil {
		t.Fatalf("Update partner: %v", err)
	}
	if err := store.UpdateField("telegram:123", "current_module", "sale"); err != nil {
		t.Fatalf("Update module: %v", err)
	}

	// UpdateField: current_document
	doc := map[string]any{"model": "sale.order", "res_id": float64(123), "action": "review"}
	if err := store.UpdateField("telegram:123", "current_document", doc); err != nil {
		t.Fatalf("Update doc: %v", err)
	}

	// UpdateField: pending confirmation
	pending := map[string]any{"tool": "sale_order_confirm", "args": map[string]any{"order_id": float64(123)}, "reason": "user requested"}
	if err := store.UpdateField("telegram:123", "pending_confirmation", pending); err != nil {
		t.Fatalf("Update pending: %v", err)
	}

	// Reload and verify full state
	mem, err = store.Load("telegram:123")
	if err != nil || mem == nil {
		t.Fatalf("Reload: %v", err)
	}
	if mem.CurrentCompany != 10 || mem.CurrentPartner != 42 || mem.CurrentModule != "sale" {
		t.Fatalf("scalars wrong: %+v", mem)
	}
	if mem.CurrentDocument == nil || mem.CurrentDocument.Model != "sale.order" ||
		mem.CurrentDocument.ResID != 123 || mem.CurrentDocument.Action != "review" {
		t.Fatalf("document wrong: %+v", mem.CurrentDocument)
	}
	if len(mem.PendingConfirm) != 1 || mem.PendingConfirm[0].Tool != "sale_order_confirm" {
		t.Fatalf("pending wrong: %+v", mem.PendingConfirm)
	}

	// Summary contains key info
	summary := store.GetSessionSummary("telegram:123")
	if summary == "" {
		t.Fatal("summary empty, want content")
	}
	for _, want := range []string{"company: 10", "partner: 42", "sale.order/123", "sale", "sale_order_confirm"} {
		if !contains(summary, want) {
			t.Fatalf("summary missing %q: %s", want, summary)
		}
	}

	// Clear pending
	if err := store.ClearPendingConfirmations("telegram:123"); err != nil {
		t.Fatalf("Clear pending: %v", err)
	}
	mem, _ = store.Load("telegram:123")
	if len(mem.PendingConfirm) != 0 {
		t.Fatalf("pending not cleared: %+v", mem.PendingConfirm)
	}
}

func TestSessionMemorySummaryEmpty(t *testing.T) {
	store := NewSessionMemoryStore(t.TempDir())
	if got := store.GetSessionSummary("fresh:key"); got != "" {
		t.Fatalf("expected empty summary for fresh key, got %q", got)
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 || indexOf(s, sub) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

var _ = os.Args // keep os import if unused in future edits
