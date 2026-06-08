# Changelog

All notable changes to OdooClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [0.3.0] - 2026-06-08

### Added
- Safe purchase and vendor-bill workflows with OCR validation, duplicate checks, missing-vendor proposals, PO/receipt matching, total validation, and capability-first OCA support.
- Product and inventory visibility tools for products, suppliers, stock availability, locations, moves, and stock forecast explanations.
- Safe warehouse operations for receipts, deliveries, internal transfers, lot/serial traceability, reordering rules, replenishment suggestions, inventory discrepancies, and controlled inventory adjustments.
- Optional OCA logistics capability detection without mandatory OCA dependencies.
- Browser extension distribution links for Firefox Add-ons and Chrome Web Store.
- Engram Docker/Doodba deployment documentation.

### Security
- Hardened delegated Odoo execution so MCP operations inherit the authenticated user's ACLs, record rules, company context, and active status.
- Added a documented least-privilege technical-user pattern.
- Persistent stock operations require preview, dry-run, and explicit confirmation.

### Fixed
- Omitted empty activity deadlines from Odoo activity creation payloads.

### Added
- **Native Security & Permission Inheritance**: OdooClaw now dynamically assumes the Odoo permissions of the user interacting with the bot. All database (ORM) operations pass through a custom endpoint (`/odooclaw/call_kw_as_user`) enforcing Odoo's native Access Rights and Record Rules securely.
- **Smart Document Processing (OCR)**: Added capabilities to scan and understand invoices/purchase orders using specialized OCR MCP skills.
- **Intelligent Invoice & PO Creation**: Automatic lookup or creation of missing products and taxes when processing lines for Vendor Bills and Purchase Orders.
- **Voice Messages Support**: Full bidirectional voice support in Odoo Discuss
  - Speech-to-Text (STT): Transcribe voice notes using Whisper
  - Text-to-Speech (TTS): Generate voice responses using Edge TTS
- **OCR vendor bill flow rebuilt**: `ocr-invoice` skill now supports provider-agnostic OpenAI-compatible vision extraction and a direct `ocr-create-vendor-bill` tool for attachment -> extraction -> bill creation.
- **Workforce toolset expansion**: Added attendance queries, task-oriented timesheet logging, personal task discovery/status update, check-in/check-out, daily summary, missing-timesheet detection, timesheet suggestions, expense report lifecycle, and pending-action notifications.
- **Accounting operations suite**: Added tools for unreconciled bank lines, reconciliation suggestions/actions, AR/AP aging, period-close checks, journal entries (create/post), tax summary, duplicate vendor-bill validation, expense account/tax suggestions, and OCR-validated vendor bill creation.
- **OCR expense flows**: Added `ocr-create-employee-expense` and `ocr-create-mileage-expense` (attachment -> extraction -> expense creation, with dry-run support).
- **Odoo private reply routing controls**: Added DM-only default mode plus optional group-mention mode with private reply targets and user-scoped session isolation.

### New MCP Skills

| Skill | Description |
|-------|-------------|
| `whisper-stt` | Voice transcription with Whisper API (default) and Faster Whisper support (optional) |
| `edge-tts` | Text-to-speech synthesis with Microsoft Edge TTS |
| `ocr-invoice` | Parse PDF/Image invoices and optionally create vendor bills directly in Odoo |

### Updated Components
- `mail_bot_odooclaw` module: Webhook now includes `voice_attachments` array, and added a safe `call_kw_as_user` controller for secure impersonation.
- `mail_bot_odooclaw` controller: Endpoint `/odooclaw/reply` accepts `attachment_ids` and `voice_metadata_ids`.
- `odoo-mcp` MCP server: Passes the `sender_id` to Odoo to enforce secure execution scopes.
- Odoo context injection in tool runtime: Added server/tool alias compatibility for `odoo-mcp` (legacy `odoo-manager` remains supported), ensuring `sender_id`, `company_id`, and `allowed_company_ids` are consistently injected from Odoo chat context.
- Odoo channel routing: Added `allow_group_mentions` config toggle (`ODOOCLAW_CHANNELS_ODOO_ALLOW_GROUP_MENTIONS`) with default `false` for DM-only behavior.
- Odoo webhook payload handling: Added `reply_model`/`reply_res_id` support to separate source thread from private reply target when group mentions are enabled.
- Odoo MCP security allowlist: Added Workforce/expense models (`hr.employee`, `hr.attendance`, `account.analytic.line`, `hr.expense`, `hr.expense.sheet`) to support check-in/checkout and expense flows without fallback access-denied errors.
- Provider tool-call extraction: Added compatibility for Gemma-style pseudo tool-call text (`<|toolcall>call:...{...}`) plus malformed JSON brace repair during extraction.
- OpenAI-compatible provider runtime: Added fallback parsing for content-only Gemma4 pseudo tool-calls (`<|tool_call>...`) when `message.tool_calls` is empty, with nested payload argument normalization.
- Tool registry lookup: Added normalized/fuzzy matching fallback so model-emitted tool names with punctuation drift can still resolve to registered tools.
- Dockerfile: Added `edge-tts`, `aiohttp`, and `faster-whisper` dependencies
- `config.json`: Added `whisper-stt` and `edge-tts` MCP server configurations

### Fixed
- **Doodba installer interactive prompts**: Fixed `scripts/install_doodba.sh` prompt helpers so interactive labels are written to `stderr` instead of `stdout`. This prevents command-substitution capture corruption (for example, Odoo version validation receiving prompt text plus value) and restores reliable capture for version/DB/provider/API inputs.

---

## [1.0.0] - 2024-03-05

### Added
- Initial release of OdooClaw
- Native Odoo Discuss integration via webhooks
- `odoo-mcp` MCP skillset for Odoo ORM operations
- attachment parsing support through MCP skills (Excel/CSV workflows)
- Asynchronous message processing
- Per-channel/user context isolation

### Features
- Odoo 17/18 support
- JSON-RPC authentication with session reuse
- Secure sandbox environment
- Configurable LLM providers (OpenAI, Anthropic, Ollama, vLLM, etc.)
- Heartbeat for periodic tasks
- CLI agent mode for testing
