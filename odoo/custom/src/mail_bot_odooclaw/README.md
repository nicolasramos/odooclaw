# OdooClaw AI Bot (`mail_bot_odooclaw`)

> **Fork Notice**: This Odoo module is part of the [OdooClaw](https://github.com/nicolasramos/odooclaw) project, which is a fork of [PicoClaw](https://github.com/sipeed/picoclaw) by [Sipeed], integrated with Odoo ERP.

## Odoo Module

This module is located at: `@odoo/custom/src/mail_bot_odooclaw`

This module integrates an external AI agent (OdooClaw) directly into Odoo's messaging system (Discuss).

## Features

- **Text Messages**: AI-powered responses to mentions and direct messages
- **Voice Messages**: Send and receive voice notes with automatic transcription
- **Attachments**: Automatic handling of Excel/CSV files and other attachments

## How it works

The module acts as a two-way bridge between Odoo conversations and an external AI service.

### 1. Outgoing Messages (Odoo -> OdooClaw)
When the **OdooClaw** bot user (login: `odooclaw_bot`) is mentioned in a message or receives a direct message (DM), the module intercepts the message and sends a **webhook** asynchronously.

- **Trigger**: Mention in channels or direct DM.
- **Format**: JSON sent via a POST request.
- **Payload**:
  ```json
  {
    "message_id": 100,
    "model": "discuss.channel",
    "res_id": 5,
    "author_id": 3,
    "author_name": "John Doe",
    "body": "Hello!",
    "is_dm": true,
    "voice_attachments": [
      {"id": 123, "name": "voice.mp3", "mimetype": "audio/mp4"}
    ],
    "attachments": []
  }
  ```

### 2. Incoming Messages (OdooClaw -> Odoo)
The module exposes an endpoint so the bot can reply directly to Odoo threads.

- **Endpoint**: `/odooclaw/reply`
- **Method**: `POST`
- **Text message body**:
  ```json
  {
    "model": "discuss.channel",
    "res_id": 5,
    "message": "Hello! I'm OdooClaw."
  }
  ```
- **Voice message body**:
  ```json
  {
    "model": "discuss.channel",
    "res_id": 5,
    "message": "🎤 Nota de voz",
    "attachment_ids": [456],
    "voice_metadata_ids": [789]
  }
  ```

## Voice Messages (STT & TTS)

The module supports bidirectional voice communication:

### Receiving Voice Messages (Speech-to-Text)
When a user sends a voice note:
1. The webhook detects `voice_attachments` in the payload
2. OdooClaw transcribes the audio using Whisper
3. The AI processes the transcribed text

### Sending Voice Responses (Text-to-Speech)
When the user requests voice output:
1. OdooClaw generates audio using Edge TTS
2. Audio is uploaded as an Odoo attachment
3. Voice metadata is created for proper playback in Discuss

## Webhook Configuration in Odoo

The module uses a system parameter to determine where to send the requests.

### Parameter Priority
The code is designed to give **absolute priority** to the configuration stored in the **System Parameters**:

1. **System Parameter**: Looks for the key `odooclaw.webhook_url`.
2. **Default Value**: If the parameter does not exist, it defaults to `http://odooclaw:18790/webhook/odoo`.

To change the destination URL:
1. Activate **Developer Mode**.
2. Go to **Settings > Technical > System Parameters**.
3. Locate or create the `odooclaw.webhook_url` key and assign the desired value.

---

## Docker / Doodba Integration

To deploy OdooClaw alongside Odoo in a Doodba or Docker Compose environment, it is recommended to define the service and its environment variables.

### Recommended `docker-compose.yml` (or `prod.yaml`) Structure

```yaml
services:
  odooclaw:
    build:
      context: ./odooclaw
      dockerfile: docker/Dockerfile
    restart: unless-stopped
    environment:
      - ODOO_URL=http://odoo:8069
      - ODOO_DB=${POSTGRES_DB:-devel}
      - ODOO_USERNAME=${ODOO_USERNAME:-admin}
      - ODOO_PASSWORD=${ODOO_PASSWORD:-admin}
      
      # LLM Configuration
      - ODOOCLAW_AGENTS_DEFAULTS_PROVIDER=openai
      - ODOOCLAW_AGENTS_DEFAULTS_MODEL=gpt-4o
      - ODOOCLAW_PROVIDERS_OPENAI_API_KEY=${OPENAI_API_KEY}
      - ODOOCLAW_PROVIDERS_OPENAI_API_BASE=${OPENAI_API_BASE:-https://api.openai.com/v1}
      
      # Odoo Channel Configuration
      - ODOOCLAW_CHANNELS_ODOO_ENABLED=true
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_HOST=0.0.0.0
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PORT=18790
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PATH=/webhook/odoo
      
      # Voice (STT - Optional)
      # For Whisper API fallback (if local Whisper fails or is not available)
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - odooclaw_data:/home/odooclaw/.odooclaw
    depends_on:
      - odoo
    networks:
      - default
```

### Voice Transcription Configuration

The OdooClaw container includes **local Whisper** for voice transcription by default (no API key required).

If you want to use **Whisper API** instead (or as fallback):
1. Set `OPENAI_API_KEY` in your environment
2. The system will use local Whisper first, then fall back to API if needed

**Note**: Local Whisper uses the "small" model (~140MB) for better accuracy than "tiny".

### Variable Management with `.env`

**Yes, it is highly recommended to use an `.env` file** to manage credentials and environment-specific configurations (like API Keys). This avoids committing secrets to the repository and makes setup easier on different machines.

In Doodba, you can add these variables to the `.docker/odoo.env` file:

```env
# .docker/odoo.env

# LLM Provider
OPENAI_API_KEY="your_openai_api_key"
OPENAI_API_BASE="https://api.openai.com/v1"

# Odoo Connection
ODOO_PASSWORD="your_odoo_api_key"
```

Docker Compose will automatically load these variables, allowing references like `${OPENAI_API_KEY}` in your YAML file to work correctly.

## Installation

1. Make sure you have the base `mail` module installed.
2. Install `mail_bot_odooclaw`.
3. The module will automatically create a bot user named **OdooClaw** and the necessary system parameter.

## Bot User

The module automatically creates a bot user:
- **Login**: `odooclaw_bot`
- **Name**: OdooClaw

This user is used to post messages on behalf of the AI assistant.
