# Complete Guide: OdooClaw + Doodba

This guide explains, from start to finish, how to launch OdooClaw inside a Doodba project, configure it, modify `config.json`, and validate it works in Odoo Discuss.

## 1) Prerequisites

You need:
- Docker and Docker Compose working
- An operational Doodba project
- Odoo (17/18) running in that project
- Administrator access to Odoo
- An API key for a model (OpenAI/OpenRouter/Anthropic, etc.) or a local OpenAI-compatible endpoint

## 2) Recommended project structure

Inside your Doodba project, the minimal expected structure is:

```
your-doodba-project/
  devel.yaml
  common.yaml
  odoo/
    custom/
      src/
        private/
          mail_bot_odooclaw
  odooclaw/
    config/
    docs/
    docker/
    workspace/
```

## 3) Integrate the Odoo module

The module is `mail_bot_odooclaw` and acts as a bridge between Discuss and OdooClaw.

Expected path in this project:

```
odoo/custom/src/private/mail_bot_odooclaw
```

Installation in Odoo:
1. Enable developer mode.
2. Apps → Update apps list.
3. Search for `OdooClaw` or `mail_bot_odooclaw`.
4. Install the module.

Upon installation, it creates the bot user and the base system parameter for the webhook.

## 4) Configure services in `devel.yaml`

Define (or review) these services:
- `odoo`
- `db`
- `odooclaw`
- `redis` (recommended for queues/background)

Minimal example for `odooclaw`:

```yaml
odooclaw:
  build:
    context: ./odooclaw
    dockerfile: docker/Dockerfile
  environment:
    - ODOO_URL=http://odoo:8069
    - ODOO_DB=devel
    - ODOO_USERNAME=admin
    - ODOO_PASSWORD=${ODOO_PASSWORD:-admin}
    - ODOOCLAW_AGENTS_DEFAULTS_PROVIDER=openai
    - ODOOCLAW_AGENTS_DEFAULTS_MODEL=gpt4
    - ODOOCLAW_PROVIDERS_OPENAI_API_KEY=${OPENAI_API_KEY}
    - ODOOCLAW_PROVIDERS_OPENAI_API_BASE=${OPENAI_API_BASE:-https://api.openai.com/v1}
    - ODOOCLAW_CHANNELS_ODOO_ENABLED=true
    - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_HOST=0.0.0.0
    - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PORT=18790
    - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PATH=/webhook/odoo
  ports:
    - "18790:18790"
  volumes:
    - odooclaw_data:/home/odooclaw/.odooclaw
    - ./odooclaw/config/config.json:/home/odooclaw/.odooclaw/config.json:ro
  depends_on:
    - odoo
```

Important notes:
- Use uppercase prefix `ODOOCLAW_...` for environment variables.
- Do not hardcode API keys in `devel.yaml`.
- In production, use an Odoo API key instead of the admin password.

## 5) Variables in `.docker/odoo.env`

Manage secrets in `.docker/odoo.env` (or your central `.env`):

```env
ODOO_PASSWORD=your_odoo_api_key
OPENAI_API_KEY=sk-xxxx
OPENAI_API_BASE=https://api.openai.com/v1
TZ=Europe/Madrid
```

Do not commit this file with secrets to the repository.

## 6) Prepare `config.json`

First create your local config:

```bash
cp odooclaw/config/config.example.json odooclaw/config/config.json
```

### 6.1 Agent base configuration

Key section:

```json
"agents": {
  "defaults": {
    "workspace": "~/.odooclaw/workspace",
    "restrict_to_workspace": true,
    "model_name": "gpt4",
    "max_tokens": 8192,
    "temperature": 0.2,
    "max_tool_iterations": 20
  }
}
```

Initial recommendation:
- `temperature`: 0.1 - 0.3 for Odoo transactional tasks
- `max_tool_iterations`: 20-40 depending on tool-call complexity

### 6.2 Define models (`model_list`)

`model_name` must match `agents.defaults.model_name`.

Cloud example (OpenAI):

```json
{
  "model_name": "gpt4",
  "model": "openai/gpt-5.2",
  "api_key": "sk-...",
  "api_base": "https://api.openai.com/v1"
}
```

Local example (OpenAI-compatible endpoint):

```json
{
  "model_name": "local-mlx",
  "model": "openai/your-local-model",
  "api_base": "http://host.docker.internal:8000/v1",
  "api_key": "dummy"
}
```

### 6.3 Odoo channel

Must be enabled:

```json
"channels": {
  "odoo": {
    "enabled": true,
    "webhook_host": "0.0.0.0",
    "webhook_port": 18790,
    "webhook_path": "/webhook/odoo"
  }
}
```

### 6.4 Configure tools

Review `tools` for MCP, web, cron, skills, and exec.

Practical points:
- Enable global MCP and needed MCP servers
- Keep `exec.enable_deny_patterns=true` to block dangerous commands
- Configure `tools.mcp.servers` in `config.json`, not via env for nested structures

## 7) Bring up the stack

From the Doodba project root:

```bash
docker compose build odoo odooclaw
docker compose up -d
```

Check logs:

```bash
docker compose logs -f odooclaw
docker compose logs -f odoo
```

## 8) Configure webhook in Odoo

In Odoo:
1. Settings → Technical → System Parameters.
2. Verify (or create) `odooclaw.webhook_url`.
3. Recommended value on the internal Docker network:

```
http://odooclaw:18790/webhook/odoo
```

## 9) Minimal functional validation

In Discuss, open chat with OdooClaw and try:
1. `hola`
2. `read this excel` with an attached CSV/XLSX
3. Odoo data queries (invoices, orders, etc.)

Health indicators:
- OdooClaw receives webhook and replies in Discuss
- No provider authentication errors
- No Odoo ↔ OdooClaw connection errors

## 10) How to modify configuration without breaking deployment

Recommended order of changes:
1. Change `config.json` (model, tools, channels).
2. Change environment variables in `.docker/odoo.env` if applicable.
3. Rebuild/restart `odooclaw`.
4. Test in Discuss.

Useful commands:

```bash
docker compose up -d --build odooclaw
docker compose logs --since=5m odooclaw
```

## 11) Recommended starter use cases

- Discuss support (operational Q&A)
- Attachment reading (Excel/CSV)
- Provider invoice OCR
- Multi-model Odoo queries via `odoo-manager`

## 12) Common errors and quick fixes

### No response in Discuss
- Validate `odooclaw.webhook_url`
- Validate `ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_PASSWORD`
- Check `docker compose logs odooclaw`

### Model/API error
- Validate `OPENAI_API_KEY` or provider key
- Validate `OPENAI_API_BASE`/local endpoint
- Ensure `model_name` exists in `model_list`

### Local endpoint works outside Docker but not inside
- Use `host.docker.internal` instead of `localhost`
- Confirm port and path `/v1`

### Tools not executing correctly
- Increase `max_tool_iterations`
- Lower `temperature`
- Validate MCP and skills configuration

## 13) Production recommendations
- Use an Odoo API key, not admin password
- Do not expose secrets in YAML or repo
- Pin stable models for tool-calling
- Monitor logs and response latency
- Keep a rollback procedure for `config.json`

## 14) Internal references
- `odooclaw/docs/CONFIGURATION.md`
- `odooclaw/docs/tools_configuration.md`
- `odoo/custom/src/private/mail_bot_odooclaw/README.md`
- `odooclaw/config/config.example.json`