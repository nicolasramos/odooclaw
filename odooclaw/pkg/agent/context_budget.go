package agent

import (
	"encoding/json"
	"fmt"
	"unicode/utf8"

	"github.com/nicolasramos/odooclaw/pkg/providers"
)

// estimateMessageTokens estimates serialized message cost using a conservative
// 2.5-runes-per-token heuristic.
func estimateMessageTokens(messages []providers.Message) int {
	totalRunes := 0
	for _, message := range messages {
		encoded, err := json.Marshal(message)
		if err == nil {
			totalRunes += utf8.RuneCount(encoded)
		}
		for _, call := range message.ToolCalls {
			// These compatibility fields are intentionally excluded from JSON.
			totalRunes += utf8.RuneCountInString(call.Name)
			totalRunes += utf8.RuneCountInString(call.ThoughtSignature)
			if encodedArgs, err := json.Marshal(call.Arguments); err == nil {
				totalRunes += utf8.RuneCount(encodedArgs)
			}
		}
	}
	return (totalRunes*2 + 4) / 5
}

// compressedHistory drops complete oldest turns. A turn boundary starts at a
// user message, so assistant tool calls and their tool results stay together.
func compressedHistory(history []providers.Message) ([]providers.Message, int, bool) {
	if len(history) <= 4 {
		return history, 0, false
	}

	cut := -1
	for i := len(history) / 2; i < len(history); i++ {
		if history[i].Role == "user" {
			cut = i
			break
		}
	}
	if cut < 0 {
		for i := len(history)/2 - 1; i > 0; i-- {
			if history[i].Role == "user" {
				cut = i
				break
			}
		}
	}
	if cut <= 0 {
		return history, 0, false
	}

	result := make([]providers.Message, 0, len(history)-cut+1)
	dropped := 0
	for i, message := range history {
		if i < cut && message.Role != "system" {
			dropped++
			continue
		}
		result = append(result, message)
	}
	if dropped == 0 {
		return history, 0, false
	}

	note := fmt.Sprintf(
		"[System Note: Emergency compression dropped %d oldest messages due to context limit]",
		dropped,
	)
	for i := range result {
		if result[i].Role == "system" {
			result[i].Content += "\n\n" + note
			return result, dropped, true
		}
	}

	result = append([]providers.Message{{Role: "system", Content: note}}, result...)
	return result, dropped, true
}
