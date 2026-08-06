package agent

import (
	"strings"
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/providers"
)

// Flujo real: assistant llama find_partner, tool devuelve "10", luego
// assistant responde texto. addOdooRecordLinks debe añadir el enlace al 10.
func TestAddOdooRecordLinksRealFlow(t *testing.T) {
	messages := []providers.Message{
		{Role: "user", Content: "Tenemos algun cliente que se llame acme?"},
		{
			Role: "assistant",
			ToolCalls: []providers.ToolCall{
				{ID: "call_1", Name: "mcp_odoo-mcp_odoo_find_partner", Function: &providers.FunctionCall{Name: "mcp_odoo-mcp_odoo_find_partner", Arguments: `{"name":"acme"}`}},
			},
		},
		{Role: "tool", ToolCallID: "call_1", Content: "10"},
	}

	content := "El partner **Acme Corporation** fue encontrado en el sistema."
	got := addOdooRecordLinks(messages, content)

	if !strings.Contains(got, "/odoo/contacts/10") {
		t.Fatalf("enlace no añadido. got: %q", got)
	}
	if !strings.Contains(got, content) {
		t.Fatalf("contenido original perdido. got: %q", got)
	}
}

// REGRESIÓN: historial de turnos previos (Acme → id 10) NO debe contaminar la
// consulta actual. El enlace debe apuntar SOLO al id del turno actual.
func TestAddOdooRecordLinksIgnoresPreviousTurns(t *testing.T) {
	messages := []providers.Message{
		{Role: "user", Content: "Busca el cliente Acme"},
		{
			Role: "assistant",
			ToolCalls: []providers.ToolCall{
				{ID: "call_old", Name: "mcp_odoo-mcp_odoo_find_partner", Function: &providers.FunctionCall{Name: "mcp_odoo-mcp_odoo_find_partner", Arguments: `{"name":"Acme"}`}},
			},
		},
		{Role: "tool", ToolCallID: "call_old", Content: "10"}, // turno anterior: Acme = 10
		{Role: "assistant", Content: "El cliente **Acme** se ha encontrado."},
		// --- nuevo turno del usuario ---
		{Role: "user", Content: "Busca el cliente Pepito"},
		{
			Role: "assistant",
			ToolCalls: []providers.ToolCall{
				{ID: "call_new", Name: "mcp_odoo-mcp_odoo_find_partner", Function: &providers.FunctionCall{Name: "mcp_odoo-mcp_odoo_find_partner", Arguments: `{"name":"Pepito"}`}},
			},
		},
		{Role: "tool", ToolCallID: "call_new", Content: "42"}, // turno actual: Pepito = 42
	}

	content := "El cliente **Pepito** se ha encontrado."
	got := addOdooRecordLinks(messages, content)

	if strings.Contains(got, "/odoo/contacts/10") {
		t.Fatalf("enlace del turno anterior (id 10) filtrado en el actual: %q", got)
	}
	if !strings.Contains(got, "/odoo/contacts/42") {
		t.Fatalf("enlace del turno actual (id 42) no añadido: %q", got)
	}
}

// REGRESIÓN: los ARGS de la tool call son inventados por el modelo y NO deben
// usarse como fuente de ids — solo los resultados reales de la tool.
func TestAddOdooRecordLinksIgnoresHallucinatedArgs(t *testing.T) {
	messages := []providers.Message{
		{Role: "user", Content: "Busca el cliente Pepito"},
		{
			Role: "assistant",
			ToolCalls: []providers.ToolCall{
				{ID: "call_1", Name: "mcp_odoo-mcp_odoo_get_partner_summary", Function: &providers.FunctionCall{Name: "mcp_odoo-mcp_odoo_get_partner_summary", Arguments: `{"partner_id":99,"sender_id":0}`}},
			},
		},
		// El resultado real: error (partner 99 no existe) — sin id válido.
		{Role: "tool", ToolCallID: "call_1", Content: `{"error": "Partner not found"}`},
	}

	content := "No se encontró al cliente."
	got := addOdooRecordLinks(messages, content)
	if got != content {
		t.Fatalf("no debe añadir enlace con args alucinados. got: %q", got)
	}
}

// Si la respuesta ya contiene un enlace, no duplicar.
func TestAddOdooRecordLinksNoDouble(t *testing.T) {
	messages := []providers.Message{
		{Role: "user", Content: "Busca Acme"},
		{Role: "tool", ToolCallID: "c", Content: "10"},
	}
	content := "El cliente es **Acme**. [Ver](/odoo/contacts/10)"
	got := addOdooRecordLinks(messages, content)
	if strings.Count(got, "/odoo/contacts/10") != 1 {
		t.Fatalf("enlace duplicado: %q", got)
	}
}

// Sin tool results → sin cambios.
func TestAddOdooRecordLinksEmpty(t *testing.T) {
	messages := []providers.Message{
		{Role: "user", Content: "hola"},
	}
	content := "Hola, ¿en qué puedo ayudarte?"
	got := addOdooRecordLinks(messages, content)
	if got != content {
		t.Fatalf("cambió sin necesidad: %q", got)
	}
}
