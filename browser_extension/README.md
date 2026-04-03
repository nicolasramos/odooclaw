# OdooClaw Browser Extension (Chrome + Firefox)

This extension captures structured context from the active tab and sends it to the local OdooClaw Browser Copilot backend.

## MVP Features

- Per-tab enable/disable toggle
- Snapshot capture (`url`, `title`, visible text summary, forms, tables, interactive elements)
- Local HTTP calls to backend:
  - `POST /browser-copilot/snapshot`
  - `POST /browser-copilot/plan` (when instruction is provided)
  - `POST /browser-copilot/action` (approved action execution)
- Popup status: backend configuration, domain, capture state, pending action, last snapshot summary
- Copilot response panel in popup with:
  - analysis summary
  - detected issues
  - suggested next steps
  - optional plan intent/confidence/actions when instruction is provided
- Safe execution only for allowed action types

## Load Unpacked Extension (Chrome)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `browser_extension/`.

## Load Temporary Add-on (Firefox)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `browser_extension/manifest.json`.

> Note: Manifest includes `browser_specific_settings.gecko` for Firefox compatibility.

## Build distributable ZIPs

```bash
bash browser_extension/scripts/pack_extension.sh
```

Output files:

- `browser_extension/dist/odooclaw-browser-extension-chrome.zip`
- `browser_extension/dist/odooclaw-browser-extension-firefox.zip`

## Configure

In popup:

- **Backend URL**: default `http://127.0.0.1:8765`
- **Local token**: must match backend `BROWSER_COPILOT_TOKEN`

## Manual Test Flow

1. Open an Odoo tab (or any allowed domain).
2. Open extension popup.
3. Toggle **Enable in this tab**.
4. Click **Enviar contexto**.
5. Read the **Copilot response** block in popup (guidance is shown there).
6. Optionally add instruction (example: `resume este cliente`) and click again to request plan.
7. If backend returns an action, click **Ejecutar acción** and confirm.

## Important UX Note (Phase 1)

- Browser Copilot responses are shown in the extension popup.
- This flow does not post messages into Odoo Discuss yet.
- Odoo Discuss remains handled by the main `odooclaw` webhook channel.

## Notes

- The extension never executes arbitrary JavaScript.
- It only supports `click`, `set_value`, `select_option`, `scroll_into_view`.
- Final enforcement still happens in backend.
