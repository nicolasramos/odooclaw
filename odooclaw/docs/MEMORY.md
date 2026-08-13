# Memory System

OdooClaw has a layered memory architecture (NRA-511 / NG AGENTE 3). This
document explains each layer, where it lives, and how the agent uses it.

## Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent loop                               │
│                                                              │
│  HOT (SQLite FTS5) ──► fast local keyword search             │
│  COLD (SQLite)     ──► historical entries + temporal facts   │
│  SESSION (JSON)    ──► current business state (new, NRA-511) │
│  LONG-TERM (JSON)  ──► preferences + company profile (new)   │
│  Mnemosyne (MCP)   ──► semantic layer (personas, episodes)   │
│                                                              │
│  MemoryStore orchestrates → GetStructuredContext() → prompt  │
└─────────────────────────────────────────────────────────────┘
```

## Layers

### 1. HOT memory — `pkg/memory/store.go`

SQLite with FTS5/BM25 over `memory/MEMORY.md` + daily notes
(`memory/YYYYMM/YYYYMMDD.md`). Local, no network, scope-isolated
(channel/chat/sender/metadata).

### 2. COLD memory — `pkg/memory/historical_store.go`

`historical_entries` + `historical_facts` tables. Temporal facts with
validity windows, timeline retrieval, scope isolation.

### 3. Structured session memory — `pkg/memory/session_schema.go` (NRA-511)

Per-session business state persisted as JSON in
`<memoryDir>/session/<session_key>.json` (session key = `channel:chatID`):

```yaml
current_company: 10        # company_id of the Odoo record being worked on
current_partner: 42        # partner_id in context
current_document:          # current record
  model: sale.order
  res_id: 123
  action: review           # review | create | edit | confirm
current_module: sale       # active Odoo module
pending_confirmation:      # tool calls awaiting user confirmation
  - tool: sale_order_confirm
    args: {order_id: 123}
    reason: "user requested"
message_count: 45
last_activity: "..."
```

Key property: `GetSessionSummary()` returns **an empty string when nothing
is set** — zero token cost in the prompt.

### 4. Long-term memory — `pkg/memory/long_term.go` (NRA-511)

Durable profile persisted as JSON in `<memoryDir>/long_term/`:

- `preferences.json` — language, timezone, communication style, contact method
- `company_profile.json` — company name, fiscal number, industry, active modules
- `system_config.json` — Odoo version, database, webhook URL

`BuildPromptContext()` renders a compact always-injected profile block.

### 5. Mnemosyne — semantic layer (optional)

MCP server (SSE) for personas, episodes, instructions and triplets with
multilingual embeddings. Used for deep semantic recall; not required for
local operation. Configure its endpoint in the gateway config.

## Memory tools

| Tool | Purpose |
|---|---|
| `memory_search` | Search historical memory (scoped) |
| `memory_save` / `memory_save_decision` | Persist entries/decisions |
| `memory_add_fact` / `memory_query_facts` | Temporal facts |
| `memory_get_timeline` | Timeline retrieval |
| `memory_debug_explain_retrieval` | Explainability |
| `memory_import_history` | Import past conversations |
| `memory_save_strategic` | Strategic/architecture decisions |
| **`memory_set_session_state`** | Set current company/partner/module/document (NRA-511) |
| **`memory_set_pending_confirmation`** | Record action awaiting confirmation (NRA-511) |
| **`memory_clear_pending`** | Clear pending confirmations (NRA-511) |

## How the agent uses it

1. Every turn: the agent may call `memory_set_session_state` after
   identifying the active partner/document/module.
2. Before destructive/critical calls, it records
   `memory_set_pending_confirmation` and asks the user.
3. On confirmation, the pending action is cleared with `memory_clear_pending`.
4. The next turn's prompt includes `## Structured Memory` (session state +
   profile) so context survives without replaying raw history.

## Context injection rules (NRA-511 design)

- **Always**: structured session memory + long-term profile
- **On demand**: HOT/COLD search (only when the query suggests recall)
- **Rarely**: raw conversation history (replaced by structured state)
- **Max 3 sources** per prompt, prioritized by relevance

## Token impact

Structured memory is deliberately compact (~30-60 tokens when active) vs
full history (hundreds/thousands). Combined with the tool retrieval engine
(NRA-513, top-5 compact schemas at 245 tokens), it keeps prompts small.
