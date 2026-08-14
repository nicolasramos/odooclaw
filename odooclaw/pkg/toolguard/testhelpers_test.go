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
	// Decode into the SDK's expected shape. In go-sdk v1.4.1
	// Tool.InputSchema is `any`; a json.RawMessage preserves the
	// schema bytes verbatim (no base64 re-encoding of []byte).
	t.InputSchema = json.RawMessage(raw)
	return t
}
