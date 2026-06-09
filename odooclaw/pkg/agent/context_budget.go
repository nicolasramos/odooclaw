package agent

import (
	"encoding/json"
	"unicode/utf8"

	"github.com/nicolasramos/odooclaw/pkg/providers"
)

// estimateMessageTokens applies a conservative lower bound to serialized
// message cost: at most four ASCII bytes or two UTF-8 multibyte bytes per
// estimated token. This keeps ordinary ASCII near four characters per token,
// while budgeting at least 1.5 tokens per three-byte CJK rune and two tokens per
// four-byte emoji rune. It is a safety estimate, not a provider tokenizer.
func estimateMessageTokens(messages []providers.Message) int {
	weightedBytes := 0
	count := func(encoded []byte) {
		for _, b := range encoded {
			weightedBytes++
			if b >= utf8.RuneSelf {
				weightedBytes++
			}
		}
	}

	for _, message := range messages {
		encoded, err := json.Marshal(message)
		if err == nil {
			count(encoded)
		}
		for _, call := range message.ToolCalls {
			// These compatibility fields are intentionally excluded from JSON.
			count([]byte(call.Name))
			count([]byte(call.ThoughtSignature))
			if encodedArgs, err := json.Marshal(call.Arguments); err == nil {
				count(encodedArgs)
			}
		}
	}
	return (weightedBytes + 3) / 4
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

	return result, dropped, true
}
