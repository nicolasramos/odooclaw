// Package toolguard validates tool calls emitted by an LLM agent
// against the schema and safety policy of the tools registered on
// the connected MCP servers.
//
// Two layers of validation, called in this order:
//
//  1. ValidateToolCall — schema checks: the tool name is registered,
//     every required parameter is present, every supplied parameter
//     has the right type, and optional patterns (when present in
//     the registry) match.
//
//  2. DetectDestructiveOperation — safety checks: the tool name
//     contains a destructive SQL verb (drop, delete, truncate,
//     update, unlink, destroy, wipe, purge), the args declare
//     intent=delete without confirm=true, or the registry marks
//     the tool as requires_confirmation / supports_dry_run and
//     the args do not carry the corresponding flag.
//
// Both layers return a stable ValidationResult that callers
// (the MCP manager, the eval harness, the acceptance gate) can
// inspect to decide whether to dispatch, ask the user, or block.
package toolguard

import (
	"fmt"
	"regexp"
	"strings"
)

// PropertySpec is a single parameter declaration from a tool's
// input schema. Mirrors the conventions used by the OdooClaw MCP
// servers: "str", "int", "float", "bool", "list[int]", "dict[...]"
// and "| None" variants. Pattern is an optional regex applied to
// string values.
type PropertySpec struct {
	Name     string
	Type     string
	Required bool
	Default  any
	Pattern  *regexp.Regexp
}

// ToolSchema is the canonical view of one tool entry. The
// registry is built by `RegistryFromManager` from the connected
// MCP servers' tool list, but it can also be constructed
// directly in tests.
type ToolSchema struct {
	Name                 string
	Description          string
	Properties           map[string]PropertySpec
	Required             []string
	RequiresConfirmation bool
	SupportsDryRun       bool
	Source               string // server name + tool index, for debug
}

// IsDestructive reports whether the tool is in the safety policy's
// destructive list (either asks for confirmation or advertises a
// dry-run knob).
func (s ToolSchema) IsDestructive() bool {
	return s.RequiresConfirmation || s.SupportsDryRun
}

// ValidationResult is the outcome of a single validation request.
// Stable, comparable, suitable for use in test assertions and
// structured logs.
type ValidationResult struct {
	OK                bool
	Errors            []string
	Destructive       bool
	DestructiveReason string
}

// DestructiveReason labels are the canonical reasons why a call
// was flagged as destructive. Stable for tests and metric
// dashboards.
type DestructiveReason string

const (
	// ReasonSQLKeyword is fired when the tool name contains a
	// destructive SQL verb AND the tool is not in the registry
	// (defence in depth against model hallucination).
	ReasonSQLKeyword DestructiveReason = "sql_keyword_in_tool_name"

	// ReasonIntentDelete is fired when args["intent"] == "delete"
	// and args["confirm"] is not truthy.
	ReasonIntentDelete DestructiveReason = "intent_delete_without_confirm"

	// ReasonMissingConfirm is fired when the registry marks the
	// tool as requires_confirmation and args["confirm"] is not
	// truthy.
	ReasonMissingConfirm DestructiveReason = "missing_confirm_flag"

	// ReasonMissingDryRun is fired when the registry marks the
	// tool as supports_dry_run and args["dry_run"] is not truthy.
	ReasonMissingDryRun DestructiveReason = "missing_dry_run_flag"
)

// Validator is the entry point. Construct via NewValidator (with
// a list of ToolSchema) or RegistryFromManager (auto-populated
// from MCP servers).
type Validator struct {
	tools map[string]ToolSchema
	// orderedNames preserves insertion order so tool_names() and
	// debug output are deterministic across runs.
	orderedNames []string
}

// NewValidator builds a validator from an in-memory list of
// tool schemas. Duplicates by name keep the first occurrence.
func NewValidator(tools []ToolSchema) *Validator {
	v := &Validator{
		tools:        make(map[string]ToolSchema, len(tools)),
		orderedNames: make([]string, 0, len(tools)),
	}
	for _, t := range tools {
		if _, exists := v.tools[t.Name]; exists {
			continue
		}
		v.tools[t.Name] = t
		v.orderedNames = append(v.orderedNames, t.Name)
	}
	return v
}

// ToolNames returns the registered tool names in insertion order.
func (v *Validator) ToolNames() []string {
	out := make([]string, len(v.orderedNames))
	copy(out, v.orderedNames)
	return out
}

// ToolCount returns the number of registered tools.
func (v *Validator) ToolCount() int { return len(v.orderedNames) }

// Get returns the schema for a tool name, or false if unknown.
func (v *Validator) Get(name string) (ToolSchema, bool) {
	t, ok := v.tools[name]
	return t, ok
}

// destructiveVerbs is the canonical set of SQL-mutation verbs
// the validator treats as destructive when found in an unknown
// tool name. The set is conservative: a known tool with one of
// these verbs in its name (e.g. odoo_update_task) is governed by
// the registry, not by this list.
var destructiveVerbs = map[string]struct{}{
	"drop":     {},
	"delete":   {},
	"truncate": {},
	"update":   {},
	"unlink":   {},
	"destroy":  {},
	"wipe":     {},
	"purge":    {},
}

// firstDestructiveVerb returns the first token of `name` (after
// splitting on non-alphanumeric characters) that is in
// destructiveVerbs. Returns "" if no match.
//
// Tokenising is preferred over the regex `\b` because Python's
// `\b` (and Go's equivalent) does not treat `_` as a separator,
// which means `odoo_drop_database` would not match. Tokenising
// on `[^a-z0-9]+` is O(N) and avoids the false-negative.
func firstDestructiveVerb(name string) string {
	lower := strings.ToLower(name)
	// Fast path: split on any non-alphanumeric char.
	for _, tok := range strings.FieldsFunc(lower, func(r rune) bool {
		return (r < 'a' || r > 'z') && (r < '0' || r > '9')
	}) {
		if _, ok := destructiveVerbs[tok]; ok {
			return tok
		}
	}
	return ""
}

// IsTruthy mirrors the small-model-friendly truthy check used by
// the harness: real booleans pass through, the strings "true",
// "yes", "1" (case-insensitive, trimmed) are also truthy, and
// numeric 1 is truthy. "false" is NOT truthy — that is the
// failure mode the safety policy is designed to catch.
func IsTruthy(v any) bool {
	switch t := v.(type) {
	case nil:
		return false
	case bool:
		return t
	case string:
		switch strings.ToLower(strings.TrimSpace(t)) {
		case "true", "yes", "1":
			return true
		default:
			return false
		}
	case int:
		return t != 0
	case int32:
		return t != 0
	case int64:
		return t != 0
	case float32:
		return t != 0
	case float64:
		return t != 0
	}
	return false
}

// matchesType reports whether `value` conforms to the registry's
// `type` tag. Supports the conventions emitted by the OdooClaw
// MCP server: "str", "int", "float", "bool", "list[...]",
// "dict[...]" and their "| None" variants. Anything unrecognised
// passes (forward-compat with future registry tags).
func matchesType(value any, typeName string) bool {
	base, optional := splitOptional(typeName)
	if value == nil {
		return optional
	}
	if base == "Any" || base == "object" {
		return true
	}
	switch base {
	case "str":
		_, ok := value.(string)
		return ok
	case "int":
		switch value.(type) {
		case int, int32, int64:
			// bool is a separate case; reject bool-as-int explicitly
			// to match the Python harness.
			_, isBool := value.(bool)
			return !isBool
		case float32, float64:
			// Allow ints stored as floats (common in JSON).
			f, _ := value.(float64)
			return f == float64(int(f))
		}
		return false
	case "float":
		switch value.(type) {
		case float32, float64, int, int32, int64:
			return true
		}
		return false
	case "bool":
		_, ok := value.(bool)
		return ok
	}
	if strings.HasPrefix(base, "list") {
		_, ok := value.([]any)
		if !ok {
			// Also accept typed slices via JSON unmarshalling: the
			// MCP runtime unmarshals into map[string]any with
			// []any underneath.
			return false
		}
		// Typed list: list[int] etc. Empty list always passes.
		inner, hasInner := extractListInner(base)
		if !hasInner || inner == "" {
			return true
		}
		for _, v := range value.([]any) {
			if !matchesType(v, inner) {
				return false
			}
		}
		return true
	}
	if strings.HasPrefix(base, "dict") {
		_, ok := value.(map[string]any)
		return ok
	}
	// Unknown type tag — don't punish, return true.
	return true
}

// splitOptional splits "int | None" into ("int", true). When
// there is no "| None" suffix, optional is false and base is the
// full type name.
func splitOptional(typeName string) (base string, optional bool) {
	trimmed := strings.TrimSpace(typeName)
	if trimmed == "None" || trimmed == "NoneType" {
		return "Any", true
	}
	if !strings.Contains(typeName, "|") {
		return typeName, false
	}
	parts := strings.Split(typeName, "|")
	optional = false
	for _, p := range parts {
		pp := strings.TrimSpace(p)
		if pp == "None" || pp == "NoneType" {
			optional = true
			continue
		}
		if base == "" {
			base = pp
		}
	}
	if base == "" {
		base = "Any"
	}
	return base, optional
}

// extractListInner returns the inner type of "list[int]" as
// "int", or "" if the list is untyped. The boolean is false when
// the type is just "list" with no element tag.
func extractListInner(base string) (string, bool) {
	if !strings.HasPrefix(base, "list[") || !strings.HasSuffix(base, "]") {
		return "", false
	}
	inner := base[len("list[") : len(base)-1]
	if inner == "" {
		return "", false
	}
	return inner, true
}

// ValidateToolCall performs schema-level validation. See
// package-level docs for the full contract. Returns a
// ValidationResult whose OK is true iff the call is acceptable.
func (v *Validator) ValidateToolCall(name string, args map[string]any) ValidationResult {
	if name == "" {
		return ValidationResult{OK: false, Errors: []string{"missing tool name"}}
	}
	schema, ok := v.tools[name]
	if !ok {
		return ValidationResult{
			OK:     false,
			Errors: []string{fmt.Sprintf("unknown tool: %s", name)},
		}
	}
	if args == nil {
		return ValidationResult{
			OK:     false,
			Errors: []string{fmt.Sprintf("arguments missing for tool: %s", name)},
		}
	}

	var errors []string

	// Required: union of (properties[].Required) and the
	// top-level Required list. Both are checked because the
	// registry uses them inconsistently across tools.
	declaredRequired := make(map[string]struct{}, len(schema.Required))
	for _, n := range schema.Required {
		declaredRequired[n] = struct{}{}
	}
	for _, p := range schema.Properties {
		if p.Required {
			declaredRequired[p.Name] = struct{}{}
		}
	}
	for n := range declaredRequired {
		if _, present := args[n]; !present {
			errors = append(errors, fmt.Sprintf("missing required parameter: %s", n))
		}
	}

	for argName, value := range args {
		prop, known := schema.Properties[argName]
		if !known {
			errors = append(errors, fmt.Sprintf("unknown parameter: %s", argName))
			continue
		}
		if !matchesType(value, prop.Type) {
			errors = append(errors, fmt.Sprintf(
				"wrong type for parameter: %s (expected %s, got %T)",
				argName, prop.Type, value,
			))
			continue
		}
		if prop.Pattern != nil {
			if s, isStr := value.(string); isStr {
				if !prop.Pattern.MatchString(s) {
					errors = append(errors, fmt.Sprintf(
						"parameter %s does not match pattern %q",
						argName, prop.Pattern.String(),
					))
				}
			}
		}
	}

	return ValidationResult{OK: len(errors) == 0, Errors: errors}
}

// DetectDestructiveOperation applies the safety policy. See
// package-level docs for the full contract. Returns a result
// with Destructive=true when at least one policy rule fires.
func (v *Validator) DetectDestructiveOperation(name string, args map[string]any) ValidationResult {
	// No name: not destructive. The harness and gate layer
	// their own "no tool call" rejection logic on top.
	if name == "" {
		return ValidationResult{OK: true}
	}
	schema, registered := v.tools[name]

	// (1) SQL-mutation verb in the tool name. Only fires for
	// tools that are NOT in the registry — defence in depth
	// against model hallucination. Registered tools with one of
	// these verbs in their name (odoo_update_task, etc.) are
	// governed by the registry's safety block in (3) and (4).
	if verb := firstDestructiveVerb(name); verb != "" && !registered {
		reason := string(ReasonSQLKeyword) + ":" + verb
		return ValidationResult{
			OK:                false,
			Destructive:       true,
			DestructiveReason: reason,
			Errors:            []string{fmt.Sprintf("destructive verb in tool name: %s", verb)},
		}
	}

	// (2) intent=delete without confirm.
	if intent, _ := args["intent"].(string); strings.ToLower(strings.TrimSpace(intent)) == "delete" {
		if !IsTruthy(args["confirm"]) {
			return ValidationResult{
				OK:                false,
				Destructive:       true,
				DestructiveReason: string(ReasonIntentDelete),
				Errors:            []string{"intent=delete requires confirm=true"},
			}
		}
	}

	// (3) and (4) Registry-marked destructive tools. confirm
	// is checked before dry_run because the registry field
	// requires_confirmation is the more critical signal — the
	// model did not even attempt to ask the user.
	if registered && schema.IsDestructive() {
		if schema.RequiresConfirmation && !IsTruthy(args["confirm"]) {
			return ValidationResult{
				OK:                false,
				Destructive:       true,
				DestructiveReason: string(ReasonMissingConfirm),
				Errors: []string{
					fmt.Sprintf("tool %s requires confirm=true (registry policy)", name),
				},
			}
		}
		if schema.SupportsDryRun && !IsTruthy(args["dry_run"]) {
			return ValidationResult{
				OK:                false,
				Destructive:       true,
				DestructiveReason: string(ReasonMissingDryRun),
				Errors: []string{
					fmt.Sprintf("tool %s supports dry_run=true (registry policy)", name),
				},
			}
		}
	}

	return ValidationResult{OK: true}
}
