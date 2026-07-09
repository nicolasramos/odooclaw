package openai_compat

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/nicolasramos/odooclaw/pkg/providers/protocoltypes"
)

type (
	ToolCall               = protocoltypes.ToolCall
	FunctionCall           = protocoltypes.FunctionCall
	LLMResponse            = protocoltypes.LLMResponse
	UsageInfo              = protocoltypes.UsageInfo
	Message                = protocoltypes.Message
	ToolDefinition         = protocoltypes.ToolDefinition
	ToolFunctionDefinition = protocoltypes.ToolFunctionDefinition
	ExtraContent           = protocoltypes.ExtraContent
	GoogleExtra            = protocoltypes.GoogleExtra
	ReasoningDetail        = protocoltypes.ReasoningDetail
)

type Provider struct {
	apiKey         string
	apiBase        string
	maxTokensField string // Field name for max tokens (e.g., "max_completion_tokens" for o1/glm models)
	httpClient     *http.Client
}

type Option func(*Provider)

const defaultRequestTimeout = 120 * time.Second

func WithMaxTokensField(maxTokensField string) Option {
	return func(p *Provider) {
		p.maxTokensField = maxTokensField
	}
}

func WithRequestTimeout(timeout time.Duration) Option {
	return func(p *Provider) {
		if timeout > 0 {
			p.httpClient.Timeout = timeout
		}
	}
}

func NewProvider(apiKey, apiBase, proxy string, opts ...Option) *Provider {
	client := &http.Client{
		Timeout: defaultRequestTimeout,
	}

	if proxy != "" {
		parsed, err := url.Parse(proxy)
		if err == nil {
			client.Transport = &http.Transport{
				Proxy: http.ProxyURL(parsed),
			}
		} else {
			log.Printf("openai_compat: invalid proxy URL %q: %v", proxy, err)
		}
	}

	p := &Provider{
		apiKey:     apiKey,
		apiBase:    strings.TrimRight(apiBase, "/"),
		httpClient: client,
	}

	for _, opt := range opts {
		if opt != nil {
			opt(p)
		}
	}

	return p
}

func NewProviderWithMaxTokensField(apiKey, apiBase, proxy, maxTokensField string) *Provider {
	return NewProvider(apiKey, apiBase, proxy, WithMaxTokensField(maxTokensField))
}

func NewProviderWithMaxTokensFieldAndTimeout(
	apiKey, apiBase, proxy, maxTokensField string,
	requestTimeoutSeconds int,
) *Provider {
	return NewProvider(
		apiKey,
		apiBase,
		proxy,
		WithMaxTokensField(maxTokensField),
		WithRequestTimeout(time.Duration(requestTimeoutSeconds)*time.Second),
	)
}

func (p *Provider) Chat(
	ctx context.Context,
	messages []Message,
	tools []ToolDefinition,
	model string,
	options map[string]any,
) (*LLMResponse, error) {
	if p.apiBase == "" {
		return nil, fmt.Errorf("API base not configured")
	}

	model = normalizeModel(model, p.apiBase)

	requestBody := map[string]any{
		"model":    model,
		"messages": serializeMessages(messages),
	}

	if len(tools) > 0 {
		requestBody["tools"] = tools
		requestBody["tool_choice"] = "auto"
	}

	if maxTokens, ok := asInt(options["max_tokens"]); ok {
		// Use configured maxTokensField if specified, otherwise fallback to model-based detection
		fieldName := p.maxTokensField
		if fieldName == "" {
			// Fallback: detect from model name for backward compatibility
			lowerModel := strings.ToLower(model)
			if strings.Contains(lowerModel, "glm") || strings.Contains(lowerModel, "o1") ||
				strings.Contains(lowerModel, "gpt-5") {
				fieldName = "max_completion_tokens"
			} else {
				fieldName = "max_tokens"
			}
		}
		requestBody[fieldName] = maxTokens
	}

	if temperature, ok := asFloat(options["temperature"]); ok {
		lowerModel := strings.ToLower(model)
		// Kimi k2 models only support temperature=1.
		if strings.Contains(lowerModel, "kimi") && strings.Contains(lowerModel, "k2") {
			requestBody["temperature"] = 1.0
		} else {
			requestBody["temperature"] = temperature
		}
	}

	// Prompt caching: pass a stable cache key so OpenAI can bucket requests
	// with the same key and reuse prefix KV cache across calls.
	// The key is typically the agent ID — stable per agent, shared across requests.
	// See: https://platform.openai.com/docs/guides/prompt-caching
	// Prompt caching is only supported by OpenAI-native endpoints.
	// Most OpenAI-compatible providers (Groq, Ollama, vLLM, Mistral, etc.)
	// actively reject this field.
	// Only send to api.openai.com where this feature is confirmed to work.
	// Add other endpoints here only when prompt_cache_key support is verified.
	if cacheKey, ok := options["prompt_cache_key"].(string); ok && cacheKey != "" {
		supportsCacheKey := strings.Contains(p.apiBase, "api.openai.com")
		if supportsCacheKey {
			requestBody["prompt_cache_key"] = cacheKey
		}
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", p.apiBase+"/chat/completions", bytes.NewReader(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if p.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+p.apiKey)
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed:\n  Status: %d\n  Body:   %s", resp.StatusCode, string(body))
	}

	return parseResponse(body)
}

func parseResponse(body []byte) (*LLMResponse, error) {
	var apiResponse struct {
		Choices []struct {
			Message struct {
				Content          string            `json:"content"`
				ReasoningContent string            `json:"reasoning_content"`
				Reasoning        string            `json:"reasoning"`
				ReasoningDetails []ReasoningDetail `json:"reasoning_details"`
				ToolCalls        []struct {
					ID       string `json:"id"`
					Type     string `json:"type"`
					Function *struct {
						Name      string `json:"name"`
						Arguments string `json:"arguments"`
					} `json:"function"`
					ExtraContent *struct {
						Google *struct {
							ThoughtSignature string `json:"thought_signature"`
						} `json:"google"`
					} `json:"extra_content"`
				} `json:"tool_calls"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage *UsageInfo `json:"usage"`
	}

	if err := json.Unmarshal(body, &apiResponse); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(apiResponse.Choices) == 0 {
		return &LLMResponse{
			Content:      "",
			FinishReason: "stop",
		}, nil
	}

	choice := apiResponse.Choices[0]
	toolCalls := make([]ToolCall, 0, len(choice.Message.ToolCalls))
	for _, tc := range choice.Message.ToolCalls {
		arguments := make(map[string]any)
		name := ""

		// Extract thought_signature from Gemini/Google-specific extra content
		thoughtSignature := ""
		if tc.ExtraContent != nil && tc.ExtraContent.Google != nil {
			thoughtSignature = tc.ExtraContent.Google.ThoughtSignature
		}

		if tc.Function != nil {
			name = tc.Function.Name
			if tc.Function.Arguments != "" {
				if err := json.Unmarshal([]byte(tc.Function.Arguments), &arguments); err != nil {
					log.Printf("openai_compat: failed to decode tool call arguments for %q: %v", name, err)
					arguments["raw"] = tc.Function.Arguments
				}
			}
		}

		// Build ToolCall with ExtraContent for Gemini 3 thought_signature persistence
		toolCall := ToolCall{
			ID:               tc.ID,
			Name:             name,
			Arguments:        arguments,
			ThoughtSignature: thoughtSignature,
		}

		if thoughtSignature != "" {
			toolCall.ExtraContent = &ExtraContent{
				Google: &GoogleExtra{
					ThoughtSignature: thoughtSignature,
				},
			}
		}

		toolCalls = append(toolCalls, toolCall)
	}

	content := choice.Message.Content
	finishReason := choice.FinishReason
	if len(toolCalls) == 0 {
		if extracted := extractGemmaContentToolCalls(content); len(extracted) > 0 {
			toolCalls = extracted
			content = stripGemmaContentToolCalls(content)
			if finishReason == "" || finishReason == "stop" {
				finishReason = "tool_calls"
			}
		}
	}
	if len(toolCalls) == 0 {
		if extracted := extractMiniCPMContentToolCalls(content); len(extracted) > 0 {
			toolCalls = extracted
			content = stripMiniCPMContentToolCalls(content)
			if finishReason == "" || finishReason == "stop" {
				finishReason = "tool_calls"
			}
		}
	}

	return &LLMResponse{
		Content:          strings.TrimSpace(content),
		ReasoningContent: choice.Message.ReasoningContent,
		Reasoning:        choice.Message.Reasoning,
		ReasoningDetails: choice.Message.ReasoningDetails,
		ToolCalls:        toolCalls,
		FinishReason:     finishReason,
		Usage:            apiResponse.Usage,
	}, nil
}

func extractGemmaContentToolCalls(text string) []ToolCall {
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
		name := normalizeGemmaToolName(rawName)
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
			if argEnd > argStart {
				rawArgs := strings.TrimSpace(text[argStart+1 : argEnd-1])
				argsMap = parseGemmaArguments(rawArgs)
				if encoded, err := json.Marshal(argsMap); err == nil {
					argsJSON = string(encoded)
				}
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

func stripGemmaContentToolCalls(text string) string {
	const token = "call:"
	for {
		rel := strings.Index(text, token)
		if rel == -1 {
			return text
		}

		start := rel
		if prefix := strings.LastIndex(text[:rel], "<|tool_call>"); prefix >= 0 && strings.TrimSpace(text[prefix:rel]) == "<|tool_call>" {
			start = prefix
		} else if prefix := strings.LastIndex(text[:rel], "<|toolcall>"); prefix >= 0 && strings.TrimSpace(text[prefix:rel]) == "<|toolcall>" {
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
			argEnd := findMatchingBrace(text, end)
			if argEnd > end {
				end = argEnd
			}
		}

		if suffix := strings.Index(text[end:], "<tool_call|>"); suffix >= 0 && suffix < 20 {
			end = end + suffix + len("<tool_call|>")
		}
		text = strings.TrimSpace(text[:start] + text[end:])
	}
}


// extractMiniCPMContentToolCalls parses MiniCPM's native XML tool call format:
//
//	<name>tool_name</name>
//	{"arg1": "val1", "arg2": "val2"}
//
// This format is used by fine-tuned MiniCPM models (e.g. OdooClaw Light V7 v3).
func extractMiniCPMContentToolCalls(text string) []ToolCall {
	const openTag = "<name>"
	const closeTag = "</name>"
	searchFrom := 0
	callIndex := 1
	result := make([]ToolCall, 0)

	for {
		rel := strings.Index(text[searchFrom:], openTag)
		if rel == -1 {
			break
		}
		start := searchFrom + rel
		nameStart := start + len(openTag)
		nameEnd := strings.Index(text[nameStart:], closeTag)
		if nameEnd == -1 {
			break
		}
		nameEnd = nameStart + nameEnd

		name := strings.TrimSpace(text[nameStart:nameEnd])
		if name == "" {
			searchFrom = nameEnd + len(closeTag)
			continue
		}

		// Find JSON args after </name>
		argSearchFrom := nameEnd + len(closeTag)
		argStart := argSearchFrom
		for argStart < len(text) && (text[argStart] == ' ' || text[argStart] == '\t' || text[argStart] == '\n' || text[argStart] == '\r') {
			argStart++
		}

		argsMap := map[string]any{}
		argsJSON := "{}"
		nextFrom := argSearchFrom

		if argStart < len(text) && text[argStart] == '{' {
			argEnd := findMatchingBrace(text, argStart)
			if argEnd > argStart {
				rawJSON := text[argStart:argEnd]
				if err := json.Unmarshal([]byte(rawJSON), &argsMap); err == nil {
					if encoded, err := json.Marshal(argsMap); err == nil {
						argsJSON = string(encoded)
					}
				}
				nextFrom = argEnd
			}
		}

		result = append(result, ToolCall{
			ID:        "minicpm_call_" + strconv.Itoa(callIndex),
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

// stripMiniCPMContentToolCalls removes MiniCPM XML tool call markup from text,
// leaving only the natural language content.
func stripMiniCPMContentToolCalls(text string) string {
	const openTag = "<name>"
	const closeTag = "</name>"
	for {
		start := strings.Index(text, openTag)
		if start == -1 {
			return text
		}
		nameStart := start + len(openTag)
		nameEnd := strings.Index(text[nameStart:], closeTag)
		if nameEnd == -1 {
			return text
		}
		nameEnd = nameStart + nameEnd
		argSearchFrom := nameEnd + len(closeTag)
		argStart := argSearchFrom
		for argStart < len(text) && (text[argStart] == ' ' || text[argStart] == '\t' || text[argStart] == '\n' || text[argStart] == '\r') {
			argStart++
		}
		end := argSearchFrom
		if argStart < len(text) && text[argStart] == '{' {
			argEnd := findMatchingBrace(text, argStart)
			if argEnd > argStart {
				end = argEnd
			}
		}
		text = strings.TrimSpace(text[:start] + text[end:])
	}
}


func normalizeGemmaToolName(name string) string {
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

func parseGemmaArguments(raw string) map[string]any {
	result := map[string]any{}
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return result
	}

	if parsed, ok := parseGemmaObject(trimmed); ok && len(parsed) > 0 {
		return parsed
	}

	if len(result) == 0 {
		result["_raw"] = trimmed
	}
	return result
}

func parseGemmaObject(raw string) (map[string]any, bool) {
	obj := map[string]any{}
	s := strings.TrimSpace(raw)
	if s == "" {
		return nil, false
	}

	parts := splitTopLevel(s, ',')
	if len(parts) == 0 {
		return nil, false
	}

	for _, part := range parts {
		piece := strings.TrimSpace(part)
		if piece == "" {
			continue
		}
		idx := indexTopLevelColon(piece)
		if idx <= 0 {
			continue
		}
		key := sanitizeGemmaString(piece[:idx])
		if key == "" {
			continue
		}
		valueRaw := strings.TrimSpace(piece[idx+1:])
		obj[key] = parseGemmaValue(valueRaw)
	}

	if len(obj) == 0 {
		return nil, false
	}
	return obj, true
}

func parseGemmaValue(raw string) any {
	v := strings.TrimSpace(raw)
	if v == "" {
		return ""
	}

	v = strings.ReplaceAll(v, `<|"|>`, `"`)

	if strings.HasPrefix(v, "{") && strings.HasSuffix(v, "}") {
		inner := strings.TrimSpace(v[1 : len(v)-1])
		if nested, ok := parseGemmaObject(inner); ok {
			return nested
		}
	}

	if strings.HasPrefix(v, "[") && strings.HasSuffix(v, "]") {
		var arr any
		if err := json.Unmarshal([]byte(v), &arr); err == nil {
			return arr
		}
	}

	v = sanitizeGemmaString(v)
	if n, err := strconv.Atoi(v); err == nil {
		return n
	}
	if f, err := strconv.ParseFloat(v, 64); err == nil {
		return f
	}
	if strings.EqualFold(v, "true") {
		return true
	}
	if strings.EqualFold(v, "false") {
		return false
	}
	return v
}

func sanitizeGemmaString(s string) string {
	out := strings.TrimSpace(s)
	out = strings.ReplaceAll(out, `<|"|>`, `"`)
	out = strings.Trim(out, " \t\n\r\"'`")
	for strings.HasSuffix(out, "}") && !strings.Contains(out, "{") {
		out = strings.TrimSuffix(out, "}")
	}
	return strings.TrimSpace(out)
}

func splitTopLevel(input string, sep byte) []string {
	parts := make([]string, 0)
	start := 0
	braceDepth := 0
	bracketDepth := 0
	inString := false
	var quote byte

	for i := 0; i < len(input); i++ {
		ch := input[i]
		if inString {
			if ch == '\\' {
				i++
				continue
			}
			if ch == quote {
				inString = false
			}
			continue
		}

		switch ch {
		case '\'', '"':
			inString = true
			quote = ch
		case '{':
			braceDepth++
		case '}':
			if braceDepth > 0 {
				braceDepth--
			}
		case '[':
			bracketDepth++
		case ']':
			if bracketDepth > 0 {
				bracketDepth--
			}
		case sep:
			if braceDepth == 0 && bracketDepth == 0 {
				parts = append(parts, input[start:i])
				start = i + 1
			}
		}
	}

	if start <= len(input) {
		parts = append(parts, input[start:])
	}
	return parts
}

func indexTopLevelColon(input string) int {
	braceDepth := 0
	bracketDepth := 0
	inString := false
	var quote byte

	for i := 0; i < len(input); i++ {
		ch := input[i]
		if inString {
			if ch == '\\' {
				i++
				continue
			}
			if ch == quote {
				inString = false
			}
			continue
		}

		switch ch {
		case '\'', '"':
			inString = true
			quote = ch
		case '{':
			braceDepth++
		case '}':
			if braceDepth > 0 {
				braceDepth--
			}
		case '[':
			bracketDepth++
		case ']':
			if bracketDepth > 0 {
				bracketDepth--
			}
		case ':':
			if braceDepth == 0 && bracketDepth == 0 {
				return i
			}
		}
	}

	return -1
}

func findMatchingBrace(text string, start int) int {
	if start < 0 || start >= len(text) || text[start] != '{' {
		return start
	}

	depth := 0
	for i := start; i < len(text); i++ {
		switch text[i] {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return i + 1
			}
		}
	}
	return start
}

// openaiMessage is the wire-format message for OpenAI-compatible APIs.
// It mirrors protocoltypes.Message but omits SystemParts, which is an
// internal field that would be unknown to third-party endpoints.
type openaiMessage struct {
	Role             string     `json:"role"`
	Content          string     `json:"content"`
	ReasoningContent string     `json:"reasoning_content,omitempty"`
	ToolCalls        []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID       string     `json:"tool_call_id,omitempty"`
}

// serializeMessages converts internal Message structs to the OpenAI wire format.
// - Strips SystemParts (unknown to third-party endpoints)
// - Converts messages with Media to multipart content format (text + image_url parts)
// - Preserves ToolCallID, ToolCalls, and ReasoningContent for all messages
func serializeMessages(messages []Message) []any {
	out := make([]any, 0, len(messages))
	for _, m := range messages {
		if len(m.Media) == 0 {
			out = append(out, openaiMessage{
				Role:             m.Role,
				Content:          m.Content,
				ReasoningContent: m.ReasoningContent,
				ToolCalls:        m.ToolCalls,
				ToolCallID:       m.ToolCallID,
			})
			continue
		}

		// Multipart content format for messages with media
		parts := make([]map[string]any, 0, 1+len(m.Media))
		if m.Content != "" {
			parts = append(parts, map[string]any{
				"type": "text",
				"text": m.Content,
			})
		}
		for _, mediaURL := range m.Media {
			parts = append(parts, map[string]any{
				"type": "image_url",
				"image_url": map[string]any{
					"url": mediaURL,
				},
			})
		}

		msg := map[string]any{
			"role":    m.Role,
			"content": parts,
		}
		if m.ToolCallID != "" {
			msg["tool_call_id"] = m.ToolCallID
		}
		if len(m.ToolCalls) > 0 {
			msg["tool_calls"] = m.ToolCalls
		}
		if m.ReasoningContent != "" {
			msg["reasoning_content"] = m.ReasoningContent
		}
		out = append(out, msg)
	}
	return out
}

func normalizeModel(model, apiBase string) string {
	before, after, ok := strings.Cut(model, "/")
	if !ok {
		return model
	}

	if strings.Contains(strings.ToLower(apiBase), "openrouter.ai") {
		return model
	}

	prefix := strings.ToLower(before)
	switch prefix {
	case "litellm", "moonshot", "nvidia", "groq", "ollama", "deepseek", "google", "openrouter", "zhipu", "mistral":
		return after
	default:
		return model
	}
}

func asInt(v any) (int, bool) {
	switch val := v.(type) {
	case int:
		return val, true
	case int64:
		return int(val), true
	case float64:
		return int(val), true
	case float32:
		return int(val), true
	default:
		return 0, false
	}
}

func asFloat(v any) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case float32:
		return float64(val), true
	case int:
		return float64(val), true
	case int64:
		return float64(val), true
	default:
		return 0, false
	}
}
