package openai_compat

import (
	"encoding/json"
	"strconv"
	"strings"
)

// extractJSONBlockToolCalls recovers a tool call the model wrote as a fenced
// JSON block instead of emitting it. Small models do this when a request needs
// a plan ("primero busco al partner..."): the call ends up in the prose and the
// action never runs.
//
// Only two shapes are accepted, both unambiguous:
//
//	{"tool": "odoo_find_partner", "parameters": {...}}
//	{"name": "odoo_find_partner", "arguments": {...}}
//
// A JSON block of plain data (an invoice dump, a record payload) has neither a
// tool/name field at the top level with an arguments/parameters sibling, so it
// is left untouched.
func extractJSONBlockToolCalls(text string) []ToolCall {
	var calls []ToolCall
	for _, block := range fencedJSONBlocks(text) {
		name, args, ok := parseJSONBlockCall(block.raw)
		if !ok {
			continue
		}
		argsJSON, err := json.Marshal(args)
		if err != nil {
			continue
		}
		calls = append(calls, ToolCall{
			ID:        "jsonblock_call_" + strconv.Itoa(len(calls)+1),
			Type:      "function",
			Name:      name,
			Arguments: args,
			Function:  &FunctionCall{Name: name, Arguments: string(argsJSON)},
		})
	}
	return calls
}

// stripJSONBlockToolCalls removes the fenced blocks that were recovered as tool
// calls, so the user does not see the raw call echoed in the answer.
func stripJSONBlockToolCalls(text string) string {
	out := text
	for _, block := range fencedJSONBlocks(text) {
		if _, _, ok := parseJSONBlockCall(block.raw); !ok {
			continue
		}
		out = strings.Replace(out, block.fenced, "", 1)
	}
	return strings.TrimSpace(out)
}

type fencedBlock struct {
	fenced string // the whole ```...``` chunk, delimiters included
	raw    string // inner content
}

// fencedJSONBlocks returns every ```json (or bare ```) block in the text.
func fencedJSONBlocks(text string) []fencedBlock {
	var blocks []fencedBlock
	rest := text
	for {
		start := strings.Index(rest, "```")
		if start < 0 {
			return blocks
		}
		after := rest[start+3:]
		// Optional language tag up to the first newline.
		if nl := strings.IndexByte(after, '\n'); nl >= 0 {
			tag := strings.TrimSpace(after[:nl])
			if tag == "json" || tag == "JSON" || tag == "" {
				body := after[nl+1:]
				if end := strings.Index(body, "```"); end >= 0 {
					fenced := rest[start : start+3+nl+1+end+3]
					blocks = append(blocks, fencedBlock{fenced: fenced, raw: body[:end]})
					rest = body[end+3:]
					continue
				}
			}
		}
		// Not a usable block: skip this fence and keep scanning.
		rest = rest[start+3:]
	}
}

// parseJSONBlockCall reads one JSON object and returns a tool name plus its
// arguments when the object has the call shape. Accepts arguments encoded as a
// nested object or as a JSON string.
func parseJSONBlockCall(raw string) (string, map[string]any, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || trimmed[0] != '{' {
		return "", nil, false
	}
	var obj map[string]any
	if err := json.Unmarshal([]byte(trimmed), &obj); err != nil {
		return "", nil, false
	}

	name, _ := obj["tool"].(string)
	if name == "" {
		name, _ = obj["name"].(string)
	}
	if name == "" {
		return "", nil, false
	}
	name = normalizeGemmaToolName(name)

	var args map[string]any
	switch v := obj["arguments"].(type) {
	case map[string]any:
		args = v
	case string:
		_ = json.Unmarshal([]byte(v), &args)
	}
	if args == nil {
		if v, ok := obj["parameters"].(map[string]any); ok {
			args = v
		}
	}
	if args == nil {
		args = map[string]any{}
	}
	return name, args, true
}
