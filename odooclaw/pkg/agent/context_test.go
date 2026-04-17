package agent

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/nicolasramos/odooclaw/pkg/browsercopilot"
	"github.com/nicolasramos/odooclaw/pkg/providers"
)

type fakeBrowserResolver struct {
	response browsercopilot.ContextResponse
	err      error
}

func (f fakeBrowserResolver) ResolveContext(
	_ context.Context,
	_ browsercopilot.ResolveRequest,
) (browsercopilot.ContextResponse, error) {
	return f.response, f.err
}

func msg(role, content string) providers.Message {
	return providers.Message{Role: role, Content: content}
}

func assistantWithTools(toolIDs ...string) providers.Message {
	calls := make([]providers.ToolCall, len(toolIDs))
	for i, id := range toolIDs {
		calls[i] = providers.ToolCall{ID: id, Type: "function"}
	}
	return providers.Message{Role: "assistant", ToolCalls: calls}
}

func toolResult(id string) providers.Message {
	return providers.Message{Role: "tool", Content: "result", ToolCallID: id}
}

func TestSanitizeHistoryForProvider_EmptyHistory(t *testing.T) {
	result := sanitizeHistoryForProvider(nil)
	if len(result) != 0 {
		t.Fatalf("expected empty, got %d messages", len(result))
	}

	result = sanitizeHistoryForProvider([]providers.Message{})
	if len(result) != 0 {
		t.Fatalf("expected empty, got %d messages", len(result))
	}
}

func TestSanitizeHistoryForProvider_SingleToolCall(t *testing.T) {
	history := []providers.Message{
		msg("user", "hello"),
		assistantWithTools("A"),
		toolResult("A"),
		msg("assistant", "done"),
	}

	result := sanitizeHistoryForProvider(history)
	if len(result) != 4 {
		t.Fatalf("expected 4 messages, got %d", len(result))
	}
	assertRoles(t, result, "user", "assistant", "tool", "assistant")
}

func TestSanitizeHistoryForProvider_MultiToolCalls(t *testing.T) {
	history := []providers.Message{
		msg("user", "do two things"),
		assistantWithTools("A", "B"),
		toolResult("A"),
		toolResult("B"),
		msg("assistant", "both done"),
	}

	result := sanitizeHistoryForProvider(history)
	if len(result) != 5 {
		t.Fatalf("expected 5 messages, got %d: %+v", len(result), roles(result))
	}
	assertRoles(t, result, "user", "assistant", "tool", "tool", "assistant")
}

func TestSanitizeHistoryForProvider_AssistantToolCallAfterPlainAssistant(t *testing.T) {
	history := []providers.Message{
		msg("user", "hi"),
		msg("assistant", "thinking"),
		assistantWithTools("A"),
		toolResult("A"),
	}

	result := sanitizeHistoryForProvider(history)
	if len(result) != 2 {
		t.Fatalf("expected 2 messages, got %d: %+v", len(result), roles(result))
	}
	assertRoles(t, result, "user", "assistant")
}

func TestSanitizeHistoryForProvider_OrphanedLeadingTool(t *testing.T) {
	history := []providers.Message{
		toolResult("A"),
		msg("user", "hello"),
	}

	result := sanitizeHistoryForProvider(history)
	if len(result) != 1 {
		t.Fatalf("expected 1 message, got %d: %+v", len(result), roles(result))
	}
	assertRoles(t, result, "user")
}

func TestSanitizeHistoryForProvider_ToolAfterUserDropped(t *testing.T) {
	history := []providers.Message{
		msg("user", "hello"),
		toolResult("A"),
	}

	result := sanitizeHistoryForProvider(history)
	if len(result) != 1 {
		t.Fatalf("expected 1 message, got %d: %+v", len(result), roles(result))
	}
	assertRoles(t, result, "user")
}

func TestSanitizeHistoryForProvider_ToolAfterAssistantNoToolCalls(t *testing.T) {
	history := []providers.Message{
		msg("user", "hello"),
		msg("assistant", "hi"),
		toolResult("A"),
	}

	result := sanitizeHistoryForProvider(history)
	if len(result) != 2 {
		t.Fatalf("expected 2 messages, got %d: %+v", len(result), roles(result))
	}
	assertRoles(t, result, "user", "assistant")
}

func TestSanitizeHistoryForProvider_AssistantToolCallAtStart(t *testing.T) {
	history := []providers.Message{
		assistantWithTools("A"),
		toolResult("A"),
		msg("user", "hello"),
	}

	result := sanitizeHistoryForProvider(history)
	if len(result) != 1 {
		t.Fatalf("expected 1 message, got %d: %+v", len(result), roles(result))
	}
	assertRoles(t, result, "user")
}

func TestSanitizeHistoryForProvider_MultiToolCallsThenNewRound(t *testing.T) {
	history := []providers.Message{
		msg("user", "do two things"),
		assistantWithTools("A", "B"),
		toolResult("A"),
		toolResult("B"),
		msg("assistant", "done"),
		msg("user", "hi"),
		assistantWithTools("C"),
		toolResult("C"),
		msg("assistant", "done again"),
	}

	result := sanitizeHistoryForProvider(history)
	if len(result) != 9 {
		t.Fatalf("expected 9 messages, got %d: %+v", len(result), roles(result))
	}
	assertRoles(t, result, "user", "assistant", "tool", "tool", "assistant", "user", "assistant", "tool", "assistant")
}

func TestSanitizeHistoryForProvider_ConsecutiveMultiToolRounds(t *testing.T) {
	history := []providers.Message{
		msg("user", "start"),
		assistantWithTools("A", "B"),
		toolResult("A"),
		toolResult("B"),
		assistantWithTools("C", "D"),
		toolResult("C"),
		toolResult("D"),
		msg("assistant", "all done"),
	}

	result := sanitizeHistoryForProvider(history)
	if len(result) != 8 {
		t.Fatalf("expected 8 messages, got %d: %+v", len(result), roles(result))
	}
	assertRoles(t, result, "user", "assistant", "tool", "tool", "assistant", "tool", "tool", "assistant")
}

func TestSanitizeHistoryForProvider_PlainConversation(t *testing.T) {
	history := []providers.Message{
		msg("user", "hello"),
		msg("assistant", "hi"),
		msg("user", "how are you"),
		msg("assistant", "fine"),
	}

	result := sanitizeHistoryForProvider(history)
	if len(result) != 4 {
		t.Fatalf("expected 4 messages, got %d", len(result))
	}
	assertRoles(t, result, "user", "assistant", "user", "assistant")
}

func TestBuildMessagesIncludesOdooScopedMemoryRecall(t *testing.T) {
	tmpDir := setupWorkspace(t, map[string]string{
		"memory/MEMORY.md": "# Memory\n\nGlobal context.",
		"memory/scopes/odoo/company-7/entity-res.partner-42.md": "Partner 42 prefers Friday deployment updates.",
	})
	defer os.RemoveAll(tmpDir)

	cb := NewContextBuilder(tmpDir)
	msgs := cb.BuildMessages(
		nil,
		"",
		"please prepare the deployment update",
		nil,
		"odoo",
		"res.partner_42",
		"18",
		map[string]string{
			"company_id": "7",
			"model":      "res.partner",
			"res_id":     "42",
		},
	)

	if len(msgs) == 0 {
		t.Fatal("expected messages")
	}
	system := msgs[0].Content
	if !strings.Contains(system, "## Relevant Memory Recall") {
		t.Fatal("expected relevant memory recall in system prompt")
	}
	if !strings.Contains(system, "Partner 42 prefers Friday deployment updates") {
		t.Fatal("expected scoped memory content in system prompt")
	}
	if !strings.Contains(system, "Odoo Model: res.partner") {
		t.Fatal("expected odoo model in dynamic context")
	}
	if !strings.Contains(system, "Company ID: 7") {
		t.Fatal("expected company id in dynamic context")
	}
	if !strings.Contains(system, filepath.Base("entity-res.partner-42.md")) {
		t.Fatal("expected scoped file name in memory recall")
	}
}

func TestBuildMessagesIncludesBrowserContext(t *testing.T) {
	tmpDir := setupWorkspace(t, map[string]string{
		"memory/MEMORY.md": "# Memory\n\nGlobal context.",
	})
	defer os.RemoveAll(tmpDir)

	recordID := 42
	age := 18
	cb := NewContextBuilder(tmpDir)
	cb.browser = fakeBrowserResolver{response: browsercopilot.ContextResponse{
		Found:      true,
		AgeSeconds: &age,
		PageTitle:  "Azure Interior - Odoo",
		PageURL:    "https://demo.odoo.com/web#id=42&model=res.partner&view_type=form",
		Domain:     "demo.odoo.com",
		App: browsercopilot.AppDetection{
			Detected: "odoo",
			Model:    "res.partner",
			RecordID: &recordID,
			ViewType: "form",
		},
		Breadcrumbs:        []string{"Ventas", "Clientes"},
		Headings:           []string{"Azure Interior"},
		VisibleFields:      []string{"Name", "Email"},
		MainButtons:        []string{"Save", "Edit"},
		VisibleTextSummary: "Client record open in form view.",
		VisibleTables: []browsercopilot.VisibleTable{
			{
				ID:       "table_01",
				Title:    "Pedidos a facturar",
				Headers:  []string{"Número", "Cliente", "Total"},
				Rows:     [][]string{{"S00030", "Acme Corporation", "$290.616,50"}, {"S00029", "Acme Corporation", "$7.187,50"}, {"S00028", "Ready Mat", "$56.005,00"}},
				Footer:   []string{"", "", "$353.809,00"},
				RowCount: 3,
			},
		},
	}}

	msgs := cb.BuildMessages(nil, "", "que ves aqui", nil, "odoo", "res.partner_42", "18", nil)
	if len(msgs) == 0 {
		t.Fatal("expected messages")
	}
	system := msgs[0].Content
	if !strings.Contains(system, "## Browser Context") {
		t.Fatal("expected browser context in system prompt")
	}
	if !strings.Contains(system, "Do not say you cannot see the screen when Browser Context is present.") {
		t.Fatal("expected browser context usage instruction in system prompt")
	}
	if !strings.Contains(system, "Title: Azure Interior - Odoo") {
		t.Fatal("expected browser title in system prompt")
	}
	if !strings.Contains(system, "Model: res.partner") {
		t.Fatal("expected browser model in system prompt")
	}
	if !strings.Contains(system, "Main Buttons: Save, Edit") {
		t.Fatal("expected main buttons in system prompt")
	}
	if !strings.Contains(system, "Visible Table: Pedidos a facturar") {
		t.Fatal("expected visible table title in system prompt")
	}
	if !strings.Contains(system, "Row 3: Número: S00028 | Cliente: Ready Mat | Total: $56.005,00") {
		t.Fatal("expected visible table rows in system prompt")
	}
	if !strings.Contains(system, "Footer: $353.809,00") {
		t.Fatal("expected visible table footer in system prompt")
	}
}

func roles(msgs []providers.Message) []string {
	r := make([]string, len(msgs))
	for i, m := range msgs {
		r[i] = m.Role
	}
	return r
}

func assertRoles(t *testing.T, msgs []providers.Message, expected ...string) {
	t.Helper()
	if len(msgs) != len(expected) {
		t.Fatalf("role count mismatch: got %v, want %v", roles(msgs), expected)
	}
	for i, exp := range expected {
		if msgs[i].Role != exp {
			t.Errorf("message[%d]: got role %q, want %q", i, msgs[i].Role, exp)
		}
	}
}
