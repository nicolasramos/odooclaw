package toolguard

import (
	"encoding/json"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// mkTool builds a *mcp.Tool for tests. The MCP go-sdk's Tool
// struct is large and most of its fields are unexported. We use
// the SDK's NewTool helper to create one with a name, description
// and a JSON-schema input schema. If the SDK's constructor is not
// usable in this version we fall back to building the struct via
// JSON marshalling.
//
// In production code the schema is created by the MCP server
// runtime; in tests we synthesise just enough to exercise the
// toolguard parser.
func mkTool(name, description string, inputSchema any) *mcp.Tool {
	t := &mcp.Tool{Name: name, Description: description}
	if inputSchema == nil {
		return t
	}
	raw, err := json.Marshal(inputSchema)
	if err != nil {
		return t
	}
	// Decode into a flexible intermediate, then assign to the
	// SDK's expected shape via JSON round-trip. The MCP SDK's
	// ToolInputSchema struct is JSON-tagged (Type, Properties,
	// Required) so this works for both schema-bearing and
	// schema-less tools.
	var input mcp.ToolInputSchema
	if err := json.Unmarshal(raw, &input); err == nil {
		t.InputSchema = &input
	}
	return t
}
