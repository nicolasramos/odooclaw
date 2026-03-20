---
name: whisper-stt
description: Speech-to-Text transcription using Whisper. Transcribes voice messages from Odoo attachments to text. Supports local Faster Whisper (no API key) and OpenAI Whisper API fallback. Use when user sends a voice note or audio attachment.
homepage: https://github.com/nicolasramos/odooclaw
metadata: {"openclaw":{"emoji":"🎤","requires":{"env":["ODOO_URL","ODOO_DB","ODOO_USERNAME","ODOO_PASSWORD","OPENAI_API_KEY"]}}}
---

# Whisper STT Skill

## Overview

This skill transcribes voice messages from Odoo attachments to text using Whisper. It supports two methods:

1. **Faster Whisper** (local) - No API key needed, runs on CPU
2. **Whisper API** (OpenAI) - More accurate, requires `OPENAI_API_KEY`

The skill automatically tries Faster Whisper first, then falls back to API if needed.

## Quick Reference

| Use Case | Tool |
|----------|------|
| Transcribe voice note | `whisper-transcribe` |
| Check available methods | `whisper-list-methods` |

## Tools

### whisper-transcribe

Transcribes an audio attachment from Odoo.

**Parameters:**
- `attachment_id` (required): The Odoo ir.attachment ID to transcribe

**Returns:** Transcribed text, detected language, and method used

### whisper-list-methods

Lists available transcription methods and their status.

## Usage Examples

### Example 1: Transcribe a Voice Message

When user sends a voice note, the webhook includes `voice_attachments` with the attachment ID.

**Action:**
```json
{
  "name": "whisper-transcribe",
  "arguments": {
    "attachment_id": 1234
  }
}
```

**Result:**
```json
{
  "success": true,
  "text": "Hola, me gustaría saber el estado del pedido S00001",
  "language": "es",
  "method": "faster_whisper"
}
```

### Example 2: Full Workflow

1. User sends voice note → webhook includes `voice_attachments: [{id: 1234, name: "voice.mp3"}]`
2. Use `whisper-transcribe` to get text
3. Use `odoo-manager` to query the data user is asking about
4. Reply with text or use `edge-tts-synthesize` for voice response

## Integration with Odoo

### Webhook Payload Changes

When a voice message is received, the webhook now includes:

```json
{
  "message_id": 100,
  "model": "discuss.channel",
  "res_id": 5,
  "author_id": 3,
  "author_name": "John Doe",
  "body": "\n🎤 [Nota de voz: voice_20240315.mp3 (ID: 123)]\n",
  "is_dm": true,
  "voice_attachments": [
    {
      "id": 123,
      "name": "voice_20240315.mp3",
      "mimetype": "audio/mp4"
    }
  ],
  "attachments": []
}
```

### Detecting Voice Messages

Check for `voice_attachments` array in the webhook payload. Each voice attachment has:
- `id`: The attachment ID to pass to whisper-transcribe
- `name`: Original filename
- `mimetype`: Audio MIME type

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ODOO_URL` | Yes | Odoo server URL |
| `ODOO_DB` | Yes | Odoo database name |
| `ODOO_USERNAME` | Yes | Odoo username |
| `ODOO_PASSWORD` | Yes | Odoo password or API key |
| `OPENAI_API_KEY` | No | For Whisper API fallback |

## Configuration

### Using Faster Whisper Only (No API Key)

```yaml
# docker-compose.yml
environment:
  - OPENAI_API_KEY=  # Not needed
```

The skill will use Faster Whisper (local) for all transcriptions.

### Using Whisper API (More Accurate)

```yaml
environment:
  - OPENAI_API_KEY=sk-...
```

The skill will use Whisper API for better accuracy.

### Using Both (Recommended)

```yaml
environment:
  - OPENAI_API_KEY=sk-...
```

1. Faster Whisper is tried first (free, local)
2. If it fails, Whisper API is used as fallback

## Supported Audio Formats

- MP3
- MP4
- WAV
- OGG
- WebM
- M4A

## Limitations

- **Faster Whisper**: Uses "tiny" model by default for speed. Larger models = more accurate but slower.
- **Audio length**: No hard limit, but very long audio may timeout.
- **API cost**: Whisper API costs ~$0.006/minute (as of 2024).

## Best Practices

1. **Check for voice first**: Always check `voice_attachments` in webhook payload
2. **Confirm transcription**: Show user the transcribed text before processing
3. **Handle errors gracefully**: If transcription fails, ask user to send text instead
4. **Language**: Faster Whisper auto-detects language; Whisper API does too
