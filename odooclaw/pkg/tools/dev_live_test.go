package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"
)

// TestDevLive exercises the real OdooClaw Evolution API against the preview
// instance. It is skipped unless DEV_LIVE_URL and DEV_LIVE_TOKEN are set.
// The write part is a real propose -> apply -> diff -> rollback of a unique
// manual field, so the preview is left exactly as it was found.
func TestDevLive(t *testing.T) {
	base := strings.TrimSpace(os.Getenv("DEV_LIVE_URL"))
	token := strings.TrimSpace(os.Getenv("DEV_LIVE_TOKEN"))
	if base == "" || token == "" {
		t.Skip("set DEV_LIVE_URL and DEV_LIVE_TOKEN to run against a live Odoo")
	}
	client := NewDevClient(base, token)
	ctx := context.Background()

	contextResult := NewDevGetContextTool(client).Execute(ctx, map[string]any{
		"model": "sale.order", "res_id": 21,
	})
	if contextResult.IsError {
		t.Fatalf("dev_get_context: %s", contextResult.ForLLM)
	}
	for _, want := range []string{"sale.order", "978", "sale_total", "x_margin_preview", "tax_totals"} {
		if !strings.Contains(contextResult.ForLLM, want) {
			t.Fatalf("dev_get_context missing %q:\n%s", want, contextResult.ForLLM)
		}
	}
	t.Logf("dev_get_context:\n%s", contextResult.ForLLM)

	subtree := NewDevInspectViewTool(client).Execute(ctx, map[string]any{
		"model": "sale.order", "anchor": "sale_total",
	})
	if subtree.IsError {
		t.Fatalf("dev_inspect_view: %s", subtree.ForLLM)
	}
	if !strings.Contains(subtree.ForLLM, "tax_totals") {
		t.Fatalf("dev_inspect_view has no tax_totals:\n%s", subtree.ForLLM)
	}
	t.Logf("dev_inspect_view(sale_total):\n%s", subtree.ForLLM)

	fields := NewDevGetFieldsTool(client).Execute(ctx, map[string]any{
		"model": "sale.order", "filter": "margin",
	})
	if fields.IsError {
		t.Fatalf("dev_get_fields: %s", fields.ForLLM)
	}
	if !strings.Contains(fields.ForLLM, "x_margin_preview") {
		t.Fatalf("dev_get_fields missing x_margin_preview:\n%s", fields.ForLLM)
	}
	t.Logf("dev_get_fields(margin):\n%s", fields.ForLLM)

	unique := fmt.Sprintf("x_margin_f7_%d", time.Now().Unix())
	propose := NewDevProposeChangeTool(client).Execute(ctx, map[string]any{
		"name":         "F7 margin field",
		"request_text": "Añade un campo de margen después del total",
		"kind":         "field",
		"level":        "n1",
		"target_model": "sale.order",
		"payload": map[string]any{
			"model":             "sale.order",
			"name":              unique,
			"ttype":             "float",
			"field_description": "Margen F7",
		},
	})
	if propose.IsError {
		t.Fatalf("dev_propose_change: %s", propose.ForLLM)
	}
	t.Logf("dev_propose_change:\n%s", propose.ForLLM)

	var proposal struct {
		ChangeID int `json:"change_id"`
	}
	if err := json.Unmarshal([]byte(propose.ForLLM), &proposal); err != nil {
		t.Fatalf("propose result is not JSON: %v\n%s", err, propose.ForLLM)
	}
	if proposal.ChangeID <= 0 {
		t.Fatalf("propose returned no change_id:\n%s", propose.ForLLM)
	}

	apply := NewDevApplyChangeTool(client).Execute(ctx, map[string]any{
		"change_id": proposal.ChangeID,
	})
	if apply.IsError {
		t.Fatalf("dev_apply_change: %s", apply.ForLLM)
	}
	if !strings.Contains(apply.ForLLM, "applied") {
		t.Fatalf("dev_apply_change did not apply:\n%s", apply.ForLLM)
	}
	t.Logf("dev_apply_change:\n%s", apply.ForLLM)

	after := NewDevGetFieldsTool(client).Execute(ctx, map[string]any{
		"model": "sale.order", "filter": unique,
	})
	if after.IsError {
		t.Fatalf("dev_get_fields after apply: %s", after.ForLLM)
	}
	if !strings.Contains(after.ForLLM, unique+" (") {
		t.Fatalf("field %s not found after apply:\n%s", unique, after.ForLLM)
	}
	t.Logf("field after apply:\n%s", after.ForLLM)

	diff := NewDevDiffTool(client).Execute(ctx, map[string]any{
		"change_id": proposal.ChangeID,
	})
	if diff.IsError {
		t.Fatalf("dev_diff: %s", diff.ForLLM)
	}
	if !strings.Contains(diff.ForLLM, "proposal:") || !strings.Contains(diff.ForLLM, "applied:") {
		t.Fatalf("dev_diff missing proposal/applied:\n%s", diff.ForLLM)
	}
	t.Logf("dev_diff:\n%s", diff.ForLLM)

	rollback := NewDevRollbackTool(client).Execute(ctx, map[string]any{
		"change_id": proposal.ChangeID,
	})
	if rollback.IsError {
		t.Fatalf("dev_rollback: %s", rollback.ForLLM)
	}
	if !strings.Contains(rollback.ForLLM, "rolled_back") {
		t.Fatalf("dev_rollback did not roll back:\n%s", rollback.ForLLM)
	}
	t.Logf("dev_rollback:\n%s", rollback.ForLLM)

	gone := NewDevGetFieldsTool(client).Execute(ctx, map[string]any{
		"model": "sale.order", "filter": unique,
	})
	if gone.IsError {
		t.Fatalf("dev_get_fields after rollback: %s", gone.ForLLM)
	}
	if strings.Contains(gone.ForLLM, unique+" (") {
		t.Fatalf("field %s still exists after rollback:\n%s", unique, gone.ForLLM)
	}
	t.Logf("field after rollback:\n%s", gone.ForLLM)

	remaining := NewDevGetFieldsTool(client).Execute(ctx, map[string]any{
		"model": "sale.order", "filter": "x_margin_preview",
	})
	if remaining.IsError {
		t.Fatalf("dev_get_fields preview: %s", remaining.ForLLM)
	}
	if !strings.Contains(remaining.ForLLM, "x_margin_preview") {
		t.Fatalf("preview field disappeared:\n%s", remaining.ForLLM)
	}
	t.Logf("preview field untouched:\n%s", remaining.ForLLM)
}
