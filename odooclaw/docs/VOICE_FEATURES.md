# Voice Features (STT & TTS)

OdooClaw supports **voice messages** in both directions through two new MCP skills:

## Overview

| Feature | Skill | Description |
|---------|-------|-------------|
| **STT** (Speech-to-Text) | `whisper-stt` | Transcribes voice notes from Odoo |
| **TTS** (Text-to-Speech) | `edge-tts` | Generates voice responses |

---

## Receiving Voice Messages (STT)

### How It Works

1. User sends a voice note in Odoo Discuss
2. The webhook detects `voice_attachments` in the payload
3. OdooClaw downloads the audio from Odoo
4. `whisper-stt` skill transcribes the audio to text
5. LLM processes the transcribed text and generates a response

### Webhook Payload

When a voice message is received, the webhook includes:

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

### Transcription Methods

#### 1. Faster Whisper (Local - PRIORITY)

This is the **recommended** method as it runs locally without API costs.

- **No API key required** when local is available
- Runs locally on CPU
- Uses "tiny" model by default for speed
- Free, unlimited usage

```yaml
# Add to Dockerfile (already included):
RUN pip install faster-whisper --break-system-packages
# Or use whisper package:
RUN pip install whisper --break-system-packages
```

#### 2. Whisper API (OpenAI - Fallback)

Used when local transcription fails or is not available.

- **Requires `OPENAI_API_KEY`**
- More accurate transcription
- Costs ~$0.006/minute

```yaml
environment:
  - OPENAI_API_KEY=sk-...
```

The skill automatically tries Faster Whisper first, then falls back to Whisper API if needed.

---

## Sending Voice Responses (TTS)

### How It Works

1. User asks for voice output ("read this aloud", "voice response")
2. LLM uses `edge-tts` skill to generate audio
3. Audio is uploaded to Odoo as `ir.attachment`
4. Voice metadata (`discuss.voice.metadata`) is created
5. Bot responds with a playable voice note

### Available Voices

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

**Default voice:** `es-ES-ElenaNeural`

### Using TTS

The LLM automatically uses `edge-tts-synthesize` when:
- User asks for "voice response"
- User asks to "read this aloud"
- User requests audio output

---

## Configuration

### Environment Variables

```yaml
services:
  odooclaw:
    environment:
      # Odoo Connection
      - ODOO_URL=http://odoo:8069
      - ODOO_DB=${POSTGRES_DB:-devel}
      - ODOO_USERNAME=${ODOO_USERNAME:-admin}
      - ODOO_PASSWORD=${ODOO_PASSWORD:-admin}
      
      # LLM Configuration
      - ODOOCLAW_AGENTS_DEFAULTS_PROVIDER=openai
      - ODOOCLAW_AGENTS_DEFAULTS_MODEL=gpt-4o
      - ODOOCLAW_PROVIDERS_OPENAI_API_KEY=${OPENAI_API_KEY}
      
      # Voice (STT - Optional)
      # Set to enable Whisper API fallback
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      
      # Voice (TTS - No config needed)
      # Edge TTS is included by default
```

### MCP Servers

Both voice skills are configured in `config.json`:

```json
{
  "mcp": {
    "enabled": true,
    "servers": {
      "whisper-stt": {
        "enabled": true,
        "command": "python3",
        "args": ["/usr/local/bin/whisper-stt-mcp.py"],
        "env": {
          "PYTHONUNBUFFERED": "1",
          "OPENAI_API_KEY": "${OPENAI_API_KEY}"
        }
      },
      "edge-tts": {
        "enabled": true,
        "command": "python3",
        "args": ["/usr/local/bin/edge-tts-mcp.py"],
        "env": {
          "PYTHONUNBUFFERED": "1"
        }
      }
    }
  }
}
```

---

## LLM Integration

### Processing Incoming Voice

The AI agent automatically:

1. Checks for `voice_attachments` in webhook payload
2. Calls `whisper-transcribe` with the attachment ID
3. Uses the transcribed text as user input
4. Processes normally and generates response

### Sending Voice Response

The AI agent automatically:

1. Detects user wants voice output
2. Calls `edge-tts-synthesize` with text and optional voice
3. Gets back `attachment_id` and `voice_metadata_id`
4. Uses `odoo-manager` to post message with attachments:

```python
{
  "model": "discuss.channel",
  "method": "message_post",
  "args": [[channel_id]],
  "kwargs": {
    "body": "🎤 Nota de voz",
    "attachment_ids": [attachment_id],
    "voice_ids": [voice_metadata_id]
  }
}
```

---

## Troubleshooting

### STT Issues

**"Faster Whisper not available"**
- Install: `pip install faster-whisper`
- Or set `OPENAI_API_KEY` to use Whisper API fallback

**"OPENAI_API_KEY not configured"**
- Add `OPENAI_API_KEY` to environment variables
- Or ensure Faster Whisper is installed

### TTS Issues

**"edge-tts not found"**
- Rebuild Docker container with updated Dockerfile
- Verify `edge-tts` is in pip install

**Voice not playing in Odoo**
- Ensure `voice_ids` is included in message_post
- Check Odoo Discuss supports voice messages (Odoo 18+)

---

## Files Reference

| File | Location |
|------|----------|
| STT Server | `workspace/skills/whisper-stt/server.py` |
| STT Skill Doc | `workspace/skills/whisper-stt/SKILL.md` |
| TTS Server | `workspace/skills/edge-tts/server.py` |
| TTS Skill Doc | `workspace/skills/edge-tts/SKILL.md` |
| Odoo Module | `odoo/custom/src/private/mail_bot_odooclaw/` |
| Dockerfile | `docker/Dockerfile` |
| Config | `config/config.json` |
