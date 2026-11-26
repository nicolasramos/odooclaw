package tools

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const devTestToken = "test-token"

func newDevTestServer(t *testing.T) (*httptest.Server, *DevClient) {
	t.Helper()
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-OdooClaw-Token") != devTestToken {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"error": "unauthorized"},
			})
			return
		}
		var req struct {
			Params map[string]any `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Errorf("decode request: %v", err)
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		switch r.URL.Path {
		case "/odooclaw_evolution/api/context":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{
					"model":      req.Params["model"],
					"view_type":  "form",
					"view_id":    978,
					"view_xmlid": "sale.view_order_form",
					"arch":       `<form><sheet><group name="sale_total"><field name="tax_totals"/></group><field name="x_margin_preview"/></sheet></form>`,
					"fields": map[string]any{
						"x_margin_preview": map[string]any{"type": "float", "string": "Margen (preview)"},
						"tax_totals":       map[string]any{"type": "json", "string": "Tax Totals", "readonly": true},
						"partner_id":       map[string]any{"type": "many2one", "string": "Customer", "required": true},
					},
					"insert_points": []any{
						map[string]any{"tag": "group", "name": "sale_total", "string": "", "xpath": "/form/sheet/group[1]"},
						map[string]any{"tag": "field", "name": "tax_totals", "string": "", "xpath": "/form/sheet/group[1]/field[1]"},
						map[string]any{"tag": "field", "name": "x_margin_preview", "string": "", "xpath": "/form/sheet/field[1]"},
					},
					"models": map[string]any{},
				},
			})
		case "/odooclaw_evolution/api/fields":
			filter, _ := req.Params["filter"].(string)
			filter = strings.ToLower(filter)
			all := map[string]any{
				"x_margin_preview": map[string]any{"type": "float", "string": "Margen (preview)"},
				"tax_totals":       map[string]any{"type": "json", "string": "Tax Totals", "readonly": true},
				"partner_id":       map[string]any{"type": "many2one", "string": "Customer", "required": true},
			}
			out := map[string]any{}
			for name, info := range all {
				label, _ := info.(map[string]any)["string"].(string)
				if filter != "" && !strings.Contains(strings.ToLower(name), filter) && !strings.Contains(strings.ToLower(label), filter) {
					continue
				}
				out[name] = info
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"result": map[string]any{"model": req.Params["model"], "fields": out, "count": len(out)},
			})
		case "/odooclaw_evolution/api/change":
			action, _ := req.Params["action"].(string)
			switch action {
			case "propose":
				kind, _ := req.Params["kind"].(string)
				payload, _ := req.Params["payload"].(map[string]any)
				if kind == "view" {
					if _, ok := payload["arch"]; !ok {
						_ = json.NewEncoder(w).Encode(map[string]any{
							"result": map[string]any{
								"id": 8, "reference": "EVO-0008", "status": "draft",
								"validation_error": "invalid_payload", "message": "View payload requires model and arch.",
							},
						})
						return
					}
				}
				_ = json.NewEncoder(w).Encode(map[string]any{
					"result": map[string]any{"id": 7, "reference": "EVO-0007", "status": "draft"},
				})
			case "apply":
				_ = json.NewEncoder(w).Encode(map[string]any{
					"result": map[string]any{"id": 7, "status": "applied"},
				})
			case "detail":
				_ = json.NewEncoder(w).Encode(map[string]any{
					"result": map[string]any{
						"id":         7,
						"reference":  "EVO-0007",
						"status":     "applied",
						"payload":    `{"kind":"field","model":"sale.order","name":"x_margin_f7","ttype":"float"}`,
						"snapshot":   `{"kind":"field","field_id":42,"existed":false}`,
						"applied_at": "2026-11-21 22:00:00",
					},
				})
			case "rollback":
				_ = json.NewEncoder(w).Encode(map[string]any{
					"result": map[string]any{"id": 7, "status": "rolled_back"},
				})
			default:
				_ = json.NewEncoder(w).Encode(map[string]any{
					"result": map[string]any{"error": "unknown_action"},
				})
			}
		default:
			http.NotFound(w, r)
		}
	})
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	return srv, NewDevClient(srv.URL, devTestToken)
}

func TestDevGetContext(t *testing.T) {
	_, client := newDevTestServer(t)
	res := NewDevGetContextTool(client).Execute(context.Background(), map[string]any{
		"model": "sale.order", "res_id": 21,
	})
	if res.IsError {
		t.Fatalf("unexpected error: %s", res.ForLLM)
	}
	for _, want := range []string{"sale.order", "978", "sale_total", "x_margin_preview", "tax_totals", "insert_point_count"} {
		if !strings.Contains(res.ForLLM, want) {
			t.Errorf("context result missing %q:\n%s", want, res.ForLLM)
		}
	}
	if strings.Contains(res.ForLLM, `"tag": "field"`) {
		t.Errorf("field points should not be listed as anchors:\n%s", res.ForLLM)
	}
}

func TestDevGetContextRequiresModel(t *testing.T) {
	_, client := newDevTestServer(t)
	res := NewDevGetContextTool(client).Execute(context.Background(), map[string]any{})
	if !res.IsError || !strings.Contains(res.ForLLM, "model is required") {
		t.Fatalf("expected model error, got %#v", res)
	}
}

func TestDevGetFields(t *testing.T) {
	_, client := newDevTestServer(t)
	tool := NewDevGetFieldsTool(client)

	margin := tool.Execute(context.Background(), map[string]any{"model": "sale.order", "filter": "margin"})
	if margin.IsError {
		t.Fatalf("unexpected error: %s", margin.ForLLM)
	}
	if !strings.Contains(margin.ForLLM, "x_margin_preview") || !strings.Contains(margin.ForLLM, "float") {
		t.Errorf("margin filter wrong:\n%s", margin.ForLLM)
	}
	if strings.Contains(margin.ForLLM, "partner_id") {
		t.Errorf("margin filter leaked unrelated fields:\n%s", margin.ForLLM)
	}

	total := tool.Execute(context.Background(), map[string]any{"model": "sale.order", "filter": "total"})
	if total.IsError {
		t.Fatalf("unexpected error: %s", total.ForLLM)
	}
	if !strings.Contains(total.ForLLM, "tax_totals") || !strings.Contains(total.ForLLM, "readonly") {
		t.Errorf("total filter wrong:\n%s", total.ForLLM)
	}
}

func TestDevInspectView(t *testing.T) {
	_, client := newDevTestServer(t)
	tool := NewDevInspectViewTool(client)

	subtree := tool.Execute(context.Background(), map[string]any{
		"model": "sale.order", "anchor": "sale_total",
	})
	if subtree.IsError {
		t.Fatalf("unexpected error: %s", subtree.ForLLM)
	}
	if !strings.Contains(subtree.ForLLM, `name="sale_total"`) || !strings.Contains(subtree.ForLLM, "tax_totals") {
		t.Errorf("subtree wrong:\n%s", subtree.ForLLM)
	}
	if strings.Contains(subtree.ForLLM, "x_margin_preview") {
		t.Errorf("subtree leaked a sibling:\n%s", subtree.ForLLM)
	}

	full := tool.Execute(context.Background(), map[string]any{"model": "sale.order"})
	if full.IsError {
		t.Fatalf("unexpected error: %s", full.ForLLM)
	}
	if !strings.Contains(full.ForLLM, "<form>") || !strings.Contains(full.ForLLM, "x_margin_preview") {
		t.Errorf("full arch wrong:\n%s", full.ForLLM)
	}

	missing := tool.Execute(context.Background(), map[string]any{
		"model": "sale.order", "anchor": "nope",
	})
	if !missing.IsError || !strings.Contains(missing.ForLLM, "not found") {
		t.Errorf("expected missing anchor error, got %#v", missing)
	}
}

func TestDevProposeApplyDiffRollback(t *testing.T) {
	_, client := newDevTestServer(t)
	ctx := context.Background()

	propose := NewDevProposeChangeTool(client).Execute(ctx, map[string]any{
		"name":         "F7 margin field",
		"request_text": "Añade un campo de margen después del total",
		"kind":         "field",
		"level":        "n1",
		"target_model": "sale.order",
		"payload": map[string]any{
			"model":             "sale.order",
			"name":              "x_margin_f7",
			"ttype":             "float",
			"field_description": "Margen F7",
		},
	})
	if propose.IsError {
		t.Fatalf("propose error: %s", propose.ForLLM)
	}
	var proposal struct {
		ChangeID  int    `json:"change_id"`
		Reference string `json:"reference"`
		Status    string `json:"status"`
		Next      string `json:"next"`
	}
	if err := json.Unmarshal([]byte(propose.ForLLM), &proposal); err != nil {
		t.Fatalf("propose result is not JSON: %v\n%s", err, propose.ForLLM)
	}
	if proposal.ChangeID != 7 || proposal.Reference != "EVO-0007" || proposal.Status != "draft" || proposal.Next != "dev_apply_change" {
		t.Fatalf("unexpected proposal: %#v", proposal)
	}

	apply := NewDevApplyChangeTool(client).Execute(ctx, map[string]any{"change_id": proposal.ChangeID})
	if apply.IsError {
		t.Fatalf("apply error: %s", apply.ForLLM)
	}
	if !strings.Contains(apply.ForLLM, "applied") || !strings.Contains(apply.ForLLM, "field_id") {
		t.Errorf("apply result wrong:\n%s", apply.ForLLM)
	}

	diff := NewDevDiffTool(client).Execute(ctx, map[string]any{"change_id": proposal.ChangeID})
	if diff.IsError {
		t.Fatalf("diff error: %s", diff.ForLLM)
	}
	if !strings.Contains(diff.ForLLM, "EVO-0007") || !strings.Contains(diff.ForLLM, "proposal:") || !strings.Contains(diff.ForLLM, "applied:") {
		t.Errorf("diff result wrong:\n%s", diff.ForLLM)
	}

	rollback := NewDevRollbackTool(client).Execute(ctx, map[string]any{"change_id": proposal.ChangeID})
	if rollback.IsError {
		t.Fatalf("rollback error: %s", rollback.ForLLM)
	}
	if !strings.Contains(rollback.ForLLM, "rolled_back") {
		t.Errorf("rollback result wrong:\n%s", rollback.ForLLM)
	}
}

func TestDevUnauthorized(t *testing.T) {
	srv, _ := newDevTestServer(t)
	client := NewDevClient(srv.URL, "wrong-token")
	res := NewDevGetContextTool(client).Execute(context.Background(), map[string]any{"model": "sale.order"})
	if !res.IsError || !strings.Contains(res.ForLLM, "unauthorized") {
		t.Fatalf("expected unauthorized error, got %#v", res)
	}
}

func TestDevClientWithoutBaseURL(t *testing.T) {
	client := NewDevClient("", devTestToken)
	res := NewDevGetContextTool(client).Execute(context.Background(), map[string]any{"model": "sale.order"})
	if !res.IsError || !strings.Contains(res.ForLLM, "base URL") {
		t.Fatalf("expected base URL error, got %#v", res)
	}
}

func TestDevXMLSubtree(t *testing.T) {
	arch := `<form><sheet><group name="sale_total"><field name="tax_totals"/><field name="other"/></group><field name="x_margin_preview"/></sheet></form>`
	subtree, err := devXMLSubtree(arch, "sale_total")
	if err != nil {
		t.Fatalf("subtree: %v", err)
	}
	if !strings.Contains(subtree, "sale_total") || !strings.Contains(subtree, "tax_totals") || !strings.Contains(subtree, "other") {
		t.Errorf("subtree missing children:\n%s", subtree)
	}
	if strings.Contains(subtree, "x_margin_preview") {
		t.Errorf("subtree leaked sibling:\n%s", subtree)
	}
}

func TestDevProposeReturnsTheLedgerValidationError(t *testing.T) {
	_, client := newDevTestServer(t)
	res := NewDevProposeChangeTool(client).Execute(context.Background(), map[string]any{
		"kind": "view",
		"payload": map[string]any{
			"model":         "crm.lead",
			"inherit_xmlid": "crm.crm_case_kanban_view_leads",
		},
	})
	if !res.IsError {
		t.Fatalf("an invalid view payload must be reported as an error: %s", res.ForLLM)
	}
	if !strings.Contains(res.ForLLM, "View payload requires model and arch") {
		t.Fatalf("the model needs the ledger message, got: %s", res.ForLLM)
	}
}

func TestDevProposeAcceptsAValidViewPayload(t *testing.T) {
	_, client := newDevTestServer(t)
	res := NewDevProposeChangeTool(client).Execute(context.Background(), map[string]any{
		"kind": "view",
		"payload": map[string]any{
			"model":         "crm.lead",
			"inherit_xmlid": "crm.crm_case_kanban_view_leads",
			"arch":          "<data><xpath expr=\"//field[@name='name']\" position=\"after\"><field name=\"phone\"/></xpath></data>",
		},
	})
	if res.IsError {
		t.Fatalf("valid payload rejected: %s", res.ForLLM)
	}
	if !strings.Contains(res.ForLLM, "EVO-0007") {
		t.Fatalf("unexpected result: %s", res.ForLLM)
	}
}

func TestDevAddFieldToViewBuildsTheArchAndApplies(t *testing.T) {
	_, client := newDevTestServer(t)
	res := NewDevAddFieldToViewTool(client).Execute(context.Background(), map[string]any{
		"model": "sale.order", "view_type": "form",
		"anchor": "tax_totals", "field": "x_test_field",
	})
	if res.IsError {
		t.Fatalf("unexpected error: %s", res.ForLLM)
	}
	for _, want := range []string{"EVO-0007", `"applied": true`, "tax_totals", "x_test_field", "sale.view_order_form"} {
		if !strings.Contains(res.ForLLM, want) {
			t.Fatalf("result missing %q: %s", want, res.ForLLM)
		}
	}
}

func TestDevAddFieldToViewRefusesAMissingAnchor(t *testing.T) {
	_, client := newDevTestServer(t)
	res := NewDevAddFieldToViewTool(client).Execute(context.Background(), map[string]any{
		"model": "sale.order", "view_type": "form",
		"anchor": "no_such_field", "field": "x_test_field",
	})
	if !res.IsError || !strings.Contains(res.ForLLM, "not in the form view") {
		t.Fatalf("a missing anchor must be an error: %s", res.ForLLM)
	}
}
