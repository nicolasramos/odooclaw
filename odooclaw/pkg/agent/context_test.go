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

	cb := NewContextBuilder(tmpDir, 0, 0)
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
	if !strings.Contains(system, "<!-- odoo.model: res.partner -->") {
		t.Fatal("expected odoo model in dynamic context")
	}
	if !strings.Contains(system, "<!-- odoo.company_id: 7 -->") {
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
	cb := NewContextBuilder(tmpDir, 0, 0)
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

// --- Tests for maskToolResults ---

func TestMaskToolResults_NoChangeWhenUnlimited(t *testing.T) {
	history := []providers.Message{
		{Role: "tool", Content: "short result", ToolCallID: "A"},
	}
	result := maskToolResults(history, 0)
	if len(result) != 1 || result[0].Content != "short result" {
		t.Fatal("expected no change when maxChars=0")
	}
}

func TestMaskToolResults_NoChangeWhenUnderLimit(t *testing.T) {
	history := []providers.Message{
		{Role: "tool", Content: "short result", ToolCallID: "A"},
	}
	result := maskToolResults(history, 4000)
	if len(result) != 1 || result[0].Content != "short result" {
		t.Fatal("expected no change when content under limit")
	}
}

func TestMaskToolResults_NoChangeOnNonToolMessages(t *testing.T) {
	history := []providers.Message{
		{Role: "user", Content: strings.Repeat("x", 10000)},
		{Role: "assistant", Content: strings.Repeat("y", 10000)},
	}
	result := maskToolResults(history, 4000)
	if len(result) != 2 || result[0].Content != strings.Repeat("x", 10000) {
		t.Fatal("expected non-tool messages unchanged")
	}
}

func TestMaskToolResults_TruncatesLongToolResult(t *testing.T) {
	longContent := strings.Repeat("x", 10000)
	history := []providers.Message{
		{Role: "tool", Content: longContent, ToolCallID: "A"},
	}
	result := maskToolResults(history, 4000)
	if len(result) != 1 {
		t.Fatal("expected 1 message")
	}
	if result[0].Content == longContent {
		t.Fatal("expected content to be truncated")
	}
	if !strings.Contains(result[0].Content, "[...") {
		t.Fatal("expected truncation marker in output")
	}
	if !strings.Contains(result[0].Content, "chars truncated") {
		t.Fatal("expected truncated count in output")
	}
}

func TestMaskToolResults_HalfOneEdgeCase(t *testing.T) {
	// When maxChars=1, half=0, so we clamp to 1.
	// The result should be: first char + truncation marker + last char.
	longContent := strings.Repeat("x", 100)
	history := []providers.Message{
		{Role: "tool", Content: longContent, ToolCallID: "A"},
	}
	result := maskToolResults(history, 1)
	if len(result) != 1 {
		t.Fatal("expected 1 message")
	}
	// The truncated content should be shorter than original
	if len(result[0].Content) >= len(longContent) {
		t.Fatal("expected truncated content to be shorter than original")
	}
}

func TestMaskToolResults_PreservesToolPairing(t *testing.T) {
	history := []providers.Message{
		{Role: "assistant", ToolCalls: []providers.ToolCall{{ID: "A"}}},
		{Role: "tool", Content: strings.Repeat("x", 10000), ToolCallID: "A"},
	}
	result := maskToolResults(history, 4000)
	if len(result) != 2 {
		t.Fatal("expected 2 messages")
	}
	// The tool_use message should be unchanged
	if len(result[0].ToolCalls) == 0 {
		t.Fatal("expected tool_use message to retain ToolCalls")
	}
	// The tool_result should be truncated
	if result[1].Content == strings.Repeat("x", 10000) {
		t.Fatal("expected tool_result to be truncated")
	}
}

// --- Tests for slidingWindowByTokens ---

func TestSlidingWindowByTokens_NoChangeWhenUnlimited(t *testing.T) {
	history := []providers.Message{
		{Role: "user", Content: "hello"},
		{Role: "assistant", Content: "hi"},
	}
	result := slidingWindowByTokens(history, 0)
	if len(result) != 2 {
		t.Fatal("expected no change when maxTokens=0")
	}
}

func TestSlidingWindowByTokens_EmptyHistory(t *testing.T) {
	result := slidingWindowByTokens(nil, 800000)
	if len(result) != 0 {
		t.Fatal("expected empty result for nil history")
	}
}

func TestSlidingWindowByTokens_FitsWithinBudget(t *testing.T) {
	history := []providers.Message{
		{Role: "user", Content: "short"},
		{Role: "assistant", Content: "short"},
	}
	result := slidingWindowByTokens(history, 800000)
	if len(result) != 2 {
		t.Fatal("expected all messages when within budget")
	}
}

func TestSlidingWindowByTokens_DropsOldest(t *testing.T) {
	// Create history that exceeds the budget
	history := []providers.Message{
		{Role: "user", Content: strings.Repeat("x", 200000)}, // ~50k tokens
		{Role: "assistant", Content: strings.Repeat("y", 200000)}, // ~50k tokens
		{Role: "user", Content: "last"}, // ~1 token
	}
	result := slidingWindowByTokens(history, 1000) // ~4000 chars budget
	if len(result) == 0 {
		t.Fatal("expected at least some messages")
	}
	// The oldest messages should be dropped
	if result[0].Content == strings.Repeat("x", 200000) {
		t.Fatal("expected oldest message to be dropped")
	}
}

func TestSlidingWindowByTokens_NeverSplitsToolPair(t *testing.T) {
	history := []providers.Message{
		{Role: "user", Content: "do something"},
		{Role: "assistant", ToolCalls: []providers.ToolCall{{ID: "A", Function: &providers.FunctionCall{Name: "read_file"}}}},
		{Role: "tool", Content: "result", ToolCallID: "A"},
		{Role: "user", Content: "last"},
	}
	result := slidingWindowByTokens(history, 100) // very tight budget
	// Should not return a tool_result without its tool_use
	for i, msg := range result {
		if msg.ToolCallID != "" {
			// There should be an assistant message with ToolCalls before this tool_result
			found := false
			for j := i - 1; j >= 0; j-- {
				if result[j].Role == "assistant" && len(result[j].ToolCalls) > 0 {
					found = true
					break
				}
			}
			if !found {
				t.Fatalf("tool_result at index %d has no preceding tool_use", i)
			}
		}
	}
}

func TestSlidingWindowByTokens_PreservesLastUserMessage(t *testing.T) {
	// When all messages exceed the budget, should keep at least the last user message
	history := []providers.Message{
		{Role: "user", Content: strings.Repeat("x", 200000)},
		{Role: "assistant", Content: strings.Repeat("y", 200000)},
		{Role: "user", Content: "last request"},
	}
	result := slidingWindowByTokens(history, 100) // very tight budget
	if len(result) == 0 {
		t.Fatal("expected at least the last user message to be preserved")
	}
	if result[0].Role != "user" {
		t.Fatalf("expected last user message, got role %q", result[0].Role)
	}
}

func TestSlidingWindowByTokens_FallbackToSystemWhenNoUser(t *testing.T) {
	// When there's no user message, should keep at least the first message
	history := []providers.Message{
		{Role: "system", Content: "system prompt"},
		{Role: "assistant", Content: strings.Repeat("y", 200000)},
	}
	result := slidingWindowByTokens(history, 100)
	if len(result) == 0 {
		t.Fatal("expected at least the first message to be preserved")
	}
	if result[0].Role != "system" {
		t.Fatalf("expected system message, got role %q", result[0].Role)
	}
}

func TestSlidingWindowByTokens_EmptyHistoryReturnsEmpty(t *testing.T) {
	result := slidingWindowByTokens([]providers.Message{}, 800000)
	if len(result) != 0 {
		t.Fatal("expected empty result for empty history")
	}
}

func TestBuildSystemPrompt_MinimalForLocalSmallModel(t *testing.T) {
	tmpDir := t.TempDir()
	// Populate the workspace with the full-context sources (identity + AGENTS.md
	// + skills + memory). If the minimal-prompt gate were missing, these would
	// inflate the system prompt to several thousand chars.
	if err := os.WriteFile(filepath.Join(tmpDir, "AGENTS.md"), []byte("LONG AGENTS BOOTSTRAP "+strings.Repeat("x", 8000)), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(tmpDir, "memory"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "memory", "MEMORY.md"), []byte("# Memory\n\nlots of long context "+strings.Repeat("y", 4000)), 0o644); err != nil {
		t.Fatal(err)
	}

	cb := NewContextBuilder(tmpDir, 0, 0)
	cb.SetModel("odooclaw-v25e")
	cb.InvalidateCache()

	prompt := cb.BuildSystemPrompt()
	if !cb.isLocalSmallModel() {
		t.Fatal("expected isLocalSmallModel() to be true for odooclaw-v25e")
	}
	if len(prompt) > 800 {
		t.Fatalf("expected minimal system prompt (<800 chars), got %d chars", len(prompt))
	}
	if strings.Contains(prompt, "AGENTS BOOTSTRAP") || strings.Contains(prompt, "lots of long context") {
		t.Fatal("minimal prompt must not include AGENTS.md or memory content")
	}
	if !strings.Contains(prompt, "<tool_call>") {
		t.Fatal("minimal prompt must instruct the <tool_call> format")
	}
}

func TestBuildSystemPrompt_FullForRemoteModel(t *testing.T) {
	tmpDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(tmpDir, "AGENTS.md"), []byte("BOOTSTRAP-CONTENT"), 0o644); err != nil {
		t.Fatal(err)
	}

	cb := NewContextBuilder(tmpDir, 0, 0)
	cb.SetModel("gpt-4o")
	cb.InvalidateCache()

	prompt := cb.BuildSystemPrompt()
	if cb.isLocalSmallModel() {
		t.Fatal("expected isLocalSmallModel() to be false for gpt-4o")
	}
	if !strings.Contains(prompt, "BOOTSTRAP-CONTENT") {
		t.Fatal("remote models must keep the full system prompt including bootstrap files")
	}
}
