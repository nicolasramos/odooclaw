# OdooClaw AI Bot (`mail_bot_odooclaw`)

> **Fork Notice**: This Odoo module is part of the [OdooClaw](https://github.com/nicolasramos/odooclaw) project, which is a fork of [PicoClaw](https://github.com/sipeed/picoclaw) by [Sipeed](https://github.com/sipeed), integrated with Odoo ERP.

## Odoo Module

This module is located at: `@odoo/custom/src/mail_bot_odooclaw`

This module integrates an external AI agent (OdooClaw) directly into Odoo's messaging system (Discuss).

## How it works

The module acts as a two-way bridge between Odoo conversations and an external AI service.

### 1. Outgoing Messages (Odoo -> OdooClaw)
When the **OdooClaw** bot user (login: `odooclaw_bot`) is mentioned in a message or receives a direct message (DM), the module intercepts the message and sends a **webhook** asynchronously.

- **Trigger**: Mention in channels or direct DM.
- **Format**: JSON sent via a POST request.
- **Payload**:
  - `message_id`: ID of the message in Odoo.
  - `model`: Related model (e.g., `discuss.channel`, `sale.order`, etc.).
  - `res_id`: ID of the related record.
  - `author_id`: ID of the message author.
  - `author_name`: Name of the author.
  - `body`: Plain text of the message.
  - `is_dm`: Boolean indicating if it's a direct message.

### 2. Incoming Messages (OdooClaw -> Odoo)
The module exposes an endpoint so the bot can reply directly to Odoo threads.

- **Endpoint**: `/odooclaw/reply`
- **Method**: `POST`
- **Expected body**:
  ```json
  {
    "model": "model.name",
    "res_id": 123,
    "message": "Response text"
  }
  ```

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
      - ODOOCLAW_AGENTS_DEFAULTS_PROVIDER=openai
      - ODOOCLAW_AGENTS_DEFAULTS_MODEL=gpt-4o
      - ODOOCLAW_PROVIDERS_OPENAI_API_KEY=${OPENAI_API_KEY}
      - ODOOCLAW_PROVIDERS_OPENAI_API_BASE=${OPENAI_API_BASE}
      - ODOOCLAW_CHANNELS_ODOO_ENABLED=true
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_HOST=0.0.0.0
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PORT=18790
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PATH=/webhook/odoo
    volumes:
      - odooclaw_data:/home/odooclaw/.odooclaw
    depends_on:
      - odoo
    networks:
      - default
```

### Variable Management with `.env`

**Yes, it is highly recommended to use an `.env` file** to manage credentials and environment-specific configurations (like API Keys). This avoids committing secrets to the repository and makes setup easier on different machines.

In Doodba, you can add these variables to the `.docker/odoo.env` file:

```env
# .docker/odoo.env
OPENAI_API_KEY="your_api_key_here"
OPENAI_API_BASE="http://your_api_base_url/v1"
```

Docker Compose will automatically load these variables, allowing references like `${OPENAI_API_KEY}` in your YAML file to work correctly.

## Installation

1. Make sure you have the base `mail` module installed.
2. Install `mail_bot_odooclaw`.
3. The module will automatically create a bot user named **OdooClaw** and the necessary system parameter.
