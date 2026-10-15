#!/usr/bin/env bash
# sync-odoo-mcp.sh — Regenerates the derived odoo-mcp repo from the canonical copy.
#
# Usage: scripts/sync-odoo-mcp.sh [--dry-run]
#
# Direction (declared in odooclaw/workspace/skills/odoo-mcp/SYNC_POLICY.md):
#   CANONICAL — odooclaw/workspace/skills/odoo-mcp/ in this repo. Edited here and
#               only here.
#   DERIVED   — https://github.com/nicolasramos/odooclaw-mcp (standalone package).
#               Never edited by hand: regenerate it with this script.
#
# The compared set is {src/**, tests/**, requirements.txt} minus EXCEPTIONS, and
# it is the SAME set on both sides: the copy loop, the orphan deletion and the CI
# gate (.github/workflows/odoo-mcp-sync.yml) all filter the same 11 exceptions.
# Those 11 files are the entry-point layer of the derived package — pyproject.toml
# points its four console aliases (odooclaw-mcp, odoo-mcp, odoo-mcp-server,
# odoo-18-mcp-server) at odoo_mcp.cli:main — so they live only in the derived repo
# and are neither copied, compared nor deleted.
#
# Packaging files (pyproject.toml, setup.py, server.json, Dockerfile, docs, ...)
# sit outside {src, tests, requirements.txt} and are therefore out of scope for
# both the copy and the comparison, as does the documentation each side keeps for
# itself (README.md, QA_RUNBOOK.md, FIXES_SUMMARY.md, TOOL_INVENTORY.md).
# .claude/settings.local.json is outside the copied paths too: remove it by hand
# if it ever reappears in the derived repo.

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CANONICAL_DIR="$REPO_ROOT/odooclaw/workspace/skills/odoo-mcp"
DERIVED_DIR="${ODOO_MCP_DERIVED_DIR:-/tmp/odooclaw-mcp}"

# Entry points of the derived package (see header): excluded from the compared
# set on both sides.
EXCEPTIONS=(
    src/odoo_mcp/__init__.py
    src/odoo_mcp/__main__.py
    src/odoo_mcp/cli.py
    src/odoo_mcp/healthcheck.py
    src/odoo_mcp/core/__init__.py
    src/odoo_mcp/observability/__init__.py
    src/odoo_mcp/schemas/__init__.py
    src/odoo_mcp/security/__init__.py
    src/odoo_mcp/services/__init__.py
    src/odoo_mcp/tools/__init__.py
    tests/__init__.py
)

if [ ! -d "$CANONICAL_DIR" ]; then
    echo "ERROR: Canonical copy not found at $CANONICAL_DIR" >&2
    exit 1
fi

if [ ! -d "$DERIVED_DIR/.git" ]; then
    echo "ERROR: Derived repo not found at $DERIVED_DIR" >&2
    echo "Clone it with: git clone https://github.com/nicolasramos/odooclaw-mcp.git $DERIVED_DIR" >&2
    exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

printf '%s\n' "${EXCEPTIONS[@]}" | sort > "$TMP_DIR/exceptions"

# Compared set of a tree: {src, tests, requirements.txt} minus the exceptions.
list_set() {
    (cd "$1" && find src tests requirements.txt -type f 2>/dev/null | sort) \
        | awk 'NR==FNR{e[$0]=1;next} !($0 in e)' "$TMP_DIR/exceptions" -
}

echo "=== Sync odoo-mcp (canonical -> derived) ==="
echo "Canonical: $CANONICAL_DIR"
echo "Derived:   $DERIVED_DIR"
echo ""

list_set "$CANONICAL_DIR" > "$TMP_DIR/canonical-files"

# --- Copy the compared set from canonical to derived ---
while read -r relpath; do
    [ -n "$relpath" ] || continue
    src_file="$CANONICAL_DIR/$relpath"
    dst_file="$DERIVED_DIR/$relpath"

    if [ ! -f "$src_file" ]; then
        echo "SKIP (not in canonical): $relpath"
        continue
    fi

    if [ -f "$dst_file" ] && diff -q "$src_file" "$dst_file" > /dev/null 2>&1; then
        echo "OK       $relpath"
        continue
    fi

    if $DRY_RUN; then
        echo "COPY     $relpath"
    else
        mkdir -p "$(dirname "$dst_file")"
        cp "$src_file" "$dst_file"
        echo "COPY     $relpath"
    fi
done < "$TMP_DIR/canonical-files"

# --- Remove derived-only files inside the compared set ---
# The exceptions were filtered out above, so the entry points of the package are
# never candidates for deletion.
list_set "$DERIVED_DIR" > "$TMP_DIR/derived-files"

comm -13 "$TMP_DIR/canonical-files" "$TMP_DIR/derived-files" | while read -r relpath; do
    [ -n "$relpath" ] || continue
    if $DRY_RUN; then
        echo "DELETE $relpath"
    else
        rm -f "$DERIVED_DIR/$relpath"
        echo "DELETE $relpath"
    fi
done

echo ""
if $DRY_RUN; then
    echo "Dry-run mode: no changes written."
else
    echo "Sync complete. Review with: git -C $DERIVED_DIR diff"
fi
