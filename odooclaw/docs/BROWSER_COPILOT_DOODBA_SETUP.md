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
