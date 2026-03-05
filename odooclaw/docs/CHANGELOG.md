# Changelog

All notable changes to OdooClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Voice Messages Support**: Full bidirectional voice support in Odoo Discuss
  - Speech-to-Text (STT): Transcribe voice notes using Whisper
  - Text-to-Speech (TTS): Generate voice responses using Edge TTS

### New MCP Skills

| Skill | Description |
|-------|-------------|
| `whisper-stt` | Voice transcription with Whisper API (default) and Faster Whisper support (optional) |
| `edge-tts` | Text-to-speech synthesis with Microsoft Edge TTS |

### Updated Components
- `mail_bot_odooclaw` module: Webhook now includes `voice_attachments` array
- `mail_bot_odooclaw` controller: Endpoint `/odooclaw/reply` accepts `attachment_ids` and `voice_metadata_ids`
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
