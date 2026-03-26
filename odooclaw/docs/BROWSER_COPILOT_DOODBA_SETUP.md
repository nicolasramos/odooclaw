# Browser Copilot + Doodba 18 Setup

This guide explains how to run the Browser Copilot MVP together with your Doodba dev/test environment.

## Scope (Phase 1)

- Chrome/Chromium extension only
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

## 4) Load Chromium Extension

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select `browser_extension/`

In popup settings:

- Backend URL: `http://127.0.0.1:8765`
- Token: same as `BROWSER_COPILOT_TOKEN`

## 5) Manual Functional Flow

1. Open Odoo page in browser.
2. Enable extension on that tab.
3. Click `Enviar contexto`.
4. Optionally provide instruction (`resume este cliente`, `que falta en esta factura`).
5. Review plan and suggested actions.
6. If execution is enabled in future, confirm action before run.

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
