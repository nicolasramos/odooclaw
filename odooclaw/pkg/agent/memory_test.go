package agent

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	corememory "github.com/nicolasramos/odooclaw/pkg/memory"

	_ "modernc.org/sqlite"
)

func TestMemoryStoreGetMemoryContextUsesSQLiteIndex(t *testing.T) {
	tmpDir := setupWorkspace(t, map[string]string{
		"memory/MEMORY.md": "# Memory\n\nUser prefers concise updates.",
	})
	defer os.RemoveAll(tmpDir)

	today := time.Now().Format("20060102")
	todayPath := filepath.Join(tmpDir, "memory", today[:6], today+".md")
	if err := os.MkdirAll(filepath.Dir(todayPath), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(todayPath, []byte("# Today\n\nReviewed Doodba memory design."), 0o644); err != nil {
		t.Fatal(err)
	}

	store := NewMemoryStore(tmpDir)
	context := store.GetMemoryContext()

	if !strings.Contains(context, "User prefers concise updates") {
		t.Fatal("expected long-term memory in context")
	}
	if !strings.Contains(context, "Reviewed Doodba memory design") {
		t.Fatal("expected daily note in context")
	}

	dbPath := store.SQLitePath()
	if dbPath == "" {
		t.Fatal("expected sqlite path to be available")
	}
	if _, err := os.Stat(dbPath); err != nil {
		t.Fatalf("expected sqlite db to exist: %v", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM documents`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count < 2 {
		t.Fatalf("expected at least 2 indexed documents, got %d", count)
	}
}

func TestMemoryStoreAppendTodaySyncsSQLite(t *testing.T) {
	tmpDir := setupWorkspace(t, nil)
	defer os.RemoveAll(tmpDir)

	store := NewMemoryStore(tmpDir)
	if err := store.AppendToday("Captured deployment follow-up."); err != nil {
		t.Fatal(err)
	}

	db, err := sql.Open("sqlite", store.SQLitePath())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM documents WHERE collection = 'daily_note'`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("expected one indexed daily note, got %d", count)
	}

	context := store.GetMemoryContext()
	if !strings.Contains(context, "Captured deployment follow-up") {
		t.Fatal("expected appended note in memory context")
	}
}

func TestMemoryStoreGetRelevantContextFallsBackToHistorical(t *testing.T) {
	tmpDir := setupWorkspace(t, nil)
	defer os.RemoveAll(tmpDir)

	store := NewMemoryStore(tmpDir)
	if _, err := store.historical.Save(corememory.HistoricalSaveInput{
		Content: "Customer requested fiscal position reminder for next billing cycle.",
		Source:  "memory_save",
		Channel: "odoo",
		ChatID:  "res.partner_42",
		Metadata: map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	}); err != nil {
		t.Fatal(err)
	}

	context := store.GetRelevantContext(PromptMemoryOptions{
		Query:   "fiscal position reminder",
		Channel: "odoo",
		ChatID:  "res.partner_42",
		Metadata: map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	})

	if !strings.Contains(context, "## Historical Memory Recall") {
		t.Fatal("expected historical memory fallback section")
	}
	if !strings.Contains(context, "fiscal position reminder") {
		t.Fatal("expected historical memory content in relevant context")
	}
}

func TestMemoryStoreGetRelevantContextAugmentsHotWithHistorical(t *testing.T) {
	tmpDir := setupWorkspace(t, map[string]string{
		"memory/scopes/odoo/sender-18.md": "Customer 18 prefers concise deployment updates.",
	})
	defer os.RemoveAll(tmpDir)

	store := NewMemoryStore(tmpDir)
	if _, err := store.historical.Save(corememory.HistoricalSaveInput{
		Content:  "Historical note: customer 18 requested monthly summary on deployments.",
		Source:   "memory_save",
		Channel:  "odoo",
		SenderID: "18",
	}); err != nil {
		t.Fatal(err)
	}

	context := store.GetRelevantContext(PromptMemoryOptions{
		Query:    "deployment updates summary",
		Channel:  "odoo",
		SenderID: "18",
	})

	if !strings.Contains(context, "## Relevant Memory Recall") {
		t.Fatal("expected hot memory relevant section")
	}
	if !strings.Contains(context, "## Historical Memory Recall") {
		t.Fatal("expected historical augmentation section")
	}
	if !strings.Contains(context, "prefers concise deployment updates") {
		t.Fatal("expected hot memory content in relevant context")
	}
	if !strings.Contains(context, "requested monthly summary") {
		t.Fatal("expected historical memory content in relevant context")
	}
}
