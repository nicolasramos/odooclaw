# OdooClaw v0.2.0

## ✨ New Features

- Added a guarded Odoo view/report migration toolkit to `odoo-mcp`.
- Introduced phased migration flows for views and reports:
  - read
  - scan
  - propose
  - validate
  - preview
  - apply safe
  - rollback safe
  - assist (single)
  - assist (batch)
- Added visual preview and batch orchestration helpers for migration workflows.

## 🛡️ Safety and Guardrails

- Added the official updater script: `odooclaw/scripts/update-odooclaw.sh`.
- Updater protects user-critical and editable paths by default, including:
  - `workspace/**`
  - `odooclaw/workspace/**`
  - `config/**`
  - `odooclaw/config/**`
  - `.env`, `.env.*`, `odooclaw/.env`, `odooclaw/.env.*`
- Added dry-run planning support and explicit overwrite flag for intentional local override scenarios.

## 🧪 Test and Quality

- Added dedicated tests for view/report migration service behavior.
- Updated related security/chatter tests to align with current service contracts.
- Full `odoo-mcp` test suite validated successfully during implementation.

## 📚 Documentation

- Added official update guide:
  - `odooclaw/docs/ODOOCLAW_OFFICIAL_UPDATE.md`
- Added migration tools guide:
  - `odooclaw/docs/odoo-view-report-migration-tools.md`
- Updated documentation index links.

## Key Commits

- `d8c744b` — Add official safe updater script and docs
- `abb85e9` — Add guarded Odoo view/report migration MCP tools

## Notes

- This release is intentionally focused on safe operational behavior and migration guardrails.
- No forced push or remote release publication is performed automatically.
