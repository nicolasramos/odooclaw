package memory

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestHistoricalStoreSaveAndSearchScoped(t *testing.T) {
	memoryDir := t.TempDir()
	store := NewHistoricalStore(memoryDir)

	if _, err := os.Stat(store.DBPath()); err != nil {
		t.Fatalf("expected historical db to exist: %v", err)
	}

	if _, err := store.Save(HistoricalSaveInput{
		Content: "Partner 42 requested invoice consolidation and Friday follow-up.",
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

	if _, err := store.Save(HistoricalSaveInput{
		Content: "Partner 99 requested invoice consolidation but belongs to another company.",
		Source:  "memory_save",
		Channel: "odoo",
		ChatID:  "res.partner_99",
		Metadata: map[string]string{
			"company_id": "9",
			"model":      "res.partner",
			"res_id":     "99",
		},
	}); err != nil {
		t.Fatal(err)
	}

	results, err := store.SearchContext(SearchOptions{
		Query:   "invoice consolidation follow-up",
		Limit:   3,
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
		t.Fatal("expected scoped historical search results")
	}
	if !strings.Contains(results[0].Path, "company-7/entity-res.partner-42.md") {
		t.Fatalf("expected matching scope first, got %s", results[0].Path)
	}

	for _, result := range results {
		if strings.Contains(result.Path, "company-9/entity-res.partner-99.md") {
			t.Fatalf("unexpected cross-scope leak in historical results: %s", result.Path)
		}
	}
}

func TestHistoricalStoreSearchStrictlyFiltersMismatchedScopedResults(t *testing.T) {
	memoryDir := t.TempDir()
	store := NewHistoricalStore(memoryDir)

	if _, err := store.Save(HistoricalSaveInput{
		Content: "Company 9 confidential escalation details.",
		Source:  "memory_save",
		Channel: "odoo",
		Metadata: map[string]string{
			"company_id": "9",
			"model":      "res.partner",
			"res_id":     "99",
		},
	}); err != nil {
		t.Fatal(err)
	}

	results, err := store.SearchContext(SearchOptions{
		Query:   "confidential escalation",
		Limit:   3,
		Channel: "odoo",
		Metadata: map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 0 {
		t.Fatalf("expected no results due to strict scope filtering, got %d", len(results))
	}
}

func TestHistoricalStoreSaveFactDedupesAndQueriesScoped(t *testing.T) {
	store := NewHistoricalStore(t.TempDir())
	input := HistoricalFactInput{
		Subject:   "partner:42",
		Predicate: "prefers_language",
		Object:    "es_MX",
		Source:    "memory_add_fact",
		Channel:   "odoo",
		ChatID:    "res.partner_42",
		Metadata: map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	}

	first, err := store.SaveFact(input)
	if err != nil {
		t.Fatalf("first save fact failed: %v", err)
	}
	if first.Deduped {
		t.Fatal("first fact save should not be deduped")
	}

	second, err := store.SaveFact(input)
	if err != nil {
		t.Fatalf("second save fact failed: %v", err)
	}
	if !second.Deduped {
		t.Fatal("second identical fact should be deduped")
	}
	if first.FactID != second.FactID {
		t.Fatalf("expected deduped fact id %d, got %d", first.FactID, second.FactID)
	}

	facts, err := store.QueryFacts(FactQueryOptions{
		Query:   "prefers language",
		Limit:   5,
		Channel: "odoo",
		ChatID:  "res.partner_42",
		Metadata: map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	})
	if err != nil {
		t.Fatalf("query facts failed: %v", err)
	}
	if len(facts) != 1 {
		t.Fatalf("expected one scoped fact, got %d", len(facts))
	}
	if facts[0].Object != "es_MX" {
		t.Fatalf("expected fact object es_MX, got %s", facts[0].Object)
	}
}

func TestHistoricalStoreTimelineIncludesEntriesAndFacts(t *testing.T) {
	store := NewHistoricalStore(t.TempDir())

	if _, err := store.Save(HistoricalSaveInput{
		Content: "Partner 42 asked for Friday updates.",
		Source:  "memory_save",
		Channel: "odoo",
		ChatID:  "res.partner_42",
		Metadata: map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	}); err != nil {
		t.Fatalf("save timeline entry failed: %v", err)
	}

	if _, err := store.SaveFact(HistoricalFactInput{
		Subject:   "partner:42",
		Predicate: "prefers_contact_day",
		Object:    "friday",
		Source:    "memory_add_fact",
		Channel:   "odoo",
		ChatID:    "res.partner_42",
		Metadata: map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	}); err != nil {
		t.Fatalf("save timeline fact failed: %v", err)
	}

	timeline, err := store.GetTimeline(TimelineOptions{
		Limit:    10,
		FromUnix: time.Now().Add(-1 * time.Hour).Unix(),
		Channel:  "odoo",
		ChatID:   "res.partner_42",
		Metadata: map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	})
	if err != nil {
		t.Fatalf("get timeline failed: %v", err)
	}
	if len(timeline) < 2 {
		t.Fatalf("expected at least 2 timeline events, got %d", len(timeline))
	}

	seenEntry := false
	seenFact := false
	for _, event := range timeline {
		if event.Type == "entry" {
			seenEntry = true
		}
		if event.Type == "fact" {
			seenFact = true
		}
	}
	if !seenEntry || !seenFact {
		t.Fatalf("expected entry and fact events, got %#v", timeline)
	}
}

func TestHistoricalStoreImportFromMarkdownPersistsScopedAndDedupes(t *testing.T) {
	memoryDir := t.TempDir()

	if err := os.WriteFile(filepath.Join(memoryDir, "MEMORY.md"), []byte("Long-term: customer requires invoices in PDF."), 0o644); err != nil {
		t.Fatalf("write MEMORY.md: %v", err)
	}

	dailyDir := filepath.Join(memoryDir, "202604")
	if err := os.MkdirAll(dailyDir, 0o755); err != nil {
		t.Fatalf("mkdir daily dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dailyDir, "20260408.md"), []byte("Daily note: partner requested friday sync."), 0o644); err != nil {
		t.Fatalf("write daily note: %v", err)
	}

	scopedDir := filepath.Join(memoryDir, "scopes", "odoo", "company-7")
	if err := os.MkdirAll(scopedDir, 0o755); err != nil {
		t.Fatalf("mkdir scoped dir: %v", err)
	}
	scopedPath := filepath.Join(scopedDir, "entity-res.partner-42.md")
	if err := os.WriteFile(scopedPath, []byte("Scoped note: partner 42 prefers concise updates."), 0o644); err != nil {
		t.Fatalf("write scoped note: %v", err)
	}

	store := NewHistoricalStore(memoryDir)
	first, err := store.ImportFromMarkdown(HistoricalImportOptions{DryRun: false})
	if err != nil {
		t.Fatalf("first import failed: %v", err)
	}
	if first.Imported < 3 {
		t.Fatalf("expected >=3 imported entries, got %#v", first)
	}

	second, err := store.ImportFromMarkdown(HistoricalImportOptions{DryRun: false})
	if err != nil {
		t.Fatalf("second import failed: %v", err)
	}
	if second.Deduped < 3 {
		t.Fatalf("expected dedupe on second import, got %#v", second)
	}

	results, err := store.SearchContext(SearchOptions{
		Query:   "concise updates",
		Limit:   3,
		Channel: "odoo",
		ChatID:  "res.partner_42",
		Metadata: map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	})
	if err != nil {
		t.Fatalf("search after import failed: %v", err)
	}
	if len(results) == 0 {
		t.Fatal("expected scoped imported results")
	}
	if !strings.Contains(results[0].Path, "historical/scopes/odoo/company-7/entity-res.partner-42.md") {
		t.Fatalf("expected scoped imported path, got %s", results[0].Path)
	}
}

func TestHistoricalStoreSearchContextPrefersRecentHistoricalEntries(t *testing.T) {
	store := NewHistoricalStore(t.TempDir())
	input := HistoricalSaveInput{
		Source:  "memory_save",
		Channel: "odoo",
		ChatID:  "res.partner_42",
		Metadata: map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	}

	input.Content = "Partner 42 update cadence monthly for billing review. (older)"
	if _, err := store.Save(input); err != nil {
		t.Fatalf("save older entry: %v", err)
	}

	time.Sleep(1 * time.Second)

	input.Content = "Partner 42 update cadence monthly for billing review. (newer)"
	if _, err := store.Save(input); err != nil {
		t.Fatalf("save newer entry: %v", err)
	}

	results, err := store.SearchContext(SearchOptions{
		Query:   "update cadence monthly billing",
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
		t.Fatalf("search historical entries: %v", err)
	}
	if len(results) < 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	if !strings.Contains(results[0].Content, "(newer)") {
		t.Fatalf("expected newer entry ranked first, got %q", results[0].Content)
	}
}
