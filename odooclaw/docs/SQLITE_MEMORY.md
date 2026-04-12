# SQLite Memory Backend

OdooClaw now includes a SQLite-backed memory index for long-term recall and recent-note retrieval.

It also supports an optional historical memory layer (cold storage) for scoped historical recall, fact timeline queries, and explainability.

## Runtime Path

Default workspace path:

```text
~/.odooclaw/workspace/memory/main.sqlite
```

Historical database path:

```text
~/.odooclaw/workspace/memory/historical.sqlite
```

This lives alongside the existing markdown memory files.

## Indexed Sources

The SQLite memory backend indexes:

- `memory/MEMORY.md`
- daily notes in `memory/YYYYMM/YYYYMMDD.md`

Markdown remains human-editable, while SQLite provides the indexed retrieval layer.

## What It Adds

- FTS5 / BM25 retrieval
- recent daily-note recall
- prompt-safe memory recall in the agent context builder
- compatibility with the existing markdown memory workflow

## Current Architecture

Relevant files:

- `odooclaw/pkg/memory/store.go`
- `odooclaw/pkg/agent/memory.go`
- `odooclaw/pkg/agent/context.go`

Behavior:

1. markdown memory is still written as files
2. SQLite indexes those files under `main.sqlite`
3. the agent retrieves memory context from SQLite-backed queries first
4. prompt invalidation includes memory-related sources so changes are reflected correctly

## Why SQLite Here

SQLite is used in core for:

- lower retrieval latency
- no extra MCP/Python hop for prompt memory
- better chunking and recall structure
- easier local persistence in Docker/Doodba volumes

## Doodba Path

In Doodba, the persistent root is typically:

```text
/home/odooclaw/.odooclaw/workspace/memory/main.sqlite
```

This survives container restarts when backed by the standard OdooClaw volume.

## Scope of Current Implementation

Current scope covers:

- core SQLite index
- `MEMORY.md`
- daily notes
- prompt integration

Historical scope includes:

- scoped historical entry storage (`historical_entries`)
- scoped temporal facts (`historical_facts`)
- timeline retrieval (entries + facts)
- explainability/debug retrieval outputs
- optional markdown import into historical storage with dedupe and dry-run

## Historical Memory Tools

The following tools are registered in the agent runtime:

- `memory_search`
- `memory_save`
- `memory_save_decision`
- `memory_add_fact`
- `memory_query_facts`
- `memory_get_timeline`
- `memory_debug_explain_retrieval`
- `memory_import_history`

`memory_import_history` supports:

- `dry_run` (default `true`) to preview import counts
- selective source inclusion (`include_long_term`, `include_daily_notes`, `include_scoped`, `include_memory_notes`)
- `max_files` cap and deduped re-import behavior

This keeps the existing HOT memory behavior intact while adding optional COLD historical migration and retrieval.

### Example tool payloads

```json
{"tool":"memory_save","args":{"content":"Customer prefers concise Friday updates.","source":"memory_save_decision"}}
```

```json
{"tool":"memory_add_fact","args":{"subject":"partner:42","predicate":"prefers_timezone","object":"Europe/Madrid","confidence":0.9}}
```

```json
{"tool":"memory_query_facts","args":{"query":"timezone","as_of":1712515200,"limit":5}}
```

```json
{"tool":"memory_get_timeline","args":{"limit":20}}
```

```json
{"tool":"memory_debug_explain_retrieval","args":{"query":"friday concise updates","include_facts":true}}
```

```json
{"tool":"memory_import_history","args":{"dry_run":true,"include_long_term":true,"include_daily_notes":true,"include_scoped":true,"max_files":500}}
```

Future expansions may include:

- entity/project facts
- richer scoped memory
- explicit memory MCP tools

## Important Note

Some older docs still refer to memory in more generic terms (for example vector/local memory wording inherited from earlier architecture notes). The current implementation to rely on is the SQLite-backed memory index described here.

For manual validation from Odoo Discuss, see [Odoo Chat Memory QA Guide](ODOO_CHAT_MEMORY_QA.md).
