# Doodba Minimal Stack Example (OdooClaw + Browser Copilot + Redis)

This guide provides copy/paste-ready examples for a minimal Doodba setup using `prod.yaml`.

## Files to copy

From repository root:

- `examples/doodba/prod.odooclaw-browser-copilot.redis.yaml`
- `examples/doodba/odoo-env-odooclaw-browser-copilot.example`
- `examples/doodba/config.odooclaw.minimal.example.json`

## 1) `prod.yaml`

Copy service blocks from:

```text
examples/doodba/prod.odooclaw-browser-copilot.redis.yaml
```

Add them under `services:` in your Doodba `prod.yaml`.

## 2) `.docker/odoo.env`

Use:

```text
examples/doodba/odoo-env-odooclaw-browser-copilot.example
```

Copy values into your real `.docker/odoo.env` and replace placeholders.

STT mode can be selected with:

- `STT_PROVIDER=local` (local only)
- `STT_PROVIDER=openai` (API only)
- `STT_PROVIDER=auto` (local + API fallback, default)

For OpenAI-compatible STT providers, set `STT_API_BASE`, `STT_API_KEY`, and `STT_OPENAI_MODEL`.

## 3) OdooClaw config

Create config file:

```bash
cp examples/doodba/config.odooclaw.minimal.example.json odooclaw/config/config.json
```

This is a baseline config. Environment variables from `.docker/odoo.env` still take precedence.

## 4) Odoo 16 module

Ensure this module exists in your addons tree:

```text
odoo/custom/src/16.0/mail_bot_odooclaw/
```

In Odoo UI, set:

```text
odooclaw.webhook_url = http://odooclaw:18790/webhook/odoo
```

## 5) Start stack

```bash
docker compose -f prod.yaml build odoo odooclaw browser-copilot
docker compose -f prod.yaml up -d db redis odoo odooclaw browser-copilot
docker compose -f prod.yaml logs -f odooclaw browser-copilot
```

## 6) Why Redis is included

- Redis is required by the main `odooclaw` runtime pattern (async/background coordination).
- `browser-copilot` does not require Redis directly, but it is coupled to OdooClaw chat flow.

## 7) Extension setup

- Source path: `browser_extension/`
- Backend URL: `http://127.0.0.1:8765`
- Token header: `x-browser-copilot-token` (same value as `BROWSER_COPILOT_TOKEN`)

Manual pairing flow:

1. In Odoo chat, run `/browser-pair`
2. Paste code in extension popup and click **Vincular**
3. Enable **Compartir esta pestaña con OdooClaw**
