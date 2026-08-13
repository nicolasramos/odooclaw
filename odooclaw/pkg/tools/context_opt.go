package tools

import (
	"strings"

	"github.com/nicolasramos/odooclaw/pkg/providers"
)

// ContextOptimizer reduces token usage by applying compression techniques
// to tool definitions before sending them to the LLM.
type ContextOptimizer struct {
	// MaxTokens is the maximum total token budget for tool definitions.
	MaxTokens int
}

// NewContextOptimizer creates an optimizer with a 1K token budget.
func NewContextOptimizer() *ContextOptimizer {
	return &ContextOptimizer{
		MaxTokens: 1000,
	}
}

// CompactSchema produces a reduced-parameter schema that preserves only
// essential type information. Strips descriptions, constraints, examples,
// and nested object details beyond one level deep.
//
// Rough savings: ~40-60% fewer tokens vs full schema.
func CompactSchema(tool Tool) map[string]any {
	fullSchema := ToolToSchema(tool)
	fn, ok := fullSchema["function"].(map[string]any)
	if !ok {
		return fullSchema
	}

	name, _ := fn["name"].(string)
	desc, _ := fn["description"].(string)
	params, _ := fn["parameters"].(map[string]any)

	compactParams := compactParams(params)

	return map[string]any{
		"type": "function",
		"function": map[string]any{
			"name":        name,
			"description": desc,
			"parameters":  compactParams,
		},
	}
}

// compactParams reduces parameter schemas to minimal type-only form.
func compactParams(params map[string]any) map[string]any {
	if params == nil {
		return nil
	}

	result := make(map[string]any)

	// Keep "type" at root level
	if t, ok := params["type"].(string); ok {
		result["type"] = t
	}

	// Keep "required" array (needed for validation)
	if req, ok := params["required"].([]any); ok {
		result["required"] = req
	}

	// Compact properties: keep name, type, and enum only
	props, ok := params["properties"].(map[string]any)
	if !ok {
		return result
	}

	compactProps := make(map[string]any, len(props))
	for propName, propVal := range props {
		if propMap, ok := propVal.(map[string]any); ok {
			compact := make(map[string]any)
			if t, ok := propMap["type"].(string); ok {
				compact["type"] = t
			}
			if e, ok := propMap["enum"]; ok {
				compact["enum"] = e
			}
			// Include name as hint
			if n, ok := propMap["name"].(string); ok {
				compact["name"] = n
			}
			compactProps[propName] = compact
		} else {
			compactProps[propName] = propVal
		}
	}

	result["properties"] = compactProps
	return result
}

// EstimateTokens provides a rough token count estimate for tool definitions.
// Uses a simple heuristic: ~4 chars per token.
func EstimateTokens(defs []providers.ToolDefinition) int {
	total := 0
	for _, def := range defs {
		total += estimateDefTokens(def)
	}
	return total
}

func estimateDefTokens(def providers.ToolDefinition) int {
	nameLen := len(def.Function.Name)
	descLen := len(def.Function.Description)

	paramLen := 0
	if def.Function.Parameters != nil {
		if props, ok := def.Function.Parameters["properties"].(map[string]any); ok {
			for propName, propVal := range props {
				paramLen += len(propName)
				if propMap, ok := propVal.(map[string]any); ok {
					if t, ok := propMap["type"].(string); ok {
						paramLen += len(t)
					}
				}
			}
		}
	}

	// Total chars / 4 ≈ tokens
	return (nameLen + descLen + paramLen + 100) / 4
}

// OptimizeToolDefs takes a full set of tool definitions and returns a reduced set
// that fits within the token budget. Tools are prioritized by:
// 1. Core tools (always included)
// 2. Previously used tools
// 3. Query-relevant tools (if retrieval info provided)
func OptimizeToolDefs(
	allDefs []providers.ToolDefinition,
	usedTools []string,
	queryRelevant []string,
	maxTokens int,
) []providers.ToolDefinition {
	if maxTokens <= 0 {
		maxTokens = 1000
	}

	usedSet := make(map[string]bool, len(usedTools))
	for _, name := range usedTools {
		usedSet[name] = true
	}
	relevantSet := make(map[string]bool, len(queryRelevant))
	for _, name := range queryRelevant {
		relevantSet[name] = true
	}

	// Score each tool: core=100, used=50, relevant=30, other=10
	type scored struct {
		def    providers.ToolDefinition
		score  int
		isCore bool
	}

	scoredDefs := make([]scored, 0, len(allDefs))
	for _, def := range allDefs {
		s := scored{def: def, score: 10}
		name := def.Function.Name
		if isCoreTool(name) {
			s.score = 100
			s.isCore = true
		} else if usedSet[name] {
			s.score = 50
		} else if relevantSet[name] {
			s.score = 30
		}
		scoredDefs = append(scoredDefs, s)
	}

	// Sort by score descending
	for i := 1; i < len(scoredDefs); i++ {
		for j := i; j > 0 && scoredDefs[j].score > scoredDefs[j-1].score; j-- {
			scoredDefs[j], scoredDefs[j-1] = scoredDefs[j-1], scoredDefs[j]
		}
	}

	// Greedy selection: add tools until budget exhausted
	var result []providers.ToolDefinition
	usedTokens := 0
	for _, sd := range scoredDefs {
		tokens := estimateDefTokens(sd.def)
		if usedTokens+tokens > maxTokens && !sd.isCore {
			continue
		}
		// Always include core tools
		if sd.isCore || usedTokens+tokens <= maxTokens {
			result = append(result, sd.def)
			usedTokens += tokens
		}
	}

	return result
}

// BuildCompactToolList generates a human-readable compact list of tools
// for system prompts. Each tool is one line: "name - description".
func BuildCompactToolList(defs []providers.ToolDefinition) string {
	var sb strings.Builder
	sb.WriteString("Available tools:\n")
	for _, def := range defs {
		sb.WriteString("- ")
		sb.WriteString(def.Function.Name)
		sb.WriteString(": ")
		desc := def.Function.Description
		if len(desc) > 80 {
			desc = desc[:77] + "..."
		}
		sb.WriteString(desc)
		sb.WriteString("\n")
	}
	return sb.String()
}
