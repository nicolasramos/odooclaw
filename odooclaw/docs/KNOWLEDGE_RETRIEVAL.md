# Knowledge Base & Tool Retrieval (NRA-515)

The Knowledge Base + Retrieval Engine gives OdooClaw domain knowledge about
Odoo and the tools available, so the model receives **only the relevant
tools** for the current query instead of all 100+ schemas.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  RetrievalEngine (pkg/tools/retrieval.go)                  │
│  ┌───────────────┐   ┌──────────────────────────────────┐  │
│  │ QueryRewriter │   │ SynonymRewriter                  │  │
│  │ (interface)   │ → │ expands synonyms (SO→sale order) │  │
│  └───────────────┘   └──────────────────────────────────┘  │
│            ↓                                               │
│  SQLite FTS5 index of tool schemas (names, descriptions,   │
│  parameters) + BM25 ranking + domain filter                │
│            ↓                                               │
│  Top-N tool names for the prompt                           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  KnowledgeBase (pkg/knowledge/knowledge.go)                │
│  SQLite FTS5 over KnowledgeEntry:                          │
│    - Category: odoo_module | tool_usage | workflow |       │
│                api_pattern                                 │
│    - Title, Content, Tags, Metadata                        │
│  LoadOdooDomainKnowledge() seeds Odoo domain entries       │
│  Search(query, category, limit) — FTS5 with fallback       │
│  GetRelevantTools(query, limit) — tools by domain query    │
└────────────────────────────────────────────────────────────┘
```

## Retrieval Engine

`pkg/tools/retrieval.go`

- **`IndexTools(registry)`** — indexes every registered tool (name,
  description, parameter names/types) into SQLite FTS5.
- **`Retrieve(query, module, limit)`** — BM25 search over the tool index,
  filtered by domain/module; returns the top-N tool names.
- **`SynonymRewriter`** — expands query synonyms before search (e.g.
  "SO" → "sale order"), improving recall for shorthand user phrasing.
- **Fallback**: if the FTS index is empty, a contains-based matcher still
  returns candidates.

Purpose: instead of injecting all tool schemas into the prompt (~3,800
tokens for 63 tools), the engine retrieves the top 5 and injects only
their compact schemas (~245 tokens — measured in NRA-513).

## Knowledge Base

`pkg/knowledge/knowledge.go`

- `KnowledgeEntry` — categorized knowledge: `odoo_module`, `tool_usage`,
  `workflow`, `api_pattern`.
- FTS5 full-text search (porter unicode61 tokenizer) with metadata table.
- `Add(entry)` — insert; `Search(query, category, limit)` — ranked hits
  with `fallbackSearch` when FTS misses.
- `LoadOdooDomainKnowledge()` — seeds built-in Odoo domain knowledge so a
  fresh install already knows about core modules and patterns.
- `GetRelevantTools(query, limit)` — bridges KB → tools: finds the tools
  most relevant to a domain query.

## Integration

The agent flow (NRA-513 context optimization):

1. User message arrives.
2. `RetrievalEngine.Retrieve(query)` selects the top 3-5 tools.
3. Only those compact schemas are injected into the prompt.
4. If the query is domain-specific ("how do I refund this customer"),
   `KnowledgeBase.Search` adds the matching workflow/pattern entry.

## Files

- `odooclaw/pkg/knowledge/knowledge.go` + `knowledge_test.go`
- `odooclaw/pkg/tools/retrieval.go` + `retrieval_test.go`
- `odooclaw/pkg/tools/registry.go` (enriched registry: metadata, aliases)
