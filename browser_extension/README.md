# OdooClaw Browser Extension (Chrome + Firefox)

This extension links a browser tab to an OdooClaw chat using a pairing code, then shares structured page context per tab.

## Current UX (Phase 1)

The popup is intentionally minimal and focused on three actions:

1. **Connection status**: linked / not linked
2. **Pairing code**: input + link action
3. **Share this tab**: per-tab toggle for browser context sharing

Branding assets are included under `browser_extension/assets/`.

## Browser Support

- Chrome / Chromium (Manifest V3)
- Firefox (temporary add-on flow in development)

Manifest includes Firefox metadata under `browser_specific_settings.gecko`.

## Install for Local Development

### Chrome / Chromium

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `browser_extension/`.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `browser_extension/manifest.json`.

## Backend Requirements

Run Browser Copilot backend and keep token aligned with extension settings:

- Backend URL: `http://127.0.0.1:8765`
- Header token: `x-browser-copilot-token`
- Env token: `BROWSER_COPILOT_TOKEN`

Relevant endpoints used in pairing/context flow:

- `POST /browser-copilot/pairing/create`
- `POST /browser-copilot/pairing/link`
- `POST /browser-copilot/snapshot`
- `POST /browser-copilot/context/resolve`

## Functional Flow (Pairing + Share)

1. In OdooClaw chat, request pairing code with `/browser-pair`.
2. Open extension popup and paste the pairing code.
3. Click **Vincular**.
4. Enable **Compartir esta pestaña con OdooClaw**.
5. Ask questions in the same chat (for example visible order/client/totals).

The context is linked to that conversation and scoped per tab.

## Package ZIP Artifacts

```bash
bash browser_extension/scripts/pack_extension.sh
```

Generated files:

- `browser_extension/dist/odooclaw-browser-extension-chrome.zip`
- `browser_extension/dist/odooclaw-browser-extension-firefox.zip`

## Security Notes

- Keep `BROWSER_COPILOT_READ_ONLY=true` for onboarding.
- Use allowlisted domains only.
- Do not hardcode production tokens in tracked files.
