package toolguard

import (
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// SchemaFromMCPTool converts a single *mcp.Tool (as returned by
// the MCP server's tools/list) into a ToolSchema suitable for the
// validator. The conversion is best-effort: unknown JSON-schema
// features degrade gracefully to PropertySpec.Type = "Any" so
// the validator never blocks on a schema it does not understand.
//
// `serverName` is recorded in Schema.Source for debug.
//
// Parameters are expected in the JSON-schema shape used by MCP:
//   {
//     "type": "object",
//     "properties": { "name": {"type": "string"}, ... },
//     "required": ["name", ...]
//   }
func SchemaFromMCPTool(tool *mcp.Tool, serverName string) (ToolSchema, error) {
	if tool == nil {
		return ToolSchema{}, fmt.Errorf("nil tool")
	}
	schema := ToolSchema{
		Name:        tool.Name,
		Description: tool.Description,
		Properties:  map[string]PropertySpec{},
		Required:    []string{},
		Source:      serverName,
	}

	// Safety block: extract from the tool description BEFORE
	// any early return on InputSchema == nil. Safety is a
	// first-class concern, not an optional side effect.
	desc := strings.ToLower(tool.Description)
	if strings.Contains(desc, "requiere confirm") || strings.Contains(desc, "requires confirm") {
		schema.RequiresConfirmation = true
	}
	if strings.Contains(desc, "dry_run") || strings.Contains(desc, "dry-run") || strings.Contains(desc, "soporta dry") || strings.Contains(desc, "supports dry") {
		schema.SupportsDryRun = true
	}

	// The MCP SDK exposes the input schema as a struct with
	// Type, Properties (any), and Required ([]string). Decode
	// it via the standard encoding/json path so we don't depend
	// on internal types.
	if tool.InputSchema == nil {
		return schema, nil
	}
	raw, err := json.Marshal(tool.InputSchema)
	if err != nil {
		return schema, fmt.Errorf("marshal input schema: %w", err)
	}
	var input struct {
		Type       string                          `json:"type"`
		Properties map[string]json.RawMessage      `json:"properties"`
		Required   []string                        `json:"required"`
	}
	if err := json.Unmarshal(raw, &input); err != nil {
		return schema, fmt.Errorf("unmarshal input schema: %w", err)
	}
	schema.Required = input.Required

	for name, propJSON := range input.Properties {
		spec, err := parsePropertySpec(name, propJSON)
		if err != nil {
			// Don't fail the whole tool: degrade to a permissive
			// spec so the validator still accepts the call.
			spec = PropertySpec{
				Name: name,
				Type: "Any",
			}
		}
		// Top-level required list is the canonical source; the
		// properties[].required field is also honoured when
		// present (some MCP servers emit one or the other).
		if !spec.Required {
			for _, r := range input.Required {
				if r == name {
					spec.Required = true
					break
				}
			}
		}
		schema.Properties[name] = spec
	}

	return schema, nil
}

// parsePropertySpec decodes a single JSON-schema property. It
// understands {"type": "string"}, {"type": "array", "items":
// {"type": "integer"}}, {"pattern": "..."} and so on. Returns a
// PropertySpec whose Type is a string compatible with
// matchesType in validator.go.
func parsePropertySpec(name string, raw json.RawMessage) (PropertySpec, error) {
	var p struct {
		Type        string          `json:"type"`
		Description string          `json:"description"`
		Pattern     string          `json:"pattern"`
		Items       json.RawMessage `json:"items"`
		Required    bool            `json:"required"`
	}
	if err := json.Unmarshal(raw, &p); err != nil {
		return PropertySpec{}, err
	}
	spec := PropertySpec{
		Name:     name,
		Type:     p.Type,
		Required: p.Required,
	}
	switch p.Type {
	case "string":
		spec.Type = "str"
	case "integer":
		spec.Type = "int"
	case "number":
		spec.Type = "float"
	case "boolean":
		spec.Type = "bool"
	case "array":
		spec.Type = "list"
		if len(p.Items) > 0 {
			var item struct {
				Type string `json:"type"`
			}
			if err := json.Unmarshal(p.Items, &item); err == nil && item.Type != "" {
				spec.Type = "list[" + jsonTypeToLocal(item.Type) + "]"
			}
		}
	case "object":
		spec.Type = "dict[str, Any]"
	case "null":
		spec.Type = "None"
	}
	if p.Pattern != "" {
		re, err := regexp.Compile(p.Pattern)
		if err == nil {
			spec.Pattern = re
		}
		// If the pattern is invalid, leave spec.Pattern nil.
		// The validator treats nil pattern as "no check".
	}
	return spec, nil
}

// jsonTypeToLocal maps a JSON-schema type tag to the local
// canonical form expected by matchesType.
func jsonTypeToLocal(t string) string {
	switch t {
	case "string":
		return "str"
	case "integer":
		return "int"
	case "number":
		return "float"
	case "boolean":
		return "bool"
	}
	return "Any"
}

// RegistryFromManagerToolset is the convenience constructor used
// by pkg/mcp/manager.go at startup. The caller passes the output
// of Manager.GetAllTools() (a map from server name to a slice of
// *mcp.Tool) and gets back a fully-populated Validator.
//
// Tools with duplicate names across servers are kept once and
// tagged with the first server that exposes them. This is the
// expected behaviour because the runtime uses the manager to
// route calls by server name; the validator just needs to know
// "is this tool name a known one?".
func RegistryFromManagerToolset(servers map[string][]*mcp.Tool) *Validator {
	// Sort server names for deterministic ordering: Go map
	// iteration is randomised, but the validator guarantees
	// "first-occurrence wins" on duplicate tool names. The
	// first-occurrence source ends up in the schema's Source
	// field, which tests assert on.
	serverNames := make([]string, 0, len(servers))
	for name := range servers {
		serverNames = append(serverNames, name)
	}
	sort.Strings(serverNames)
	var schemas []ToolSchema
	for _, serverName := range serverNames {
		for _, t := range servers[serverName] {
			if t == nil || t.Name == "" {
				continue
			}
			schema, err := SchemaFromMCPTool(t, serverName)
			if err != nil {
				continue
			}
			schemas = append(schemas, schema)
		}
	}
	return NewValidator(schemas)
}
