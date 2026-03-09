# Changelog

All notable changes to OdooClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Native Security & Permission Inheritance**: OdooClaw now dynamically assumes the Odoo permissions of the user interacting with the bot. All database (ORM) operations pass through a custom endpoint (`/odooclaw/call_kw_as_user`) enforcing Odoo's native Access Rights and Record Rules securely.
- **Smart Document Processing (OCR)**: Added capabilities to scan and understand invoices/purchase orders using specialized OCR MCP skills.
- **Intelligent Invoice & PO Creation**: Automatic lookup or creation of missing products and taxes when processing lines for Vendor Bills and Purchase Orders.
- **Voice Messages Support**: Full bidirectional voice support in Odoo Discuss
  - Speech-to-Text (STT): Transcribe voice notes using Whisper
  - Text-to-Speech (TTS): Generate voice responses using Edge TTS
- **OCR vendor bill flow rebuilt**: `ocr-invoice` skill now supports provider-agnostic OpenAI-compatible vision extraction and a direct `ocr-create-vendor-bill` tool for attachment -> extraction -> bill creation.

### New MCP Skills

| Skill | Description |
|-------|-------------|
| `whisper-stt` | Voice transcription with Whisper API (default) and Faster Whisper support (optional) |
| `edge-tts` | Text-to-speech synthesis with Microsoft Edge TTS |
| `ocr-invoice` | Parse PDF/Image invoices and optionally create vendor bills directly in Odoo |

### Updated Components
- `mail_bot_odooclaw` module: Webhook now includes `voice_attachments` array, and added a safe `call_kw_as_user` controller for secure impersonation.
- `mail_bot_odooclaw` controller: Endpoint `/odooclaw/reply` accepts `attachment_ids` and `voice_metadata_ids`.
- `odoo-manager` MCP server: Passes the `sender_id` to Odoo to enforce secure execution scopes.
- Dockerfile: Added `edge-tts`, `aiohttp`, and `faster-whisper` dependencies
- `config.json`: Added `whisper-stt` and `edge-tts` MCP server configurations

---

## [1.0.0] - 2024-03-05

### Added
- Initial release of OdooClaw
- Native Odoo Discuss integration via webhooks
- `odoo-manager` MCP skill for full Odoo ORM access
- `odoo-read-excel-attachment` MCP skill for Excel/CSV parsing
- Asynchronous message processing
- Per-channel/user context isolation

### Features
- Odoo 17/18 support
- JSON-RPC authentication with session reuse
- Secure sandbox environment
- Configurable LLM providers (OpenAI, Anthropic, Ollama, vLLM, etc.)
- Heartbeat for periodic tasks
- CLI agent mode for testing
