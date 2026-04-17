package tools

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestMemorySaveToolAndSearchToolScopedFlow(t *testing.T) {
	workspace := t.TempDir()
	saveTool := NewMemorySaveTool(workspace)
	searchTool := NewMemorySearchTool(workspace)

	metadata := map[string]string{
		"company_id": "7",
		"model":      "res.partner",
		"res_id":     "42",
	}
	saveTool.SetMessageContext("odoo", "res.partner_42", "18", metadata)
	searchTool.SetMessageContext("odoo", "res.partner_42", "18", metadata)

	saveResult := saveTool.Execute(context.Background(), map[string]any{
		"content": "Customer prefers concise deployment updates every Friday.",
		"source":  "memory_save_decision",
	})
	if saveResult.IsError {
		t.Fatalf("expected save success, got error: %s", saveResult.ForLLM)
	}
	if !strings.Contains(saveResult.ForLLM, "Historical memory saved") {
		t.Fatalf("expected save confirmation, got: %s", saveResult.ForLLM)
	}

	searchResult := searchTool.Execute(context.Background(), map[string]any{
		"query": "concise deployment updates",
	})
	if searchResult.IsError {
		t.Fatalf("expected search success, got error: %s", searchResult.ForLLM)
	}
	if !strings.Contains(searchResult.ForLLM, "## Historical Memory Recall") {
		t.Fatalf("expected historical heading, got: %s", searchResult.ForLLM)
	}
	if !strings.Contains(searchResult.ForLLM, "concise deployment updates") {
		t.Fatalf("expected saved content in search result, got: %s", searchResult.ForLLM)
	}
}

func TestMemorySearchToolRejectsUnscopedContext(t *testing.T) {
	tool := NewMemorySearchTool(t.TempDir())

	result := tool.Execute(context.Background(), map[string]any{
		"query": "invoice",
	})
	if !result.IsError {
		t.Fatal("expected error when context is unscoped")
	}
	if !strings.Contains(result.ForLLM, "scoped context required") {
		t.Fatalf("expected scope validation error, got: %s", result.ForLLM)
	}
}

func TestMemorySearchToolPreventsCrossScopeLeak(t *testing.T) {
	workspace := t.TempDir()
	saveTool := NewMemorySaveTool(workspace)
	searchTool := NewMemorySearchTool(workspace)

	saveTool.SetMessageContext("odoo", "res.partner_99", "99", map[string]string{
		"company_id": "9",
		"model":      "res.partner",
		"res_id":     "99",
	})

	saved := saveTool.Execute(context.Background(), map[string]any{
		"content": "Company 9 confidential escalation details.",
	})
	if saved.IsError {
		t.Fatalf("unexpected save error: %s", saved.ForLLM)
	}

	searchTool.SetMessageContext("odoo", "res.partner_42", "18", map[string]string{
		"company_id": "7",
		"model":      "res.partner",
		"res_id":     "42",
	})

	result := searchTool.Execute(context.Background(), map[string]any{
		"query": "confidential escalation",
	})
	if result.IsError {
		t.Fatalf("unexpected search error: %s", result.ForLLM)
	}
	if !strings.Contains(result.ForLLM, "No historical memory found for current scope") {
		t.Fatalf("expected no-results scoped response, got: %s", result.ForLLM)
	}
}

func TestMemorySaveDecisionToolReturnsStructuredDecision(t *testing.T) {
	tool := NewMemorySaveDecisionTool()
	tool.SetMessageContext("odoo", "res.partner_42", "18", map[string]string{
		"company_id": "7",
		"model":      "res.partner",
		"res_id":     "42",
	})

	result := tool.Execute(context.Background(), map[string]any{
		"content": "Customer prefers concise weekly deployment summaries for billing follow-up.",
	})
	if result.IsError {
		t.Fatalf("unexpected decision error: %s", result.ForLLM)
	}

	var payload map[string]any
	if err := json.Unmarshal([]byte(result.ForLLM), &payload); err != nil {
		t.Fatalf("expected JSON payload, got parse error: %v", err)
	}

	shouldSave, ok := payload["should_save"].(bool)
	if !ok {
		t.Fatalf("expected should_save boolean, got %#v", payload["should_save"])
	}
	if !shouldSave {
		t.Fatalf("expected should_save=true, payload=%v", payload)
	}
}

func TestMemoryAddFactAndQueryFactsTools(t *testing.T) {
	workspace := t.TempDir()
	addTool := NewMemoryAddFactTool(workspace)
	queryTool := NewMemoryQueryFactsTool(workspace)

	meta := map[string]string{
		"company_id": "7",
		"model":      "res.partner",
		"res_id":     "42",
	}
	addTool.SetMessageContext("odoo", "res.partner_42", "18", meta)
	queryTool.SetMessageContext("odoo", "res.partner_42", "18", meta)

	first := addTool.Execute(context.Background(), map[string]any{
		"subject":    "partner:42",
		"predicate":  "prefers_timezone",
		"object":     "Europe/Madrid",
		"confidence": 0.9,
	})
	if first.IsError {
		t.Fatalf("expected add fact success, got error: %s", first.ForLLM)
	}

	second := addTool.Execute(context.Background(), map[string]any{
		"subject":    "partner:42",
		"predicate":  "prefers_timezone",
		"object":     "Europe/Madrid",
		"confidence": 0.9,
	})
	if second.IsError {
		t.Fatalf("expected deduped add fact success, got error: %s", second.ForLLM)
	}

	var secondPayload map[string]any
	if err := json.Unmarshal([]byte(second.ForLLM), &secondPayload); err != nil {
		t.Fatalf("parse second add fact payload: %v", err)
	}
	if deduped, _ := secondPayload["deduped"].(bool); !deduped {
		t.Fatalf("expected deduped=true, payload=%v", secondPayload)
	}

	query := queryTool.Execute(context.Background(), map[string]any{
		"query": "timezone",
		"limit": 5,
	})
	if query.IsError {
		t.Fatalf("expected query facts success, got error: %s", query.ForLLM)
	}

	var queryPayload map[string]any
	if err := json.Unmarshal([]byte(query.ForLLM), &queryPayload); err != nil {
		t.Fatalf("parse query facts payload: %v", err)
	}
	facts, ok := queryPayload["facts"].([]any)
	if !ok || len(facts) == 0 {
		t.Fatalf("expected facts in query payload, got %v", queryPayload)
	}
}

func TestMemoryGetTimelineAndDebugExplainTools(t *testing.T) {
	workspace := t.TempDir()
	memoryDir := filepath.Join(workspace, "memory")
	if err := os.MkdirAll(filepath.Join(memoryDir, "scopes", "odoo", "company-7"), 0o755); err != nil {
		t.Fatalf("mkdir memory scope: %v", err)
	}
	hotPath := filepath.Join(memoryDir, "scopes", "odoo", "company-7", "entity-res.partner-42.md")
	hotContent := "Partner 42 prefers concise updates and timezone Europe/Madrid."
	if err := os.WriteFile(hotPath, []byte(hotContent), 0o644); err != nil {
		t.Fatalf("write hot memory file: %v", err)
	}

	saveTool := NewMemorySaveTool(workspace)
	factTool := NewMemoryAddFactTool(workspace)
	timelineTool := NewMemoryGetTimelineTool(workspace)
	debugTool := NewMemoryDebugExplainRetrievalTool(workspace)

	meta := map[string]string{
		"company_id": "7",
		"model":      "res.partner",
		"res_id":     "42",
	}
	saveTool.SetMessageContext("odoo", "res.partner_42", "18", meta)
	factTool.SetMessageContext("odoo", "res.partner_42", "18", meta)
	timelineTool.SetMessageContext("odoo", "res.partner_42", "18", meta)
	debugTool.SetMessageContext("odoo", "res.partner_42", "18", meta)

	if result := saveTool.Execute(context.Background(), map[string]any{
		"content": "Partner 42 requested weekly Friday reminder.",
	}); result.IsError {
		t.Fatalf("save historical entry failed: %s", result.ForLLM)
	}

	if result := factTool.Execute(context.Background(), map[string]any{
		"subject":   "partner:42",
		"predicate": "prefers_contact_day",
		"object":    "friday",
	}); result.IsError {
		t.Fatalf("add fact failed: %s", result.ForLLM)
	}

	timeline := timelineTool.Execute(context.Background(), map[string]any{"limit": 10})
	if timeline.IsError {
		t.Fatalf("timeline failed: %s", timeline.ForLLM)
	}
	var timelinePayload map[string]any
	if err := json.Unmarshal([]byte(timeline.ForLLM), &timelinePayload); err != nil {
		t.Fatalf("parse timeline payload: %v", err)
	}
	events, ok := timelinePayload["events"].([]any)
	if !ok || len(events) < 2 {
		t.Fatalf("expected at least two timeline events, got %v", timelinePayload)
	}

	explain := debugTool.Execute(context.Background(), map[string]any{
		"query":         "timezone friday updates",
		"include_facts": true,
	})
	if explain.IsError {
		t.Fatalf("debug explain failed: %s", explain.ForLLM)
	}
	var explainPayload map[string]any
	if err := json.Unmarshal([]byte(explain.ForLLM), &explainPayload); err != nil {
		t.Fatalf("parse explain payload: %v", err)
	}
	if _, ok := explainPayload["match_query"].(string); !ok {
		t.Fatalf("expected match_query string, got %v", explainPayload)
	}
	hotResults, ok := explainPayload["hot_results"].([]any)
	if !ok || len(hotResults) == 0 {
		t.Fatalf("expected hot_results, got %v", explainPayload)
	}
}

func TestMemoryImportHistoryToolDryRunAndApply(t *testing.T) {
	workspace := t.TempDir()
	memoryDir := filepath.Join(workspace, "memory")

	if err := os.MkdirAll(memoryDir, 0o755); err != nil {
		t.Fatalf("mkdir memory dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(memoryDir, "MEMORY.md"), []byte("Customer requests monthly invoice summary."), 0o644); err != nil {
		t.Fatalf("write MEMORY.md: %v", err)
	}

	dailyDir := filepath.Join(memoryDir, "202604")
	if err := os.MkdirAll(dailyDir, 0o755); err != nil {
		t.Fatalf("mkdir daily dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dailyDir, "20260408.md"), []byte("Daily reminder: follow up every Friday."), 0o644); err != nil {
		t.Fatalf("write daily note: %v", err)
	}

	scopedDir := filepath.Join(memoryDir, "scopes", "odoo", "company-7")
	if err := os.MkdirAll(scopedDir, 0o755); err != nil {
		t.Fatalf("mkdir scoped dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(scopedDir, "entity-res.partner-42.md"), []byte("Partner 42 prefers concise updates."), 0o644); err != nil {
		t.Fatalf("write scoped note: %v", err)
	}

	importTool := NewMemoryImportHistoryTool(workspace)
	searchTool := NewMemorySearchTool(workspace)
	searchTool.SetMessageContext("odoo", "res.partner_42", "18", map[string]string{
		"company_id": "7",
		"model":      "res.partner",
		"res_id":     "42",
	})

	dryRun := importTool.Execute(context.Background(), map[string]any{
		"dry_run": true,
	})
	if dryRun.IsError {
		t.Fatalf("expected dry run success, got error: %s", dryRun.ForLLM)
	}
	var dryPayload map[string]any
	if err := json.Unmarshal([]byte(dryRun.ForLLM), &dryPayload); err != nil {
		t.Fatalf("parse dry-run payload: %v", err)
	}
	if dry, _ := dryPayload["dry_run"].(bool); !dry {
		t.Fatalf("expected dry_run=true, got %v", dryPayload)
	}

	apply := importTool.Execute(context.Background(), map[string]any{
		"dry_run": false,
		"source":  "memory_import_history",
	})
	if apply.IsError {
		t.Fatalf("expected apply import success, got error: %s", apply.ForLLM)
	}
	var applyPayload map[string]any
	if err := json.Unmarshal([]byte(apply.ForLLM), &applyPayload); err != nil {
		t.Fatalf("parse apply payload: %v", err)
	}
	summary, ok := applyPayload["summary"].(map[string]any)
	if !ok {
		t.Fatalf("expected summary object, got %v", applyPayload)
	}
	if imported, _ := summary["imported"].(float64); imported < 3 {
		t.Fatalf("expected >=3 imported entries, got %v", summary)
	}

	search := searchTool.Execute(context.Background(), map[string]any{
		"query": "concise updates",
	})
	if search.IsError {
		t.Fatalf("search after import failed: %s", search.ForLLM)
	}
	if !strings.Contains(search.ForLLM, "Historical Memory Recall") {
		t.Fatalf("expected historical recall output, got %s", search.ForLLM)
	}
	if !strings.Contains(search.ForLLM, "concise updates") {
		t.Fatalf("expected scoped imported content in recall, got %s", search.ForLLM)
	}

	reimport := importTool.Execute(context.Background(), map[string]any{
		"dry_run": false,
	})
	if reimport.IsError {
		t.Fatalf("reimport failed: %s", reimport.ForLLM)
	}
	var reimportPayload map[string]any
	if err := json.Unmarshal([]byte(reimport.ForLLM), &reimportPayload); err != nil {
		t.Fatalf("parse reimport payload: %v", err)
	}
	reimportSummary, ok := reimportPayload["summary"].(map[string]any)
	if !ok {
		t.Fatalf("expected reimport summary object, got %v", reimportPayload)
	}
	if deduped, _ := reimportSummary["deduped"].(float64); deduped < 3 {
		t.Fatalf("expected deduped entries on reimport, got %v", reimportSummary)
	}
}
