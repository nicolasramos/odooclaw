# Changelog

All notable changes to OdooClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [1.2.0] - 2026-11-30

### Added
- Business verbs in the Odoo MCP: `odoo_update_by`, `odoo_create_sale_order`, `odoo_create_record`, `odoo_run_action`, `odoo_set_line_quantity`.
- Deterministic dev tools: `dev_add_field_to_view` and `dev_set_view_field_visibility` build the inherited view themselves.
- Proactive quiet hours configurable with `ODOOCLAW_PROACTIVE_QUIET_FROM` and `ODOOCLAW_PROACTIVE_QUIET_TO`.

### Changed
- `tools.mcp` is enabled by default; `odoo_manager` is wired from `ODOO_URL` and `ODOO_DB` when no server is declared.
- Every pipeline prompt carries the business tools rule.

### Fixed
- A prose answer, or an unknown action name, becomes the draft body instead of a failed run.
- A run that hits the job deadline reports its failure instead of staying queued.
- The reply token survives several answers to one conversation.
- The proactive opt-in is persisted and reloaded, so a restart does not ask again.


---

## [1.1.0] - 2026-09-23

### Added
- **RLM-Kernel MCP server** (NRA-1330, PR #75): full MCP server for the RLM kernel — persistent Python kernel with context lake (`rlm_store`/`rlm_search`/`rlm_get`), background subagents via `rlm`/`rlm_result`, and ipython-based state that survives across calls. Includes `SKILL.md`, `kernel.py`, `server.py`, and portable test suite.
- **`odoo_search_read` as MCP tool** (NRA-469, PR #71): expose Odoo `search_read` directly as an MCP tool for external clients.
- **`/system` endpoint** (NRA-493, PR #72): system info endpoint with `MODULES.md` injection into gateway context, security bypass closure for local development.
- **`/webhook/odoo/system` endpoint** (NRA-487, PR #67): webhook for Odoo system events (cache invalidation).
- **CI pytest job for odoo-mcp** (PR #70): automated test runs for the odoo-mcp skill in CI.

### Fixed
- **RLM-Kernel portability** (PR #76): ported fixes F-2, F-4, P-3, F-6, B-2 from rlm-agent to rlm-kernel — memory leak in kernel restart, infinite loop in subagent collection, timeout handling improvements, better error messages.
- **RLM-Kernel test portability** (PR #77): eliminate hardcoded `/tmp` paths from rlm-kernel tests using `tempfile.mkdtemp()`.
- **RetrievalEngine cloud model support** (PR #74): extend RetrievalEngine to work with cloud-based models, not only local.
- **Qwen XML tool-call parser** (PR #77): parse the Qwen XML tool-call dialect emitted as child tags (not attribute-based `<tool_invocation>` format).
- **Test isolation in odoo-mcp** (NRA-597, PR #65): add `conftest.py` for proper test isolation.
- **AppleDouble `._*` files** (PR #68): untrack and `.gitignore` macOS AppleDouble metadata files.

---

## [1.0.0] - 2026-09-22

### Added
- **Model-agnostic 4-layer OCR invoice pipeline** (`ocr-invoice`): vision → fiscal → header → validation. Any OpenAI-compatible vision/LLM endpoint; default GLM-OCR (`odooclaw-vision`) + LFM2.5-1.2B header. Validated 15/31 real invoices (failures go to declared review, never invented). Activated with `OCR_MODE=pipeline`.
- **Structured session memory** (NRA-511): per-session business state (current partner/company/document/module, pending confirmations) + long-term profile (preferences, company). New tools: `memory_set_session_state`, `memory_set_pending_confirmation`, `memory_clear_pending`.
- **Knowledge Base + retrieval engine** (NRA-515): `pkg/knowledge` + `pkg/tools/retrieval.go` — KB store/indexer (tools, aliases, relations, risk levels) with BM25 + metadata retrieval.
- **ToolGuard hardening** (NRA-455/463/464/466): dynamic allowlist from `ir.model`, default denied models, escape hatch via `ir.config_parameter`.
- **Reproducible dataset pipeline** (NRA-512): repo → parser → metadata → JSONL generator + validator + orchestrator (`scripts/dataset_pipeline/`).
- **Local setup installer** (`scripts/setup-local.sh`): auto-detects platform (macOS/Linux), installs deps, builds binary, configures systemd/launchd. Supports both local-AI and cloud modes.
- **Multi-channel webhook server** (NRA-487): `/webhook/odoo/{channel}` — Odoo→OdooClaw entry point with shared HMAC auth + per-channel routing. 6 channels: `odoo`, `email`, `whatsapp`, `telegram`, `signal`, `slack`.
- **Context injection with aliases** (NRA-450): `CONTEXT_INJECTION_ALIASES` env var + `context.aliases` config map; tool name aliases injected into system prompt.
- **Dynamic billing rules** (`account_dynamic_rules`): rule engine for account.move with rules like `round_numbers`, `force_default_payment_method`. 17/17 tests passing. PR: https://github.com/nicolasramos/odoo-addons/pull/9
- **Per-model max_tokens override** (NRA-510): `models.providers.<provider>.defaults.max_tokens` config field; per-model `max_tokens` in `models` array.
- **Context window overflow guard** (NRA-503): rejects requests exceeding 90% of `max_ctx` or provider-specific limit.
- **Conversation persistence** (NRA-528): SQLite-backed chat history with provider/model/context metadata.
- **Session lifecycle management** (NRA-492): 24h timeout, LRU eviction, session metadata (model, channel, provider).
- **Context pruning** (NRA-491): keeps system + last 5 messages, summarizes rest with LLM when over 80% context.
- **Domain-specific agent routing** (NRA-530): Odoo agent for business, RAG agent for knowledge, fallback for general.
- **Tool-level context budgets** (NRA-529): per-tool token limits; Odoo tools capped at 10K tokens.
- **Configurable output token limits** (NRA-527): `output.max_tokens` and per-provider `max_tokens`.
- **Multi-provider context limits** (NRA-526): Anthropic 200K, Google 1M, OpenAI 128K, Ollama 32K.
- **Thread-safe Odoo session** (NRA-597): `threading.Lock` on `json_rpc_call` and `authenticate`.
- **Configurable logging** (`ODOOCLAW_LOG_LEVEL`, `ODOOCLAW_LOG_FORMAT`): env vars + `logging` config section.
- **Claude prompt caching** (NRA-448): 90% cost reduction on Anthropic/Claude.
- **Max tool output control** (`output.max_tool_output_chars`): env var + config.
- **Google Vertex AI support** (NRA-500): full OAuth2 + JSONL credential flow.
- **Hugging Face Inference API** (NRA-499): `hf` provider with Bearer token auth.
- **OpenAI Responses API** (NRA-498): `responses` parameter, output store integration.
- **Anthropic streaming** (NRA-497): SSE with delta accumulation.
- **Claude Code CLI** (NRA-495): `claude` provider for Claude Code.
- **Configurable HTTP timeouts** (NRA-513): per-request `timeout` for slow providers.
- **Odoo tools with MCP skill support** (Excel/CSV workflows)
- **Asynchronous message processing**
- **Per-channel/user context isolation**

### Fixed
- **ToolGuard model validation** (NRA-463): default-deny if model not in `ir.model`.
- **ToolGuard bypass closure** (NRA-466): `ir.config_parameter` escape hatch for locked-down environments.
- **ToolGuard category filtering** (NRA-455): filter by `category_id`.
- **ToolGuard allowlist override** (NRA-464): `config.toolguard.allowlist` overrides dynamic list.
- **SQLite pure-Go** (`modernc.org/sqlite`): CGO_ENABLED=0 compatible builds.
- **Field-sensitive** in `odoo_create` (NRA-425 follow-up).
- **Clickable record URLs** in `odoo_read`/`odoo_search_read` results.

### Security
- HMAC webhook authentication
- Per-channel routing isolation
- ToolGuard dynamic model validation
- Thread-safe session management

---

## [0.x] - 2026-08-01

### Highlights
- Odoo 17/18 support
- JSON-RPC authentication with session reuse
- Secure sandbox environment
- Configurable LLM providers (OpenAI, Anthropic, Ollama, vLLM, etc.)
- Heartbeat for periodic tasks
- CLI agent mode for testing
