# Browser Extension Distribution

This document explains how to distribute the OdooClaw browser extension for internal use first, and later through browser stores if needed.

## Current Recommendation

Use this sequence:

1. **Git source as canonical truth**
2. **Load unpacked** for development and internal QA
3. **Zip packaging** for internal releases
4. **Stores later** when UX and permissions are stable

## Source Directory

```text
browser_extension/
```

This directory should remain the single source of truth for:

- popup UI
- background worker
- content script
- manifest
- icons/assets

## Internal Development Install

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `browser_extension/`

This is the recommended mode while the extension is still evolving.

For Firefox local testing:

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `browser_extension/manifest.json`

## Internal Release Packaging

For internal releases, use the packaging script from repo root:

```bash
bash browser_extension/scripts/pack_extension.sh
```

Current artifacts:

- `browser_extension/dist/odooclaw-browser-extension-chrome.zip`
- `browser_extension/dist/odooclaw-browser-extension-firefox.zip`

Recommended release contents:

- extension source snapshot
- manifest
- icons
- README or release notes

## Browser Stores

When the extension is stable enough for public or semi-public release, prepare store publication for:

- Chrome Web Store
- Edge Add-ons
- Firefox Add-ons (AMO)

Before that step:

- confirm permissions are minimal
- confirm branding and metadata are final
- confirm privacy/support pages are available
- confirm update cadence is compatible with store review workflows

## Author / Publisher Metadata

Recommended authorship for distribution materials:

- **Author**: Nicolás Ramos
- **Contact**: contacto@nicolasramos.es

The Chromium `manifest.json` does not provide a strong standard `author` field for store-facing attribution, so authorship should be reflected in:

- repository README
- support/contact documentation
- store publisher account
- release notes

## Icons

The extension currently uses generated PNG icons for:

- `16x16`
- `32x32`
- `48x48`
- `128x128`

Source branding asset is stored in:

```text
browser_extension/assets/
```

## Recommended Internal Strategy

For now, the best production workflow is:

- keep extension in git
- ship unpacked for trusted/internal users
- create zip releases for controlled environments
- postpone store publication until UX and support policy are stable
