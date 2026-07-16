# toolguard — Tool-call validation wrapper

`pkg/toolguard` is the single source of truth for what counts as a
*valid* model-emitted tool call in OdooClaw. It validates every
call against the schemas of the tools registered on the connected
MCP servers, and gates *destructive* operations behind a small
safety policy.

The wrapper is consumed by three places:

- the runtime MCP manager — `pkg/mcp/manager.go` blocks bad calls
  **before** they reach the session;
- the offline eval harness — `pkg/agent/...` (when re-introduced)
  scores `schema_valid` and `destructive_blocked` per test case;
- any future acceptance gate that wants the same metrics offline.

## Why a wrapper at all

The model can fail in two distinct ways:

1. **Schema errors** — unknown tool, missing required parameter,
   wrong type, pattern mismatch. These are bugs the model *can*
   learn to fix. They should not be silently dropped; they must be
   surfaced in the eval so we can iterate on the training data.
2. **Destructive operations** — a tool call that would mutate or
   destroy data. The model is not allowed to dispatch these
   unilaterally; the system prompt tells it to ask for confirmation
   or use `dry_run=true`, and the wrapper must enforce that.

A single validator handles both. The previous design had no
runtime enforcement: a model could emit a valid-looking
`{"name": "odoo_drop_database", "arguments": {}}` and the manager
would happily dispatch it.

## Public API

```go
import "github.com/nicolasramos/odooclaw/pkg/toolguard"

validator := toolguard.NewValidator([]toolguard.ToolSchema{...})
// or, when the MCP manager is already up:
validator := toolguard.RegistryFromManagerToolset(manager.GetAllTools())

// Schema validation
result := validator.ValidateToolCall("odoo_find_partner", map[string]any{"name": "Acme"})
if !result.OK {
    return fmt.Errorf("invalid: %v", result.Errors)
}

// Destructive detection
dest := validator.DetectDestructiveOperation("odoo_validate_delivery", map[string]any{"delivery_id": 7})
if dest.Destructive {
    return fmt.Errorf("blocked: %s", dest.DestructiveReason)
}
```

`Validator` is immutable and safe for concurrent use. Build it
once at process start (or after every MCP reconnect) and reuse it
for every call.

### `ValidationResult`

| Field | Type | Meaning |
|---|---|---|
| `OK` | `bool` | `true` iff the call is acceptable as-is. |
| `Errors` | `[]string` | Stable, human-readable error strings. Empty when `OK`. |
| `Destructive` | `bool` | `true` iff the call should be blocked or require explicit user OK. |
| `DestructiveReason` | `string` | One of `DestructiveReason` labels — see below. |

### `DestructiveReason` labels

| Label | When it fires |
|---|---|
| `sql_keyword_in_tool_name` | Tool name contains a destructive verb AND the tool is not in the registry. Defence-in-depth: the model cannot invent a tool called `odoo_drop_database` and have it dispatched. |
| `intent_delete_without_confirm` | `args["intent"] == "delete"` AND `args["confirm"]` is not truthy. |
| `missing_confirm_flag` | Registry marks the tool `requires_confirmation` AND `args["confirm"]` is not truthy. |
| `missing_dry_run_flag` | Registry marks the tool `supports_dry_run` AND `args["dry_run"]` is not truthy. |

The labels are part of the public API — eval reports and tests
assert on them, so they are stable. New labels are additive; old
labels never get renamed without a deprecation cycle.

## Detection rules, in order

`DetectDestructiveOperation` evaluates the rules in this order
and returns the first match:

1. **SQL verb in tool name** — if the name contains a destructive
   verb (`drop`, `delete`, `truncate`, `update`, `unlink`, `destroy`,
   `wipe`, `purge`) **as a token** (after splitting on
   non-alphanumeric chars), and the tool is not in the registry,
   block. For registered tools that legitimately contain one of
   these verbs (`odoo_update_task`, `odoo_unlink_partner`),
   the registry's own `safety` block is the source of truth.
2. **intent=delete without confirm** — see table above.
3. **Registry `requires_confirmation`** — see table above.
4. **Registry `supports_dry_run`** — see table above.

The token-based verb detection (not the regex `\b`) is
deliberate: `\b` does not treat `_` as a separator, so
`odoo_drop_database` would not be flagged without a custom
splitter. The tokeniser is O(N) and handles all the real cases
(snake_case, kebab-case, mixed).

## Registry construction

The registry is auto-populated from the MCP manager at
`LoadFromMCPConfig` time:

```go
manager := mcp.NewManager()
manager.SetValidator(toolguard.NewValidator(nil)) // opt in
manager.LoadFromMCPConfig(ctx, cfg, workspace)
// inside LoadFromMCPConfig, after every server connects:
manager.loadValidatorFromTools()
// which calls:
//   toolguard.RegistryFromManagerToolset(manager.GetAllTools())
```

If the application does not call `SetValidator` at least once,
the manager skips validation entirely (opt-in design — this keeps
existing tests and the offline eval paths unaffected).

### `SchemaFromMCPTool` safety extraction

Today, the OdooClaw MCP servers expose the safety policy in the
tool's `description` (e.g. "REQUIERE confirmacion", "Soporta
dry_run"). `SchemaFromMCPTool` parses those substrings and sets
`RequiresConfirmation` / `SupportsDryRun` accordingly.

When MCP servers standardise a structured safety block (e.g.
`tool._meta["odooclaw.safety"]`), `SchemaFromMCPTool` should
prefer that and fall back to the description heuristic. The
function is the single place to update.

## MCP manager integration

`pkg/mcp/manager.go` calls the validator inside `CallTool`,
**before** the session dispatch:

```go
if m.validator != nil {
    if r := m.validator.ValidateToolCall(toolName, arguments); !r.OK {
        return nil, fmt.Errorf("toolguard: schema invalid: %s", strings.Join(r.Errors, "; "))
    }
    if r := m.validator.DetectDestructiveOperation(toolName, arguments); r.Destructive {
        return nil, fmt.Errorf("toolguard: destructive operation blocked: %s", r.DestructiveReason)
    }
}
result, err := conn.activeSession().CallTool(ctx, params)
```

Behavioural contract:

- A rejected call returns a wrapped `toolguard:` error and
  **never** touches the underlying session.
- A passing call dispatches as before — zero overhead when the
  validator is nil.
- The error format is stable so callers can pattern-match on
  `"toolguard:"` if they want to surface a friendlier message
  to the user.

## Limits

- **Read-only validator.** `toolguard` does not call the MCP
  server itself; it only judges whether a *proposed* call should
  be allowed.
- **Type system is not a full type checker.** The validator
  understands the conventions of the OdooClaw registry (`str`,
  `int | None`, `list[int]`, `dict[str, Any]`, …) but it does not
  try to parse Go's full type system.
- **English-only error strings.** Error messages are intended for
  test assertions and machine-readable logs, not end users. The
  inference layer should translate them before display.
- **Opt-in by default.** The manager does not validate unless
  the application calls `SetValidator`. This is conservative by
  design — see `pkg/mcp/manager_test.go` for the existing
  no-validator behaviour.

## Extension points

### Custom destructive verbs

The set of SQL verbs is a package-level map:

```go
toolguard.DestructiveVerbs() // map[string]struct{}{"drop", "delete", ...}
```

To add a verb without forking the package, override the helper
in your fork (it is a package-level variable in
`validator.go`). The map is consulted by `firstDestructiveVerb`,
which you can also replace if your policy needs a different
splitter.

### Custom type tags

`matchesType` only knows about the documented type tags.
Unknown tags pass validation (forward compatibility), so a future
registry type never silently breaks the gate. To opt in to
strict checking for a new tag, add a case to `matchesType` in
your fork.

### Programmatic registry construction

`NewValidator(schemas)` accepts any slice of `ToolSchema`. Use it
for tests that need a hand-built registry (see
`validator_test.go`) or to validate against a registry that has
not been serialised to disk yet.

## Tests

The package ships with `validator_test.go` (28+ unit tests).
Run from the repo root:

```bash
go test ./pkg/toolguard/... -v
```

Coverage areas:

- type-tag parsing (`splitOptional`, `matchesType`, `extractListInner`)
- registry construction (`NewValidator`, dedup-by-name, empty input)
- `ValidateToolCall`: name existence, required params, unknown
  params, type checks, pattern checks, `nil`/missing args,
  multi-error accumulation
- `DetectDestructiveOperation`: SQL verb in unknown name,
  registered tool with SQL verb (registry wins), intent=delete
  with/without confirm, registry requires_confirmation /
  supports_dry_run with/without flags, safe tools, edge cases
- tokenisation of destructive verbs (snake_case, kebab-case)
- `IsTruthy`: real bools, JSON-style strings, numeric coercion
- `SchemaFromMCPTool`: nil-safe, type mapping, safety extraction
- `RegistryFromManagerToolset`: dedup by name, skip empty/nil
