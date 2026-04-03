# SQLite Memory Backend

OdooClaw now includes a SQLite-backed memory index for long-term recall and recent-note retrieval.

## Runtime Path

Default workspace path:

```text
~/.odooclaw/workspace/memory/main.sqlite
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

Future expansions may include:

- entity/project facts
- richer scoped memory
- explicit memory MCP tools

## Important Note

Some older docs still refer to memory in more generic terms (for example vector/local memory wording inherited from earlier architecture notes). The current implementation to rely on is the SQLite-backed memory index described here.
