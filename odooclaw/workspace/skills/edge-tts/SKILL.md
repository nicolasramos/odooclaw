---
name: edge-tts
description: Microsoft Edge Text-to-Speech (TTS) synthesis. Converts text to natural audio using Edge's AI voices. Uploads directly to Odoo as voice attachments with discuss.voice.metadata. Use when user wants voice/audio response, asks to "speak this", "read aloud", "voice response".
homepage: https://github.com/nicolasramos/odooclaw
metadata: {"openclaw":{"emoji":"🔊","requires":{"env":["ODOO_URL","ODOO_DB","ODOO_USERNAME","ODOO_PASSWORD"]}}}
---

# Edge TTS Skill

## Overview

This skill uses Microsoft Edge's Text-to-Speech engine to generate high-quality audio from text. The audio is automatically uploaded to Odoo as an `ir.attachment` with `discuss.voice.metadata`, making it playable directly in Odoo Discuss.

## Quick Reference

| Use Case | Tool |
|----------|------|
| Convert text to voice | `edge-tts-synthesize` |
| List available voices | `edge-tts-list-voices` |

## Tools

### edge-tts-synthesize

Generates audio from text using Edge TTS and uploads to Odoo.

**Parameters:**
- `text` (required): Text to convert to speech (recommended max ~1000 chars)
- `voice` (optional): Voice name. Default: `es-ES-ElenaNeural`

**Returns:** `attachment_id` to use in Odoo message_post

### edge-tts-list-voices

Lists all available Edge TTS voices with language and description.

## Available Voices

| Voice ID | Language | Description |
|----------|----------|-------------|
| `es-ES-ElenaNeural` | Spanish (Spain) | Female |
| `es-MX-DaliaNeural` | Spanish (Mexico) | Female |
| `es-AR-TomasNeural` | Spanish (Argentina) | Male |
| `en-US-JennyNeural` | English (US) | Female |
| `en-US-GuyNeural` | English (US) | Male |
| `en-GB-SoniaNeural` | English (UK) | Female |
| `en-GB-RyanNeural` | English (UK) | Male |
| `fr-FR-DeniseNeural` | French | Female |
| `fr-FR-HenriNeural` | French | Male |
| `de-DE-KatjaNeural` | German | Female |
| `de-DE-ConradNeural` | German | Male |
| `it-IT-ElsaNeural` | Italian | Female |
| `it-IT-DiegoNeural` | Italian | Male |
| `pt-BR-FranciscaNeural` | Portuguese (Brazil) | Female |
| `pt-BR-AntonioNeural` | Portuguese (Brazil) | Male |
| `zh-CN-XiaoxiaoNeural` | Chinese (Mandarin) | Female |
| `zh-CN-YunyangNeural` | Chinese (Mandarin) | Male |
| `ja-JP-NanamiNeural` | Japanese | Female |
| `ja-JP-KeitaNeural` | Japanese | Male |

## Usage Examples

### Example 1: Basic Spanish Voice Synthesis

**User says:** "Lee en voz alta el resumen del pedido"

**Action:**
```json
{
  "name": "edge-tts-synthesize",
  "arguments": {
    "text": "Aquí está el resumen del pedido S00001: Cliente: Acme Corp, Total: 1,500 euros, Estado: Pendiente de confirmación.",
    "voice": "es-ES-ElenaNeural"
  }
}
```

**Result:** Returns `attachment_id` (e.g., 1234) that can be attached to message_post in Odoo.

### Example 2: English Voice with Different Accent

**User says:** "Read this in English"

**Action:**
```json
{
  "name": "edge-tts-synthesize",
  "arguments": {
    "text": "Here is your sales summary for today: 5 new orders, total amount 12,500 euros.",
    "voice": "en-GB-SoniaNeural"
  }
}
```

### Example 3: Check Available Voices

**User says:** "What voices are available?"

**Action:**
```json
{
  "name": "edge-tts-list-voices",
  "arguments": {}
}
```

## Integration with Odoo

After generating audio:

1. The skill creates an `ir.attachment` with the audio file
2. Creates a `discuss.voice.metadata` record linking to the attachment
3. Returns `attachment_id` to include in message_post

**Posting voice message to Odoo:**
```python
# Using odoo-manager skill after edge-tts returns attachment_id
{
  "model": "discuss.channel",
  "method": "message_post",
  "args": [[channel_id]],
  "kwargs": {
    "body": "Audio message",
    "attachment_ids": [attachment_id_from_tts]
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ODOO_URL` | Yes | Odoo server URL (e.g., http://odoo:8069) |
| `ODOO_DB` | Yes | Odoo database name |
| `ODOO_USERNAME` | Yes | Odoo username |
| `ODOO_PASSWORD` | Yes | Odoo password or API key |

## Best Practices

1. **Keep text concise**: Edge TTS works best with 1000 characters or less. For longer text, split into chunks.
2. **Match language**: Use the voice that matches the user's language preference.
3. **Consider context**: Use female voices for general assistance, male for formal reports, etc.
4. **Error handling**: If synthesis fails, fall back to plain text response.

## Limitations

- Text length: ~1000 characters recommended maximum
- Requires internet for Edge TTS service (no offline mode)
- Audio format: MP3 only
