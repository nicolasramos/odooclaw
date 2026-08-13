package agent

import (
	"strings"
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/providers"
)

// odooLinkTestMessages builds a minimal current-turn exchange: user question,
// assistant tool call, and the tool result.
func odooLinkTestMessages(toolName, toolContent string) []providers.Message {
	return []providers.Message{
		{Role: "user", Content: "Busca registros"},
		{
			Role: "assistant",
			ToolCalls: []providers.ToolCall{
				{ID: "call_1", Name: toolName, Function: &providers.FunctionCall{Name: toolName}},
			},
		},
		{Role: "tool", ToolCallID: "call_1", Content: toolContent},
	}
}

// Aceptación #1: find_pending_invoices → [INV/2026/0001](/odoo/account.move/42)
// con formato de puntos (nunca snake_case).
func TestAddOdooRecordLinksInvoice(t *testing.T) {
	messages := odooLinkTestMessages("mcp_odoo-mcp_odoo_find_pending_invoices",
		`[{"id": 42, "name": "INV/2026/0001", "move_type": "out_invoice", "state": "posted"}]`)
	got := addOdooRecordLinks(messages, "Tienes 1 factura pendiente.")

	if !strings.Contains(got, "[INV/2026/0001](/odoo/account.move/42)") {
		t.Fatalf("esperaba [INV/2026/0001](/odoo/account.move/42), got: %q", got)
	}
	if strings.Contains(got, "account_move") {
		t.Fatalf("URL snake_case no permitida: %q", got)
	}
}

// Aceptación #2: res.partner → /odoo/contacts/{id} (sin regresión y nunca
// /odoo/res_partner/).
func TestAddOdooRecordLinksPartnerJSON(t *testing.T) {
	messages := odooLinkTestMessages("odoo_find_partner", `[{"id": 10, "name": "Acme"}]`)
	got := addOdooRecordLinks(messages, "Encontré a Acme.")

	if !strings.Contains(got, "[Acme](/odoo/contacts/10)") {
		t.Fatalf("esperaba [Acme](/odoo/contacts/10), got: %q", got)
	}
	if strings.Contains(got, "res_partner") {
		t.Fatalf("URL snake_case no permitida: %q", got)
	}
}

// get_partner_summary devuelve un objeto único {"id": N, "name": ...}.
func TestAddOdooRecordLinksPartnerSummary(t *testing.T) {
	messages := odooLinkTestMessages("mcp_odoo-mcp_odoo_get_partner_summary",
		`{"id": 10, "name": "Acme SL", "email": "a@b.c"}`)
	got := addOdooRecordLinks(messages, "Resumen del cliente:")

	if !strings.Contains(got, "[Acme SL](/odoo/contacts/10)") {
		t.Fatalf("esperaba [Acme SL](/odoo/contacts/10), got: %q", got)
	}
}

// Productos → /odoo/product.product/{id}.
func TestAddOdooRecordLinksProduct(t *testing.T) {
	messages := odooLinkTestMessages("odoo_find_product",
		`[{"id": 5, "name": "Desk Oak", "default_code": "FURN-DESK"}]`)
	got := addOdooRecordLinks(messages, "Producto encontrado:")

	if !strings.Contains(got, "[Desk Oak](/odoo/product.product/5)") {
		t.Fatalf("esperaba [Desk Oak](/odoo/product.product/5), got: %q", got)
	}
	if strings.Contains(got, "product_product") {
		t.Fatalf("URL snake_case no permitida: %q", got)
	}
}

// Pedidos de venta → /odoo/sale.order/{id} (tool registrada en singular).
func TestAddOdooRecordLinksSaleOrder(t *testing.T) {
	messages := odooLinkTestMessages("odoo_find_sale_order",
		`[{"id": 100, "name": "SO/2026/0050", "state": "sale"}]`)
	got := addOdooRecordLinks(messages, "Pedido encontrado:")

	if !strings.Contains(got, "[SO/2026/0050](/odoo/sale.order/100)") {
		t.Fatalf("esperaba [SO/2026/0050](/odoo/sale.order/100), got: %q", got)
	}
	if strings.Contains(got, "sale_order") {
		t.Fatalf("URL snake_case no permitida: %q", got)
	}
}

// Tools no mapeadas (search/read genéricos) nunca generan enlaces.
func TestAddOdooRecordLinksUnknownTool(t *testing.T) {
	messages := odooLinkTestMessages("mcp_odoo-mcp_odoo_search", `[{"id": 42, "name": "X"}]`)
	content := "Resultado de búsqueda genérica."
	got := addOdooRecordLinks(messages, content)

	if got != content {
		t.Fatalf("tool sin modelo no debe añadir enlaces, got: %q", got)
	}
}

// El mismo registro repetido en el result no genera enlaces duplicados.
func TestAddOdooRecordLinksDedupe(t *testing.T) {
	messages := odooLinkTestMessages("odoo_find_pending_invoices",
		`[{"id": 42, "name": "INV/2026/0001"}, {"id": 42, "name": "INV/2026/0001"}]`)
	got := addOdooRecordLinks(messages, "Resultados:")

	if strings.Count(got, "/odoo/account.move/42") != 1 {
		t.Fatalf("enlace duplicado: %q", got)
	}
}

// Aceptación #3: una URL /odoo/<modelo>/<id> desnuda en la respuesta final
// del modelo se convierte a markdown clicable.
func TestConvertPlainURLsToLinks(t *testing.T) {
	content := "La factura está en URL: /odoo/account.move/42"
	got := convertPlainURLsToLinks(content, nil)

	if !strings.Contains(got, "[Factura 42](/odoo/account.move/42)") {
		t.Fatalf("esperaba [Factura 42](/odoo/account.move/42), got: %q", got)
	}
}

// La conversión respeta el caso especial res.partner → contacts.
func TestConvertPlainURLsToLinksPartner(t *testing.T) {
	content := "El cliente está en URL: /odoo/contacts/10"
	got := convertPlainURLsToLinks(content, nil)

	if !strings.Contains(got, "[Cliente 10](/odoo/contacts/10)") {
		t.Fatalf("esperaba [Cliente 10](/odoo/contacts/10), got: %q", got)
	}
}

// Un URL que ya es target de un enlace markdown NO se toca ni se duplica.
func TestConvertPlainURLsToLinksSkipsLinked(t *testing.T) {
	content := "Mira [aquí](/odoo/account.move/42) por favor"
	got := convertPlainURLsToLinks(content, nil)

	if strings.Count(got, "/odoo/account.move/42") != 1 {
		t.Fatalf("no debe duplicar enlaces: %q", got)
	}
	if !strings.Contains(got, "[aquí](/odoo/account.move/42)") {
		t.Fatalf("el enlace existente se alteró: %q", got)
	}
}

// La conversión usa el label REAL del tool result del turno cuando la URL
// coincide (nunca duplica el enlace con dos labels distintos).
func TestConvertPlainURLsToLinksKnownLabel(t *testing.T) {
	content := "La factura está en URL: /odoo/account.move/42"
	known := map[string]string{"/odoo/account.move/42": "INV/2026/0001"}
	got := convertPlainURLsToLinks(content, known)

	if !strings.Contains(got, "[INV/2026/0001](/odoo/account.move/42)") {
		t.Fatalf("label real no usado: %q", got)
	}
	if strings.Count(got, "/odoo/account.move/42") != 1 {
		t.Fatalf("enlace duplicado: %q", got)
	}
}

// Integración: tool result + URL desnuda del modelo en el mismo turno — la
// URL se convierte con el label real y NO se añade un segundo enlace.
func TestAddOdooRecordLinksPlainTextModelURL(t *testing.T) {
	messages := odooLinkTestMessages("odoo_find_pending_invoices",
		`[{"id": 42, "name": "INV/2026/0001"}]`)
	content := "La factura está en URL: /odoo/account.move/42"
	got := addOdooRecordLinks(messages, content)

	if !strings.Contains(got, "[INV/2026/0001](/odoo/account.move/42)") {
		t.Fatalf("la URL desnuda no se convirtió con label real: %q", got)
	}
	if strings.Count(got, "/odoo/account.move/42") != 1 {
		t.Fatalf("enlace duplicado (tool result + conversión): %q", got)
	}
}

// odoo_search genérico: el modelo de la búsqueda viene de los ARGS de la tool
// call (la entidad consultada, nunca un id) — aceptación del issue NRA-434.
func TestAddOdooRecordLinksGenericSearch(t *testing.T) {
	messages := []providers.Message{
		{Role: "user", Content: "Busca pedidos de venta recientes"},
		{
			Role: "assistant",
			ToolCalls: []providers.ToolCall{
				{ID: "call_so", Name: "mcp_odoo-mcp_odoo_search", Function: &providers.FunctionCall{Name: "mcp_odoo-mcp_odoo_search", Arguments: `{"model":"sale.order","domain":[],"limit":5}`}},
			},
		},
		{Role: "tool", ToolCallID: "call_so", Content: `[{"id": 3, "name": "SO/2026/0001", "amount_total": 250.0}]`},
	}

	got := addOdooRecordLinks(messages, "Encontré el pedido SO/2026/0001.")

	if !strings.Contains(got, "[SO/2026/0001](/odoo/sale.order/3)") {
		t.Fatalf("modelo de args no usado en odoo_search. got: %q", got)
	}
}

// find_product real devuelve un wrapper {"ok": true, "products": [...]} —
// los records anidados también generan enlaces.
func TestAddOdooRecordLinksFindProductWrapper(t *testing.T) {
	messages := odooLinkTestMessages("mcp_odoo-mcp_odoo_find_product",
		`{"ok": true, "status": "ok", "capability": "inventory.find_product", "count": 2, "products": [{"id": 7, "display_name": "Portatil HP", "default_code": "HP-X1"}, {"id": 8, "name": "Monitor LG"}]}`)
	got := addOdooRecordLinks(messages, "He encontrado 2 productos.")

	if !strings.Contains(got, "[Portatil HP](/odoo/product.product/7)") {
		t.Fatalf("wrapper products no parseado (1): %q", got)
	}
	if !strings.Contains(got, "[Monitor LG](/odoo/product.product/8)") {
		t.Fatalf("wrapper products no parseado (2): %q", got)
	}
}

// El nombre de tool en plural (variante antigua) se normaliza igualmente.
func TestNormalizeToolName(t *testing.T) {
	cases := []struct{ in, want string }{
		{"mcp_odoo-mcp_odoo_find_partner", "odoo_find_partner"},
		{"odoo_find_partner", "odoo_find_partner"},
		{"mcp_odoo-mcp_odoo_get_invoice_summary", "odoo_get_invoice_summary"},
	}
	for _, c := range cases {
		if got := normalizeToolName(c.in); got != c.want {
			t.Errorf("normalizeToolName(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

// odooRecordURL: res.partner → contacts, resto con puntos.
func TestOdooRecordURL(t *testing.T) {
	if got := odooRecordURL("res.partner", 10); got != "/odoo/contacts/10" {
		t.Errorf("res.partner → %q, want /odoo/contacts/10", got)
	}
	if got := odooRecordURL("account.move", 42); got != "/odoo/account.move/42" {
		t.Errorf("account.move → %q, want /odoo/account.move/42", got)
	}
}
