#!/usr/bin/env bash
# workspace-divergence-test.sh — TDD for the CI divergence job
# Usage: bash workspace-divergence-test.sh [--red|--green]
# --red  : simulates the broken state (embedded tracked, with odoo-manager)
# --green: simulates the fixed state (embedded not tracked, clean regeneration)
set -euo pipefail

ODOOCLAW="odooclaw"
EMBEDDED="$ODOOCLAW/cmd/odooclaw/internal/onboard/workspace"
SOURCE="$ODOOCLAW/workspace"

mode="${1:---red}"

echo "=== Mode: $mode ==="

case "$mode" in
  --red)
    echo "--- RED STATE (before fix) ---"
    # On main, the embedded copy IS tracked in git
    tracked=$(git ls-files -- "$EMBEDDED/**" 2>/dev/null | wc -l)
    echo "Tracked embedded files: $tracked (should be 0 after fix)"

    # odoo-manager exists only in embedded
    if [ -d "$EMBEDDED/skills/odoo-manager" ]; then
      echo "FAIL: odoo-manager directory found in embedded copy but NOT in source"
      exit 1
    else
      echo "OK: no odoo-manager in embedded"
    fi

    # diff between source and tracked embedded will show missing files
    if [ -d "$EMBEDDED" ]; then
      diff_output=$(diff -rq "$SOURCE" "$EMBEDDED" 2>&1 || true)
      if [ -n "$diff_output" ]; then
        echo "FAIL: diff -rq shows divergence:"
        echo "$diff_output" | head -20
      fi
    else
      echo "FAIL: embedded directory does not exist (no regeneration)"
    fi
    ;;

  --green)
    echo "--- GREEN STATE (after fix) ---"
    # After fix, embedded is NOT tracked
    tracked=$(git ls-files -- "$EMBEDDED/**" 2>/dev/null | wc -l)
    echo "Tracked embedded files: $tracked (expected 0)"
    if [ "$tracked" -ne 0 ]; then
      echo "FAIL: embedded copy still tracked in git"
      exit 1
    fi

    # Regenerate and diff against source
    echo "Running make generate..."
    make -C "$ODOOCLAW" generate >/dev/null 2>&1

    # Check odoo-manager is NOT in regenerated embedded
    if [ -d "$EMBEDDED/skills/odoo-manager" ]; then
      echo "FAIL: odoo-manager found in regenerated embedded copy"
      exit 1
    fi
    echo "OK: no odoo-manager in regenerated embedded copy"

    # Diff source vs regenerated embedded should be empty
    diff_output=$(diff -rq "$SOURCE" "$EMBEDDED" 2>&1 || true)
    if [ -n "$diff_output" ]; then
      echo "FAIL: diff -rq shows divergence after regeneration:"
      echo "$diff_output"
      exit 1
    fi
    echo "OK: diff -rq source vs regenerated embedded is empty"

    # Count files in odoo-mcp
    mcp_files=$(find "$SOURCE/skills/odoo-mcp" -type f 2>/dev/null | wc -l)
    mcp_tests=$(find "$SOURCE/skills/odoo-mcp/tests" -name 'test_*.py' 2>/dev/null | wc -l)
    echo "odoo-mcp files: $mcp_files (expected ~70)"
    echo "odoo-mcp tests: $mcp_tests (expected 16)"

    # Verify git ls-files for source
    source_count=$(git ls-files -- "$SOURCE/**" | wc -l)
    echo "Source tracked files: $source_count (expected 100)"
    if [ "$source_count" -ne 100 ]; then
      echo "FAIL: source should have 100 tracked files"
      exit 1
    fi

    echo "=== ALL CHECKS PASSED (GREEN) ==="
    ;;
esac
