# Synchronization Policy: odoo-mcp

## Canonical vs Derived Declaration

**Canonical source (edited here and only here)**: `odooclaw/workspace/skills/odoo-mcp/`
(embedded in `nicolasramos/odooclaw`)
**Derived repo (never edited by hand)**: `https://github.com/nicolasramos/odooclaw-mcp`
(standalone package, PyPI / ghcr distribution channel)

The embedded copy is THE CANONICAL SOURCE. The separate repo is DERIVED from it
and must be regenerated with the sync script. Do NOT edit the separate repo
directly — always edit the embedded copy and re-derive.

## What Is Compared

The compared set is **`{src/**, tests/**, requirements.txt}` minus the
entry-point exceptions**, and it is the **same set on both sides** — the copy
loop, the orphan deletion in `scripts/sync-odoo-mcp.sh` and the CI gate all
filter the same list.

**Entry-point exceptions (11, neither copied, compared nor deleted).** They are
the packaging layer of the derived package — `pyproject.toml` points its four
console aliases (`odooclaw-mcp`, `odoo-mcp`, `odoo-mcp-server`,
`odoo-18-mcp-server`) at `odoo_mcp.cli:main` — and they live only in the derived
repo:

```
src/odoo_mcp/__init__.py        src/odoo_mcp/core/__init__.py
src/odoo_mcp/__main__.py        src/odoo_mcp/observability/__init__.py
src/odoo_mcp/cli.py             src/odoo_mcp/schemas/__init__.py
src/odoo_mcp/healthcheck.py     src/odoo_mcp/security/__init__.py
                                src/odoo_mcp/services/__init__.py
                                src/odoo_mcp/tools/__init__.py
                                tests/__init__.py
```

**Out of scope by construction** (outside `{src, tests, requirements.txt}`, so
neither copied nor compared): the packaging files of the derived repo
(`pyproject.toml`, `setup.py`, `server.json`, `package.json`, `Dockerfile`,
`docker-compose.yml`, `.dockerignore`, `.env.example`, `.gitignore`, `uv.lock`,
`pytest.ini`, `requirements-dev.txt`, `CHANGELOG.md`, `AUTHORS.md`, `LICENSE`,
`PYPI_SETUP.md`, `docs/*.md`, `examples/*`, `.github/workflows/ci.yml`) and the
documents each side keeps for itself (`README.md`, `QA_RUNBOOK.md`,
`FIXES_SUMMARY.md`, `TOOL_INVENTORY.md`, `SYNC_POLICY.md`).

`.claude/settings.local.json` is editor state: it sits outside the copied paths,
so the script cannot remove it — delete it by hand in the derived repo if it ever
reappears.

## How to Regenerate the Derived Repo

```bash
# Clone the derived repo (one-time, if not already cloned)
git clone https://github.com/nicolasramos/odooclaw-mcp.git /tmp/odooclaw-mcp

# Preview (writes nothing) and apply, from the odooclaw repo root
./scripts/sync-odoo-mcp.sh --dry-run
ODOO_MCP_DERIVED_DIR=/tmp/odooclaw-mcp ./scripts/sync-odoo-mcp.sh
```

The script copies the compared set from the canonical copy to the derived repo
and deletes derived-only leftovers inside that same set. Afterwards, run the
derived repo's own checks (`ruff`, `black --check`, `mypy`, `pytest`) — if
anything fails, fix it in the canonical copy and re-derive; never edit the
derived repo.

## CI Protection

The workflow `.github/workflows/odoo-mcp-sync.yml` compares the PR's canonical
copy against the derived repo's `main` and fails on any content difference or
route that exists on only one side. It runs on every push/PR that touches the
canonical copy, and Mondays at 06:00 UTC.

## Consequence

Any change to `src/**`, `tests/**` or `requirements.txt` in the canonical copy
must be re-derived and pushed **in the same delivery**, or the gate turns the
derived repo's `main` red.

## Divergence History

- 2026-10-13 (`95df367a`, PR #3): last time the derived repo was regenerated.
- 2026-10-16, right before this sync: 55 shared compared files (54 differing,
  1 identical) and 15 canonical-only files — `core/field_schema.py`,
  `services/delivery_service.py` and 13 tests the derived repo never received.
- 2026-10-16, after this sync: 71 compared files on both sides, 71 identical,
  0 only in one side. Derived tree: 105 routes.
