package agent

import (
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/providers"
)

func defs(names ...string) []providers.ToolDefinition {
	out := make([]providers.ToolDefinition, 0, len(names))
	for _, n := range names {
		out = append(out, providers.ToolDefinition{
			Type:     "function",
			Function: providers.ToolFunctionDefinition{Name: n},
		})
	}
	return out
}

func TestFilterToolDefsByName(t *testing.T) {
	all := defs("a", "b", "c", "d", "e")

	got := filterToolDefsByName(all, []string{"d", "b"}, 3)
	if len(got) != 3 {
		t.Fatalf("len = %d, want 3", len(got))
	}
	if got[0].Function.Name != "d" || got[1].Function.Name != "b" {
		t.Errorf("retrieved order not preserved: %v, %v", got[0].Function.Name, got[1].Function.Name)
	}
	// Third slot is filled from the catalogue so a short retrieval never
	// shrinks the prompt.
	if got[2].Function.Name != "a" {
		t.Errorf("padding = %q, want a", got[2].Function.Name)
	}
}

func TestFilterToolDefsIgnoresUnknownNames(t *testing.T) {
	all := defs("a", "b")
	got := filterToolDefsByName(all, []string{"ghost", "b"}, 2)
	if len(got) != 2 || got[0].Function.Name != "b" {
		t.Fatalf("got %v", got)
	}
}

// The keyword fallback must still hit the tools the retrieval engine used to
// miss in production.
func TestRetrieveRelevantToolsMeasuredMisses(t *testing.T) {
	catalogue := defs(
		"odoo_search", "odoo_search_read", "odoo_read", "odoo_create", "odoo_write",
		"odoo_log_task_timesheet", "odoo_log_timesheet", "odoo_check_in",
		"odoo_find_pending_invoices", "odoo_find_partner", "odoo_get_ar_ap_aging",
	)
	cases := map[string]string{
		"Apunta 2 horas de reunion en la tarea 45": "odoo_log_task_timesheet",
		"Ficha la entrada de hoy":                  "odoo_check_in",
		"Cuanto le debemos a DISA GAS":             "odoo_find_pending_invoices",
	}
	for query, want := range cases {
		top := retrieveRelevantTools(catalogue, query, 5)
		found := false
		for _, d := range top {
			if d.Function.Name == want {
				found = true
			}
		}
		if !found {
			names := make([]string, 0, len(top))
			for _, d := range top {
				names = append(names, d.Function.Name)
			}
			t.Errorf("%q: %s not in top-5 %v", query, want, names)
		}
	}
}
