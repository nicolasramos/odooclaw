package providers

import (
	"encoding/json"
	"strconv"
	"strings"
)

// extractToolCallsFromText parses tool call JSON from response text.
// Both ClaudeCliProvider and CodexCliProvider use this to extract
// tool calls that the model outputs in its response text.
func extractToolCallsFromText(text string) []ToolCall {
	if tc := extractWrappedToolCalls(text); len(tc) > 0 {
		return tc
	}
	if tc := extractGemmaToolCalls(text); len(tc) > 0 {
		return tc
	}
	return nil
}

// stripToolCallsFromText removes tool call JSON from response text.
func stripToolCallsFromText(text string) string {
	stripped := stripWrappedToolCalls(text)
	stripped = stripGemmaToolCalls(stripped)
	return strings.TrimSpace(stripped)
}

func extractWrappedToolCalls(text string) []ToolCall {
	start := strings.Index(text, `{"tool_calls"`)
	if start == -1 {
		return nil
	}

	end := findMatchingBrace(text, start)
	jsonStr := ""
	if end > start {
		jsonStr = text[start:end]
	} else {
		lineEnd := strings.IndexByte(text[start:], '\n')
		if lineEnd == -1 {
			lineEnd = len(text) - start
		}
		candidate := strings.TrimSpace(text[start : start+lineEnd])
		repaired, ok := balanceJSONBraces(candidate)
		if !ok {
			return nil
		}
		jsonStr = repaired
	}

	var wrapper struct {
		ToolCalls []struct {
			ID       string `json:"id"`
			Type     string `json:"type"`
			Function struct {
				Name      string `json:"name"`
				Arguments any    `json:"arguments"`
			} `json:"function"`
		} `json:"tool_calls"`
	}

	if err := json.Unmarshal([]byte(jsonStr), &wrapper); err != nil || len(wrapper.ToolCalls) == 0 {
		return nil
	}

	result := make([]ToolCall, 0, len(wrapper.ToolCalls))
	for _, tc := range wrapper.ToolCalls {
		argsMap, argsJSON := decodeToolArguments(tc.Function.Arguments)
		name := normalizeToolCallName(tc.Function.Name)
		if name == "" {
			continue
		}
		typeName := tc.Type
		if typeName == "" {
			typeName = "function"
		}
		result = append(result, ToolCall{
			ID:        tc.ID,
			Type:      typeName,
			Name:      name,
			Arguments: argsMap,
			Function: &FunctionCall{
				Name:      name,
				Arguments: argsJSON,
			},
		})
	}
	if len(result) == 0 {
		return nil
	}
	return result
}

func extractGemmaToolCalls(text string) []ToolCall {
	const token = "call:"
	searchFrom := 0
	callIndex := 1
	result := make([]ToolCall, 0)

	for {
		rel := strings.Index(text[searchFrom:], token)
		if rel == -1 {
			break
		}

		idx := searchFrom + rel
		nameStart := idx + len(token)
		for nameStart < len(text) && (text[nameStart] == ' ' || text[nameStart] == '\t') {
			nameStart++
		}
		if nameStart >= len(text) {
			break
		}

		nameEnd := nameStart
		for nameEnd < len(text) {
			ch := text[nameEnd]
			if ch == '{' || ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '<' {
				break
			}
			nameEnd++
		}
		rawName := strings.TrimSpace(text[nameStart:nameEnd])
		name := normalizeToolCallName(rawName)
		if name == "" {
			searchFrom = nameEnd
			continue
		}

		argStart := nameEnd
		for argStart < len(text) && (text[argStart] == ' ' || text[argStart] == '\t') {
			argStart++
		}

		argsMap := map[string]any{}
		argsJSON := "{}"
		nextFrom := nameEnd
		if argStart < len(text) && text[argStart] == '{' {
			argEnd := findMatchingBrace(text, argStart)
			if argEnd == argStart {
				lineEnd := strings.IndexByte(text[argStart:], '\n')
				if lineEnd == -1 {
					lineEnd = len(text) - argStart
				}
				candidate := strings.TrimSpace(text[argStart : argStart+lineEnd])
				repaired, ok := balanceJSONBraces(candidate)
				if ok {
					argsMap, argsJSON = decodeToolArguments(repaired)
					nextFrom = argStart + lineEnd
				}
			} else {
				argsMap, argsJSON = decodeToolArguments(text[argStart:argEnd])
				nextFrom = argEnd
			}
		}

		result = append(result, ToolCall{
			ID:        "gemma_call_" + strconv.Itoa(callIndex),
			Type:      "function",
			Name:      name,
			Arguments: argsMap,
			Function: &FunctionCall{
				Name:      name,
				Arguments: argsJSON,
			},
		})
		callIndex++
		searchFrom = nextFrom
	}

	if len(result) == 0 {
		return nil
	}
	return result
}

func stripWrappedToolCalls(text string) string {
	for {
		start := strings.Index(text, `{"tool_calls"`)
		if start == -1 {
			return text
		}
		end := findMatchingBrace(text, start)
		if end == start {
			return text
		}
		text = text[:start] + text[end:]
	}
}

func stripGemmaToolCalls(text string) string {
	const token = "call:"
	for {
		rel := strings.Index(text, token)
		if rel == -1 {
			return text
		}
		start := rel
		if prefix := strings.LastIndex(text[:rel], "<|toolcall>"); prefix >= 0 && strings.TrimSpace(text[prefix:rel]) == "<|toolcall>" {
			start = prefix
		}

		nameStart := rel + len(token)
		for nameStart < len(text) && (text[nameStart] == ' ' || text[nameStart] == '\t') {
			nameStart++
		}
		nameEnd := nameStart
		for nameEnd < len(text) {
			ch := text[nameEnd]
			if ch == '{' || ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '<' {
				break
			}
			nameEnd++
		}
		end := nameEnd
		for end < len(text) && (text[end] == ' ' || text[end] == '\t') {
			end++
		}
		if end < len(text) && text[end] == '{' {
			objEnd := findMatchingBrace(text, end)
			if objEnd > end {
				end = objEnd
			} else {
				lineEnd := strings.IndexByte(text[end:], '\n')
				if lineEnd == -1 {
					end = len(text)
				} else {
					end = end + lineEnd
				}
			}
		}
		text = strings.TrimSpace(text[:start] + text[end:])
	}
}

func decodeToolArguments(raw any) (map[string]any, string) {
	argsMap := map[string]any{}
	argsJSON := "{}"

	switch v := raw.(type) {
	case string:
		candidate := strings.TrimSpace(v)
		if candidate == "" {
			return argsMap, argsJSON
		}
		repaired, ok := balanceJSONBraces(candidate)
		if ok {
			candidate = repaired
		}
		var parsed map[string]any
		if err := json.Unmarshal([]byte(candidate), &parsed); err == nil && parsed != nil {
			argsMap = parsed
			argsJSON = candidate
			return argsMap, argsJSON
		}
		argsJSONBytes, _ := json.Marshal(map[string]any{"_raw": candidate})
		return argsMap, string(argsJSONBytes)
	case map[string]any:
		if v == nil {
			return argsMap, argsJSON
		}
		argsMap = v
		if encoded, err := json.Marshal(v); err == nil {
			argsJSON = string(encoded)
		}
		return argsMap, argsJSON
	}

	return argsMap, argsJSON
}

func normalizeToolCallName(name string) string {
	name = strings.TrimSpace(name)
	name = strings.Trim(name, "\"'`")
	if name == "" {
		return ""
	}
	if strings.HasPrefix(name, "mcp") && !strings.HasPrefix(name, "mcp_") {
		name = "mcp_" + strings.TrimPrefix(name, "mcp")
	}
	name = strings.ReplaceAll(name, "::", "_")
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, ".", "_")
	for strings.Contains(name, "__") {
		name = strings.ReplaceAll(name, "__", "_")
	}
	return name
}

func balanceJSONBraces(input string) (string, bool) {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return "", false
	}
	if json.Valid([]byte(trimmed)) {
		return trimmed, true
	}

	depth := 0
	for i := 0; i < len(trimmed); i++ {
		switch trimmed[i] {
		case '{':
			depth++
		case '}':
			depth--
			if depth < 0 {
				return "", false
			}
		}
	}
	if depth <= 0 {
		return "", false
	}

	repaired := trimmed + strings.Repeat("}", depth)
	if json.Valid([]byte(repaired)) {
		return repaired, true
	}
	return "", false
}
