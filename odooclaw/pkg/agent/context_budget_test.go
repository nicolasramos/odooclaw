package agent

import (
	"reflect"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/nicolasramos/odooclaw/pkg/providers"
)

func TestEstimateTokensIsConservativeAcrossScripts(t *testing.T) {
	tests := []struct {
		name      string
		content   string
		minTokens int
		maxTokens int
	}{
		{
			name:      "CJK is at least three tokens per two runes",
			content:   strings.Repeat("界", 100),
			minTokens: 150,
		},
		{
			name:      "emoji is at least two tokens per rune",
			content:   strings.Repeat("🦞", 100),
			minTokens: 200,
		},
		{
			name:      "ASCII remains near four characters per token",
			content:   strings.Repeat("a", 1000),
			maxTokens: 350,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := estimateMessageTokens([]providers.Message{{
				Role:    "user",
				Content: tt.content,
			}})
			if got < tt.minTokens {
				t.Fatalf("estimateMessageTokens() = %d, want at least %d for %d content runes",
					got, tt.minTokens, utf8.RuneCountInString(tt.content))
			}
			if tt.maxTokens > 0 && got > tt.maxTokens {
				t.Fatalf("estimateMessageTokens() = %d, want at most %d", got, tt.maxTokens)
			}
		})
	}
}

func TestEstimateTokensCountsStructuredMessageContent(t *testing.T) {
	al := &AgentLoop{}
	base := providers.Message{Role: "assistant", Content: strings.Repeat("x", 20)}

	tests := []struct {
		name    string
		message providers.Message
	}{
		{
			name: "reasoning content",
			message: providers.Message{
				Role:             "assistant",
				Content:          base.Content,
				ReasoningContent: strings.Repeat("r", 20),
			},
		},
		{
			name: "tool calls ids and function arguments",
			message: providers.Message{
				Role:    "assistant",
				Content: base.Content,
				ToolCalls: []providers.ToolCall{{
					ID:   "call-123456789",
					Type: "function",
					Function: &providers.FunctionCall{
						Name:      "lookup_customer",
						Arguments: `{"customer":"Ada Lovelace"}`,
					},
				}},
			},
		},
		{
			name: "tool result id",
			message: providers.Message{
				Role:       "tool",
				Content:    base.Content,
				ToolCallID: "call-123456789",
			},
		},
		{
			name: "media and structured system metadata",
			message: providers.Message{
				Role:    "system",
				Content: base.Content,
				Media:   []string{"media://large-image-reference"},
				SystemParts: []providers.ContentBlock{{
					Type: "text",
					Text: "cacheable system metadata",
					CacheControl: &providers.CacheControl{
						Type: "ephemeral",
					},
				}},
			},
		},
	}

	baseTokens := al.estimateTokens([]providers.Message{base})
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := al.estimateTokens([]providers.Message{tt.message}); got <= baseTokens {
				t.Fatalf("estimateTokens() = %d, want more than content-only estimate %d", got, baseTokens)
			}
		})
	}
}

func TestEstimateTokensCountsCompatibilityToolCallFieldsIndependently(t *testing.T) {
	al := &AgentLoop{}
	base := providers.Message{
		Role:      "assistant",
		ToolCalls: []providers.ToolCall{{}},
	}

	tests := []struct {
		name    string
		message providers.Message
	}{
		{
			name: "name",
			message: providers.Message{
				Role:      "assistant",
				ToolCalls: []providers.ToolCall{{Name: strings.Repeat("n", 40)}},
			},
		},
		{
			name: "arguments",
			message: providers.Message{
				Role: "assistant",
				ToolCalls: []providers.ToolCall{{
					Arguments: map[string]any{"value": strings.Repeat("a", 40)},
				}},
			},
		},
		{
			name: "thought signature",
			message: providers.Message{
				Role: "assistant",
				ToolCalls: []providers.ToolCall{{
					ThoughtSignature: strings.Repeat("s", 40),
				}},
			},
		},
	}

	baseTokens := al.estimateTokens([]providers.Message{base})
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := al.estimateTokens([]providers.Message{tt.message}); got <= baseTokens {
				t.Fatalf("estimateTokens() = %d, want more than compatibility-field-free estimate %d", got, baseTokens)
			}
		})
	}
}

func TestForceCompressionPreservesCompleteTurnsAndNonLeadingSystem(t *testing.T) {
	al, _, _, _, cleanup := newTestAgentLoop(t)
	defer cleanup()

	agent := al.registry.GetDefaultAgent()
	if agent == nil {
		t.Fatal("default agent not found")
	}

	const sessionKey = "context-budget-turns"
	agent.Sessions.GetOrCreate(sessionKey)
	history := []providers.Message{
		{Role: "user", Content: "prelude question"},
		{Role: "assistant", Content: "prelude answer"},
		{Role: "system", Content: "policy added later"},
		{Role: "user", Content: "tool question"},
		{Role: "assistant", ToolCalls: []providers.ToolCall{
			{ID: "call-1", Name: "lookup"},
			{ID: "call-2", Name: "search"},
		}},
		{Role: "tool", ToolCallID: "call-1", Content: "tool result"},
		{Role: "tool", ToolCallID: "call-2", Content: "second tool result"},
		{Role: "assistant", Content: "tool answer"},
		{Role: "user", Content: "recent question"},
		{Role: "assistant", Content: "recent answer"},
		{Role: "user", Content: "latest question"},
	}
	agent.Sessions.SetHistory(sessionKey, history)

	al.forceCompression(agent, sessionKey)
	got := agent.Sessions.GetHistory(sessionKey)

	if len(got) >= len(history) {
		t.Fatalf("forceCompression kept %d messages, want fewer than original %d", len(got), len(history))
	}
	assertMessageAbsent(t, got, "user", "prelude question")
	assertMessageAbsent(t, got, "user", "tool question")
	assertNoOrphanToolMessages(t, got)
	assertContainsMessage(t, got, "system", "policy added later")
	assertMessageAbsent(t, got, "system", "Emergency compression dropped")
	assertContainsMessage(t, got, "user", "recent question")
	assertContainsMessage(t, got, "user", "latest question")

	built := agent.ContextBuilder.BuildMessages(got, "", "", nil, "test", "chat", "sender", nil)
	if len(built) == 0 || built[0].Role != "system" {
		t.Fatal("BuildMessages did not produce the provider system prompt")
	}
	for _, message := range built {
		if strings.Contains(message.Content, "Emergency compression dropped") {
			t.Fatal("BuildMessages exposed a persisted emergency compression note")
		}
	}
}

func TestCompressedHistorySingleOversizedTurnIsNoOp(t *testing.T) {
	history := []providers.Message{
		{Role: "user", Content: strings.Repeat("界🦞", 10_000)},
		{Role: "assistant", ToolCalls: []providers.ToolCall{
			{ID: "call-1", Name: "lookup"},
			{ID: "call-2", Name: "search"},
		}},
		{Role: "tool", ToolCallID: "call-1", Content: "first result"},
		{Role: "tool", ToolCallID: "call-2", Content: "second result"},
		{Role: "assistant", Content: "answer"},
	}

	got, dropped, compressed := compressedHistory(history)

	if compressed {
		t.Fatal("compressedHistory reported compression for a single active turn")
	}
	if dropped != 0 {
		t.Fatalf("compressedHistory dropped %d messages, want 0", dropped)
	}
	if !reflect.DeepEqual(got, history) {
		t.Fatal("compressedHistory changed a single active turn")
	}
	assertNoOrphanToolMessages(t, got)
}

func assertNoOrphanToolMessages(t *testing.T, messages []providers.Message) {
	t.Helper()
	callIDs := make(map[string]bool)
	resultIDs := make(map[string]bool)
	for _, message := range messages {
		for _, call := range message.ToolCalls {
			callIDs[call.ID] = true
		}
		if message.ToolCallID != "" {
			resultIDs[message.ToolCallID] = true
		}
	}
	for id := range callIDs {
		if !resultIDs[id] {
			t.Fatalf("tool call %q was separated from its result", id)
		}
	}
	for id := range resultIDs {
		if !callIDs[id] {
			t.Fatalf("tool result %q was separated from its call", id)
		}
	}
}

func assertContainsMessage(t *testing.T, messages []providers.Message, role, content string) {
	t.Helper()
	for _, message := range messages {
		if message.Role == role && strings.Contains(message.Content, content) {
			return
		}
	}
	t.Fatalf("message role=%q content containing %q not found", role, content)
}

func assertMessageAbsent(t *testing.T, messages []providers.Message, role, content string) {
	t.Helper()
	for _, message := range messages {
		if message.Role == role && strings.Contains(message.Content, content) {
			t.Fatalf("unexpected message role=%q content containing %q", role, content)
		}
	}
}
