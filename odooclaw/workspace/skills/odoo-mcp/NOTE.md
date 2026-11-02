# Why there is no SKILL.md for odoo-mcp

This directory is **not** an OdooClaw skill — it is a standalone Python package
that exposes 130 `@mcp.tool()` definitions via the MCP protocol.

The skill loader (`pkg/skills/loader.go`) only discovers directories that
contain a `SKILL.md` file. Because `odoo-mcp/` serves a different purpose
(an MCP server, not an agent skill), it intentionally omits `SKILL.md` so
the loader does not pick it up.

## Files in this directory

- `README.md` — Usage and architecture documentation
- `QA_RUNBOOK.md` — Quality assurance checklist
- `requirements.txt` — Python dependencies
- `src/odoo_mcp/server.py` — 130 MCP tool definitions
- `tests/` — Unit tests

## References

- PR [#121](https://github.com/nicolasramos/odooclaw/pull/121):
  Clarification that this directory is not a skill.
