package toolguard

import (
	"regexp"
	"strings"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// fixtureValidator returns a Validator built from a small
// hand-crafted registry that exercises every code path in the
// validator. The fixture is intentionally minimal — coverage of
// the real registry happens in the integration test at the
// bottom of this file.
func fixtureValidator() *Validator {
	return NewValidator([]ToolSchema{
		{
			Name: "odoo_find_partner",
			Properties: map[string]PropertySpec{
				"name":  {Name: "name", Type: "str", Required: true},
				"limit": {Name: "limit", Type: "int", Required: false},
			},
			Required: []string{"name"},
		},
		{
			Name: "odoo_read",
			Properties: map[string]PropertySpec{
				"model":     {Name: "model", Type: "str", Required: true},
				"ids":       {Name: "ids", Type: "list[int]", Required: true},
				"sender_id": {Name: "sender_id", Type: "int | None", Required: false},
			},
			Required: []string{"model", "ids"},
		},
		{
			Name: "odoo_validate_delivery",
			Properties: map[string]PropertySpec{
				"delivery_id": {Name: "delivery_id", Type: "int", Required: true},
				"dry_run":     {Name: "dry_run", Type: "bool", Required: false},
			},
			Required:             []string{"delivery_id"},
			RequiresConfirmation: true,
			SupportsDryRun:       true,
		},
		{
			Name: "odoo_post_chatter_message",
			Properties: map[string]PropertySpec{
				"res_model": {Name: "res_model", Type: "str", Required: true},
				"res_id":    {Name: "res_id", Type: "int", Required: true},
				"body": {Name: "body", Type: "str", Required: true,
					Pattern: regexp.MustCompile(`\S`)},
			},
			Required:             []string{"res_model", "res_id", "body"},
			RequiresConfirmation: true,
		},
		{
			Name: "odoo_update_task",
			Properties: map[string]PropertySpec{
				"task_id": {Name: "task_id", Type: "int", Required: true},
				"values":  {Name: "values", Type: "dict[str, Any]", Required: true},
			},
			Required: []string{"task_id", "values"},
		},
		{
			Name: "odoo_execute_kw",
			Properties: map[string]PropertySpec{
				"model":   {Name: "model", Type: "str", Required: true},
				"intent":  {Name: "intent", Type: "str | None", Required: false},
				"confirm": {Name: "confirm", Type: "bool", Required: false},
			},
			Required: []string{"model"},
		},
		{
			Name: "odoo_dry_run_only",
			Properties: map[string]PropertySpec{
				"ref":     {Name: "ref", Type: "str", Required: true},
				"dry_run": {Name: "dry_run", Type: "bool", Required: false},
			},
			Required:       []string{"ref"},
			SupportsDryRun: true,
		},
	})
}

// ---------------------------------------------------------------------------
// Type-helper tests
// ---------------------------------------------------------------------------

func TestSplitOptional(t *testing.T) {
	cases := []struct {
		in       string
		base     string
		optional bool
	}{
		{"int", "int", false},
		{"int | None", "int", true},
		{"str | None", "str", true},
		{"None", "Any", true},
	}
	for _, c := range cases {
		gotBase, gotOpt := splitOptional(c.in)
		if gotBase != c.base || gotOpt != c.optional {
			t.Errorf("splitOptional(%q) = (%q, %v); want (%q, %v)",
				c.in, gotBase, gotOpt, c.base, c.optional)
		}
	}
}

func TestMatchesType(t *testing.T) {
	cases := []struct {
		name     string
		value    any
		typeName string
		want     bool
	}{
		{"str ok", "acme", "str", true},
		{"str not", 7, "str", false},
		{"int ok", 7, "int", true},
		{"int rejects bool", true, "int", false},
		{"bool ok", true, "bool", true},
		{"float accepts int", 1, "float", true},
		{"optional accepts nil", nil, "int | None", true},
		{"optional rejects nil required", nil, "int", false},
		{"list typed ok", []any{1, 2, 3}, "list[int]", true},
		{"list typed rejects str", []any{"a", "b"}, "list[int]", false},
		{"list untyped ok", []any{1, "x"}, "list", true},
		{"dict ok", map[string]any{"a": 1}, "dict[str, Any]", true},
		{"dict rejects list", []any{1, 2}, "dict[str, Any]", false},
		{"unknown type passes", "x", "frozenset", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := matchesType(c.value, c.typeName); got != c.want {
				t.Errorf("matchesType(%v, %q) = %v; want %v",
					c.value, c.typeName, got, c.want)
			}
		})
	}
}

func TestIsTruthy(t *testing.T) {
	cases := []struct {
		in   any
		want bool
	}{
		{nil, false},
		{true, true},
		{false, false},
		{"true", true},
		{"True", true},
		{"yes", true},
		{"1", true},
		{"false", false},
		{"0", false},
		{"  true  ", true},
		{0, false},
		{1, true},
		{1.5, true},
	}
	for _, c := range cases {
		if got := IsTruthy(c.in); got != c.want {
			t.Errorf("IsTruthy(%v) = %v; want %v", c.in, got, c.want)
		}
	}
}

func TestFirstDestructiveVerb(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"odoo_drop_database", "drop"},
		{"odoo_unlink_partner", "unlink"},
		{"odoo_delete_record", "delete"},
		{"odoo_update_task", "update"},
		{"odoo_find_partner", ""},
		{"odoo_read_record", ""},
		{"", ""},
	}
	for _, c := range cases {
		if got := firstDestructiveVerb(c.in); got != c.want {
			t.Errorf("firstDestructiveVerb(%q) = %q; want %q", c.in, got, c.want)
		}
	}
}

// ---------------------------------------------------------------------------
// Constructor tests
// ---------------------------------------------------------------------------

func TestNewValidator_DuplicateNamesKeepFirst(t *testing.T) {
	v := NewValidator([]ToolSchema{
		{Name: "t", Properties: map[string]PropertySpec{"x": {Name: "x", Type: "str"}}},
		{Name: "t", Properties: map[string]PropertySpec{"y": {Name: "y", Type: "str"}}},
	})
	if v.ToolCount() != 1 {
		t.Errorf("expected 1 tool after dedup; got %d", v.ToolCount())
	}
	schema, _ := v.Get("t")
	if _, ok := schema.Properties["x"]; !ok {
		t.Errorf("expected first-occurrence property to win")
	}
}

func TestNewValidator_EmptyInput(t *testing.T) {
	v := NewValidator(nil)
	if v.ToolCount() != 0 {
		t.Errorf("empty input should yield empty registry; got %d", v.ToolCount())
	}
}

// ---------------------------------------------------------------------------
// ValidateToolCall tests
// ---------------------------------------------------------------------------

func TestValidateToolCall_Valid(t *testing.T) {
	v := fixtureValidator()
	r := v.ValidateToolCall("odoo_find_partner", map[string]any{"name": "Acme"})
	if !r.OK {
		t.Errorf("valid call: got errors %v", r.Errors)
	}
}

func TestValidateToolCall_UnknownTool(t *testing.T) {
	v := fixtureValidator()
	r := v.ValidateToolCall("odoo_magic", map[string]any{"name": "x"})
	if r.OK {
		t.Errorf("unknown tool should fail; got OK")
	}
	if !strings.Contains(strings.Join(r.Errors, " | "), "unknown tool") {
		t.Errorf("expected 'unknown tool' in errors; got %v", r.Errors)
	}
}

func TestValidateToolCall_MissingRequired(t *testing.T) {
	v := fixtureValidator()
	r := v.ValidateToolCall("odoo_find_partner", map[string]any{})
	if r.OK {
		t.Errorf("missing required should fail; got OK")
	}
}

func TestValidateToolCall_UnknownParameter(t *testing.T) {
	v := fixtureValidator()
	r := v.ValidateToolCall("odoo_find_partner", map[string]any{
		"name":    "Acme",
		"unknown": 1,
	})
	if r.OK {
		t.Errorf("unknown param should fail; got OK")
	}
}

func TestValidateToolCall_WrongType(t *testing.T) {
	v := fixtureValidator()
	r := v.ValidateToolCall("odoo_find_partner", map[string]any{
		"name":  "Acme",
		"limit": "twenty",
	})
	if r.OK {
		t.Errorf("wrong type should fail; got OK")
	}
	if !strings.Contains(strings.Join(r.Errors, " | "), "wrong type") {
		t.Errorf("expected 'wrong type' in errors; got %v", r.Errors)
	}
}

func TestValidateToolCall_ListInnerType(t *testing.T) {
	v := fixtureValidator()
	r := v.ValidateToolCall("odoo_read", map[string]any{
		"model": "res.partner",
		"ids":   []any{"a", "b"},
	})
	if r.OK {
		t.Errorf("typed list inner mismatch should fail; got OK")
	}
}

func TestValidateToolCall_OptionalAcceptsNil(t *testing.T) {
	v := fixtureValidator()
	r := v.ValidateToolCall("odoo_read", map[string]any{
		"model":     "res.partner",
		"ids":       []any{1, 2},
		"sender_id": nil,
	})
	if !r.OK {
		t.Errorf("optional nil should pass; got %v", r.Errors)
	}
}

func TestValidateToolCall_PatternMismatch(t *testing.T) {
	v := fixtureValidator()
	r := v.ValidateToolCall("odoo_post_chatter_message", map[string]any{
		"res_model": "res.partner",
		"res_id":    1,
		"body":      "   ",
	})
	if r.OK {
		t.Errorf("pattern mismatch should fail; got OK")
	}
}

func TestValidateToolCall_NilName(t *testing.T) {
	v := fixtureValidator()
	r := v.ValidateToolCall("", map[string]any{"name": "x"})
	if r.OK {
		t.Errorf("nil name should fail; got OK")
	}
}

func TestValidateToolCall_NilArgs(t *testing.T) {
	v := fixtureValidator()
	r := v.ValidateToolCall("odoo_find_partner", nil)
	if r.OK {
		t.Errorf("nil args should fail; got OK")
	}
}

func TestValidateToolCall_MultipleErrors(t *testing.T) {
	v := fixtureValidator()
	r := v.ValidateToolCall("odoo_find_partner", map[string]any{
		"limit": "twenty",
		"extra": 1,
	})
	if r.OK {
		t.Errorf("multiple errors should fail; got OK")
	}
	joined := strings.Join(r.Errors, " | ")
	for _, want := range []string{"missing required parameter: name", "wrong type", "unknown parameter: extra"} {
		if !strings.Contains(joined, want) {
			t.Errorf("expected %q in errors; got %q", want, joined)
		}
	}
}

// ---------------------------------------------------------------------------
// DetectDestructiveOperation tests
// ---------------------------------------------------------------------------

func TestDestructive_RegisteredToolWithSQLVerbFallsBackToRegistry(t *testing.T) {
	// The SQL verb regex is a defence in depth for UNKNOWN tools
	// only. For a registered tool that happens to contain
	// "unlink" in its name, the registry's own safety block
	// decides.
	v := NewValidator([]ToolSchema{{
		Name:                 "odoo_unlink_partner",
		Properties:           map[string]PropertySpec{"id": {Name: "id", Type: "int"}},
		Required:             []string{"id"},
		RequiresConfirmation: true,
	}})
	r := v.DetectDestructiveOperation("odoo_unlink_partner", map[string]any{"id": 1})
	if !r.Destructive {
		t.Errorf("expected destructive; got %+v", r)
	}
	if r.DestructiveReason != string(ReasonMissingConfirm) {
		t.Errorf("expected MISSING_CONFIRM (registry policy); got %q", r.DestructiveReason)
	}
}

func TestDestructive_UnknownToolWithSQLVerbBlocked(t *testing.T) {
	v := fixtureValidator()
	r := v.DetectDestructiveOperation("odoo_drop_database", map[string]any{})
	if !r.Destructive {
		t.Errorf("hallucinated tool with drop verb should be blocked; got %+v", r)
	}
	if !strings.HasPrefix(r.DestructiveReason, string(ReasonSQLKeyword)) {
		t.Errorf("expected SQL_KEYWORD reason; got %q", r.DestructiveReason)
	}
}

func TestDestructive_IntentDeleteWithoutConfirm(t *testing.T) {
	v := fixtureValidator()
	r := v.DetectDestructiveOperation("odoo_execute_kw", map[string]any{
		"model":  "res.partner",
		"intent": "delete",
	})
	if !r.Destructive || r.DestructiveReason != string(ReasonIntentDelete) {
		t.Errorf("expected intent_delete_without_confirm; got %+v", r)
	}
}

func TestDestructive_IntentDeleteWithConfirmPasses(t *testing.T) {
	v := fixtureValidator()
	r := v.DetectDestructiveOperation("odoo_execute_kw", map[string]any{
		"model":   "res.partner",
		"intent":  "delete",
		"confirm": true,
	})
	if r.Destructive {
		t.Errorf("intent=delete + confirm=true should pass; got %+v", r)
	}
}

func TestDestructive_IntentDeleteStringConfirmPasses(t *testing.T) {
	v := fixtureValidator()
	r := v.DetectDestructiveOperation("odoo_execute_kw", map[string]any{
		"model":   "x",
		"intent":  "delete",
		"confirm": "true",
	})
	if r.Destructive {
		t.Errorf("string 'true' confirm should pass; got %+v", r)
	}
}

func TestDestructive_RegistryRequiresConfirmationBlocks(t *testing.T) {
	v := fixtureValidator()
	r := v.DetectDestructiveOperation("odoo_post_chatter_message", map[string]any{
		"res_model": "res.partner",
		"res_id":    1,
		"body":      "hi",
	})
	if !r.Destructive {
		t.Errorf("missing confirm should block; got %+v", r)
	}
	if r.DestructiveReason != string(ReasonMissingConfirm) &&
		r.DestructiveReason != string(ReasonMissingDryRun) {
		t.Errorf("expected confirm or dry_run reason; got %q", r.DestructiveReason)
	}
}

func TestDestructive_RegistryDryRunOnlyPassesWithDryRun(t *testing.T) {
	v := fixtureValidator()
	r := v.DetectDestructiveOperation("odoo_dry_run_only", map[string]any{
		"ref":     "X",
		"dry_run": true,
	})
	if r.Destructive {
		t.Errorf("dry_run=true should pass; got %+v", r)
	}
}

func TestDestructive_SafeToolIsNotDestructive(t *testing.T) {
	v := fixtureValidator()
	r := v.DetectDestructiveOperation("odoo_find_partner", map[string]any{"name": "Acme"})
	if r.Destructive || !r.OK {
		t.Errorf("safe tool should pass; got %+v", r)
	}
}

func TestDestructive_EmptyNameIsNotDestructive(t *testing.T) {
	v := fixtureValidator()
	r := v.DetectDestructiveOperation("", map[string]any{})
	if r.Destructive || !r.OK {
		t.Errorf("empty name should pass (callers layer rejection on top); got %+v", r)
	}
}

// ---------------------------------------------------------------------------
// Schema-from-MCP-tool tests
// ---------------------------------------------------------------------------

func TestSchemaFromMCPTool_NilSafe(t *testing.T) {
	if _, err := SchemaFromMCPTool(nil, "test"); err == nil {
		t.Errorf("nil tool should error")
	}
}

func TestSchemaFromMCPTool_EmptySchema(t *testing.T) {
	tool := mkTool("odoo_x", "", nil)
	schema, err := SchemaFromMCPTool(tool, "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if schema.Name != "odoo_x" {
		t.Errorf("name mismatch: %q", schema.Name)
	}
	if schema.Source != "test" {
		t.Errorf("source mismatch: %q", schema.Source)
	}
}

func TestSchemaFromMCPTool_TypeMapping(t *testing.T) {
	tool := mkTool("x", "", map[string]any{
		"type": "object",
		"properties": map[string]any{
			"name":    map[string]any{"type": "string"},
			"count":   map[string]any{"type": "integer"},
			"amount":  map[string]any{"type": "number"},
			"enabled": map[string]any{"type": "boolean"},
			"items":   map[string]any{"type": "array", "items": map[string]any{"type": "integer"}},
			"payload": map[string]any{"type": "object"},
		},
		"required": []string{"name", "count"},
	})
	schema, err := SchemaFromMCPTool(tool, "srv")
	if err != nil {
		t.Fatalf("unexpected: %v", err)
	}
	expect := map[string]string{
		"name": "str", "count": "int", "amount": "float",
		"enabled": "bool", "items": "list[int]", "payload": "dict[str, Any]",
	}
	for k, want := range expect {
		got, ok := schema.Properties[k]
		if !ok {
			t.Errorf("missing property %q", k)
			continue
		}
		if got.Type != want {
			t.Errorf("property %q type = %q; want %q", k, got.Type, want)
		}
	}
	for _, req := range []string{"name", "count"} {
		if !containsString(schema.Required, req) {
			t.Errorf("expected %q in required", req)
		}
	}
}

func TestSchemaFromMCPTool_SafetyFromDescription(t *testing.T) {
	tool := mkTool(
		"odoo_validate_albaran",
		"Validar un albaran. REQUIERE confirmacion. Soporta dry_run.",
		nil,
	)
	schema, _ := SchemaFromMCPTool(tool, "srv")
	if !schema.RequiresConfirmation {
		t.Errorf("expected requires_confirmation from description")
	}
	if !schema.SupportsDryRun {
		t.Errorf("expected supports_dry_run from description")
	}
}

func TestRegistryFromManagerToolset_DedupesByName(t *testing.T) {
	mgr := map[string][]*mcp.Tool{
		"a": {mkTool("shared", "", nil), mkTool("only_a", "", nil)},
		"b": {mkTool("shared", "", nil), mkTool("only_b", "", nil)},
	}
	v := RegistryFromManagerToolset(mgr)
	if v.ToolCount() != 3 {
		t.Errorf("expected 3 unique tool names; got %d", v.ToolCount())
	}
	schema, _ := v.Get("shared")
	if schema.Source != "a" {
		t.Errorf("first-occurrence source should win; got %q", schema.Source)
	}
}

func TestRegistryFromManagerToolset_SkipsEmptyAndNil(t *testing.T) {
	mgr := map[string][]*mcp.Tool{
		"a": {mkTool("ok", "", nil), mkTool("", "", nil), nil},
	}
	v := RegistryFromManagerToolset(mgr)
	if v.ToolCount() != 1 {
		t.Errorf("expected 1 tool after skipping empty/nil; got %d", v.ToolCount())
	}
}

// ---------------------------------------------------------------------------
// helpers used only in tests
// ---------------------------------------------------------------------------

func containsString(haystack []string, needle string) bool {
	for _, s := range haystack {
		if s == needle {
			return true
		}
	}
	return false
}
