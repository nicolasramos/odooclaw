# Browser Copilot + Doodba 18 Setup

This guide explains how to run the Browser Copilot MVP together with your Doodba dev/test environment.

## Scope (Phase 1)

- Chrome/Chromium + Firefox extension support
- Local HTTP backend (`127.0.0.1:8765`)
- Snapshot + suggestion/plan flow
- Safe actions only (`click`, `set_value`, `select_option`, `scroll_into_view`)
- `read_only=true` by default

## 1) Repository and Doodba Layout

Example local path:

```text
/Users/nramos/DEV/doodba-18
```

Expected structure:

```text
doodba-18/
  devel.yaml
  common.yaml
  .docker/odoo.env
  odoo/
  odooclaw/
    browser_copilot/
    docs/
```

## 2) Start OdooClaw (main gateway)

Use the standard OdooClaw service in Doodba (`odooclaw`) as documented in:

- `odooclaw/docs/GUIDE_DOODBA_SETUP_EN.md`
- `odooclaw/docs/GUIA_DOODBA_PUESTA_EN_MARCHA_ES.md`

Ensure Odoo system parameter:

```text
odooclaw.webhook_url = http://odooclaw:18790/webhook/odoo
```

## 3) Start Browser Copilot Backend

From repository root:

```bash
docker compose -f "odooclaw/browser_copilot/docker-compose.browser-copilot.yml" up --build
```

Environment variables (defaults shown):

```env
BROWSER_COPILOT_ALLOWED_DOMAINS=*.odoo.com,localhost,127.0.0.1
BROWSER_COPILOT_TOKEN=dev-token
BROWSER_COPILOT_READ_ONLY=true
```

### 3.1) Minimal `prod.yaml` configuration (bare Doodba)

If you are starting from a minimal Doodba setup (for example `/opt/doodba`) and using `prod.yaml`, this is a ready-to-use base for `odooclaw` + `browser-copilot`:

```yaml
services:
  odooclaw:
    build:
      context: ./odooclaw
      dockerfile: docker/Dockerfile
    restart: unless-stopped
    env_file:
      - .docker/odoo.env
    environment:
      - ODOO_URL=http://odoo:8069
      - ODOO_DB=${ODOO_DB:-prod}
      - ODOO_USERNAME=${ODOO_USERNAME:-admin}
      - ODOO_PASSWORD=${ODOO_PASSWORD:-admin}
      - ODOOCLAW_AGENTS_DEFAULTS_PROVIDER=openai
      - ODOOCLAW_AGENTS_DEFAULTS_MODEL=gpt-4o-mini
      - ODOOCLAW_PROVIDERS_OPENAI_API_KEY=${OPENAI_API_KEY}
      - ODOOCLAW_PROVIDERS_OPENAI_API_BASE=${OPENAI_API_BASE:-https://api.openai.com/v1}
      - ODOOCLAW_CHANNELS_ODOO_ENABLED=true
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_HOST=0.0.0.0
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PORT=18790
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PATH=/webhook/odoo
      - ODOOCLAW_REDIS_URL=redis://redis:6379/0
      - ODOOCLAW_JOB_STORE=odoo
    ports:
      - "18790:18790"
    volumes:
      - odooclaw_data:/home/odooclaw/.odooclaw
      - ./odooclaw/config/config.json:/home/odooclaw/.odooclaw/config.json:ro
    depends_on:
      - odoo
      - redis
    networks:
      - default

  browser-copilot:
    image: python:3.11-slim
    container_name: browser-copilot
    working_dir: /workspace
    restart: unless-stopped
    env_file:
      - .docker/odoo.env
    environment:
      - BROWSER_COPILOT_ALLOWED_DOMAINS=${BROWSER_COPILOT_ALLOWED_DOMAINS}
      - BROWSER_COPILOT_TOKEN=${BROWSER_COPILOT_TOKEN}
      - BROWSER_COPILOT_READ_ONLY=${BROWSER_COPILOT_READ_ONLY:-true}
    ports:
      - "127.0.0.1:8765:8765"
    volumes:
      - ./odooclaw:/workspace/odooclaw:ro
    command: >
      sh -lc "
      pip install --no-cache-dir -r /workspace/odooclaw/odooclaw/browser_copilot/requirements.txt &&
      uvicorn browser_copilot.app:app --host 0.0.0.0 --port 8765 --app-dir /workspace/odooclaw/odooclaw
      "
    depends_on:
      - odooclaw
    networks:
      - default

volumes:
  odooclaw_data:
```

### 3.2) Minimal `.docker/odoo.env`

```env
# Odoo
ODOO_DB=prod
ODOO_USERNAME=admin
ODOO_PASSWORD=admin

# LLM provider
OPENAI_API_KEY=sk-xxxxxxxx
OPENAI_API_BASE=https://api.openai.com/v1

# Browser Copilot
BROWSER_COPILOT_TOKEN=replace-with-a-long-random-token
BROWSER_COPILOT_ALLOWED_DOMAINS=*.odoo.com,localhost,127.0.0.1
BROWSER_COPILOT_READ_ONLY=true
```

### 3.2.1) Copy/paste example files

You can use these ready-made files directly:

- `examples/doodba/prod.odooclaw-browser-copilot.redis.yaml`
- `examples/doodba/odoo-env-odooclaw-browser-copilot.example`
- `examples/doodba/config.odooclaw.minimal.example.json`

### 3.3) Volume mounts: required vs optional

Required for this minimal setup:

- `./odooclaw:/workspace/odooclaw:ro` in `browser-copilot` (backend code)
- `./odooclaw/config/config.json:/home/odooclaw/.odooclaw/config.json:ro` in `odooclaw`

Optional (advanced customization only):

- Mounting individual skill Python files (`edge-tts`, `whisper-stt`, `ocr-invoice`, `rlm-utils`, etc.)
- Mounting custom MCP source trees for live development

For a clean baseline deployment, do not mount individual Python skill files unless you need hot-swapping or custom skill development.

### 3.4) Why Redis appears in `prod.yaml`

Redis is used by the main `odooclaw` service, not by the browser extension itself.

- `odooclaw` uses Redis for async/background coordination (queue/event-bus style behavior).
- This is why the minimal block includes:
  - `ODOOCLAW_REDIS_URL=redis://redis:6379/0`
  - `depends_on: [redis]`

For Browser Copilot specifically:

- `browser-copilot` does **not** require Redis directly.
- Redis is still recommended because Browser Copilot is linked to OdooClaw chat flow, and OdooClaw runtime relies on Redis in the standard deployment pattern.

## 4) Load Browser Extension

### Chrome / Chromium

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select `browser_extension/`

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `browser_extension/manifest.json`

In the current simplified popup, the main user flow is based on a pairing code. Backend URL and token are only needed for debugging or advanced setup.

Popup UI (current baseline):
- linked / not linked status
- pairing code input
- per-tab context sharing toggle

## 5) Manual Functional Flow

1. Open the target Odoo conversation.
2. Ask OdooClaw for a pairing code:

```text
/browser-pair
```

3. Open the extension popup.
4. Paste the code and click **Vincular**.
5. Activate **Compartir esta pestaña con OdooClaw**.
6. Ask OdooClaw questions such as:
   - `qué pedido tengo en pantalla`
   - `qué cliente tengo en pantalla`
   - `suma el total de lo que veo`

The browser context is linked to that same conversation.

## 6) Smoke Test (API Validation)

Once backend is running:

```bash
./odooclaw/browser_copilot/scripts/smoke_test.sh
```

Expected baseline:

- `GET /browser-copilot/health` -> `200`
- `POST /browser-copilot/snapshot` -> `200`
- `POST /browser-copilot/plan` -> `200`
- `POST /browser-copilot/action` -> `403` while `read_only=true`

## 7) Security Checklist

Before sharing your setup publicly:

1. Replace default token.
2. Keep narrow domain allowlist.
3. Keep read-only enabled for onboarding.
4. Do not store secrets in tracked files.
5. Require explicit user confirmation before any action execution.

## 8) Troubleshooting

- Extension cannot connect:
  - Check backend URL (`127.0.0.1:8765`)
  - Check token header value
  - Check backend logs
- Snapshot rejected by domain:
  - Add domain to `BROWSER_COPILOT_ALLOWED_DOMAINS`
- Action endpoint blocked:
  - This is expected in phase 1 when `BROWSER_COPILOT_READ_ONLY=true`

## 9) Odoo 16 specifics (when running in Doodba 16)

- Ensure module path exists in your addons tree:

```text
odoo/custom/src/16.0/mail_bot_odooclaw/
```

- In Odoo UI, set system parameter:

```text
odooclaw.webhook_url = http://odooclaw:18790/webhook/odoo
```

## 10) Start commands with `prod.yaml`

From Doodba root:

```bash
docker compose -f prod.yaml build odoo odooclaw browser-copilot
docker compose -f prod.yaml up -d db redis odoo odooclaw browser-copilot
docker compose -f prod.yaml logs -f odooclaw browser-copilot
```
