package agent

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/providers"
)

// TestRetrieveRelevantToolsCreateDomains is the NRA-445 regression test:
// the 6 creation queries from /tmp/bench_create.py must put the expected
// specific create tool in the top-5, and the generic odoo_create must be
// EXCLUDED whenever a specific create tool clearly matches (it "sounds safer"
// to the small model and wins even when the specific tool is present).
func TestRetrieveRelevantToolsCreateDomains(t *testing.T) {
	defs := loadManifestToolsForTest(t)

	cases := []struct {
		query         string
		expected      string // must be in top-5
		genericExcluded bool // odoo_create must NOT be in top-5
	}{
		{"Crea una tarea para contactar con el cliente Acme", "odoo_create_task", true},
		{"Crea un cliente nuevo llamado Empresa Test SL con NIF B12345678", "odoo_create", false},
		{"Crea una factura de proveedor para la Empresa Test por 100 euros", "odoo_create_vendor_invoice", true},
		{"Crea un presupuesto para el cliente Acme por 500 euros", "odoo_create_sale_order", true},
		{"Registra un nuevo contacto llamado María García", "odoo_create", false},
		{"Crea una oportunidad de venta para Acme", "odoo_create_lead", true},
	}

	for _, tc := range cases {
		top := retrieveRelevantTools(defs, tc.query, 5)
		names := make([]string, 0, len(top))
		hasGeneric := false
		for _, d := range top {
			names = append(names, d.Function.Name)
			if d.Function.Name == "odoo_create" {
				hasGeneric = true
			}
		}
		joined := strings.Join(names, ",")
		if !strings.Contains(joined, tc.expected) {
			t.Errorf("query %q: expected %q in top-5, got %v", tc.query, tc.expected, names)
		}
		if tc.genericExcluded && hasGeneric {
			t.Errorf("query %q: generic odoo_create should be EXCLUDED, got top-5 %v", tc.query, names)
		}
		if !tc.genericExcluded && !hasGeneric {
			t.Errorf("query %q: generic odoo_create should be PRESENT (partner creation), got top-5 %v", tc.query, names)
		}
		t.Logf("query %q -> top-5 %v", tc.query, names)
	}
}

// TestRetrieveRelevantToolsLeadBeatsSale: "oportunidad" must outrank "venta"
// (lead domain wins), so create_lead must rank strictly above create_sale_order.
func TestRetrieveRelevantToolsLeadBeatsSale(t *testing.T) {
	defs := loadManifestToolsForTest(t)
	top := retrieveRelevantTools(defs, "Crea una oportunidad de venta para Acme", 5)
	leadIdx, saleIdx := -1, -1
	for i, d := range top {
		switch d.Function.Name {
		case "odoo_create_lead":
			leadIdx = i
		case "odoo_create_sale_order":
			saleIdx = i
		}
	}
	if leadIdx == -1 {
		t.Fatalf("odoo_create_lead not in top-5: %v", top)
	}
	if saleIdx != -1 && saleIdx < leadIdx {
		t.Fatalf("odoo_create_sale_order (%d) ranked above odoo_create_lead (%d): %v", saleIdx, leadIdx, top)
	}
}

// TestRetrieveRelevantToolsReadsNotBroken: the eval-suite read/destructive
// queries keep their expected tool in the top-5 (baseline regression guard).
func TestRetrieveRelevantToolsReadsNotBroken(t *testing.T) {
	defs := loadManifestToolsForTest(t)
	cases := []struct {
		query    string
		expected string
	}{
		{"Busca el partner ACME", "odoo_find_partner"},
		{"Dime el saldo de la cuenta contable 430000", "odoo_get_ar_ap_aging"},
		{"¿Cuántos productos hay en el almacén principal?", "odoo_get_product_stock"},
		{"Busca la orden de venta SO/2026/00150", "odoo_find_sale_order"},
		{"¿Qué facturas están pendientes de pago?", "odoo_find_pending_invoices"},
		{"Crea una factura de proveedor para el partner 42", "odoo_create_vendor_invoice"},
		{"Registra un nuevo lead en CRM para la empresa XYZ", "odoo_create_lead"},
		{"Añade una tarea al proyecto 'Implementación'", "odoo_create_task"},
		{"Confirma la orden de venta 123", "odoo_confirm_sale_order"},
		{"Valida el albarán de recepción WH/IN/00123", "odoo_validate_receipt"},
		{"Aplica el ajuste de inventario del producto PAPEL-A4", "odoo_apply_inventory_adjustment"},
	}
	for _, tc := range cases {
		top := retrieveRelevantTools(defs, tc.query, 5)
		names := make([]string, 0, len(top))
		for _, d := range top {
			names = append(names, d.Function.Name)
		}
		if !strings.Contains(strings.Join(names, ","), tc.expected) {
			t.Errorf("query %q: expected %q in top-5, got %v", tc.query, tc.expected, names)
		}
	}
}

func loadManifestToolsForTest(t *testing.T) []providers.ToolDefinition {
	t.Helper()
	data, err := os.ReadFile("testdata/manifest_eval.json")
	if err != nil {
		t.Skipf("testdata/manifest_eval.json not available: %v", err)
	}
	var m struct {
		Tools []struct {
			Name        string          `json:"name"`
			Description string          `json:"description"`
			InputSchema json.RawMessage `json:"inputSchema"`
		} `json:"tools"`
	}
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("parse manifest: %v", err)
	}
	defs := make([]providers.ToolDefinition, 0, len(m.Tools))
	for _, t := range m.Tools {
		defs = append(defs, providers.ToolDefinition{
			Type:     "function",
			Function: providers.ToolFunctionDefinition{Name: t.Name, Description: t.Description},
		})
	}
	return defs
}
