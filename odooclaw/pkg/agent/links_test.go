package agent

import (
	"strings"
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/providers"
)

// Simula el flujo real: assistant llama find_partner, tool devuelve "10", luego
// assistant responde texto. addOdooRecordLinks debe añadir el enlace.
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

// Si la respuesta ya contiene un enlace, no duplicar.
func TestAddOdooRecordLinksNoDouble(t *testing.T) {
	messages := []providers.Message{
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
