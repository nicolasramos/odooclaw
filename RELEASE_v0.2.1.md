# OdooClaw v0.2.1

## ✨ Improvements

- Standardized MCP server launch configuration to use generic commands instead of workspace-specific absolute paths.
- Updated the Odoo/Doodba installer to generate MCP configuration defaults under `tools.mcp`.
- Added STT OpenAI-compatible environment defaults for installer-generated `.docker/odoo.env`.

## 🔧 Runtime Compatibility

- `odoo-manager` now uses module execution (`python3 -m odoo_mcp.server`).
- Voice/OCR/utility MCP servers now use PATH-resolved commands:
  - `whisper-stt-mcp.py`
  - `edge-tts-mcp.py`
  - `ocr-invoice-mcp.py`
  - `rlm-utils-mcp.py`
- `rlm-utils` workspace resolution now supports environment-driven portability via `ODOOCLAW_WORKSPACE_PATH`.

## 📚 Documentation Updates

- Updated Doodba setup guides (EN/ES) to recommend generic MCP command paths.
- Updated browser copilot Doodba setup env examples with STT variables.
- Updated voice features guide to match current `tools.mcp` config shape and generic command approach.

## ✅ Validation

- Installer shell syntax validated (`bash -n scripts/install_doodba.sh`).
- Base config JSON validated (`python3 -m json.tool odooclaw/config/config.example.json`).

## Key Commits

- `bebe421` — Update installer and base config for generic MCP routing
- `efb8ea1` — Document generic MCP command paths in Doodba guides

## Notes

- This release focuses on predictable MCP startup behavior across controlled Doodba deployments and user production environments.
- No remote push is performed automatically.
