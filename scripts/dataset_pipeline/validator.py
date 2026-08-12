#!/usr/bin/env python3
"""
Dataset Validator for odooclaw dataset pipeline.

Validates generated JSONL datasets against quality criteria:
  - Format: valid LFM native format with tool_call markers
  - Coverage: all tools from metadata are represented
  - Balance: category distribution is reasonable
  - Integrity: no broken tool references, valid argument structure

Usage:
    python validator.py <dataset.jsonl> <metadata.json> [--fail-on-warnings]
"""

import json
import os
import re
import sys
from collections import Counter


# LFM native format pattern — tool names may contain hyphens (e.g. edge-tts-synthesize)
TOOL_CALL_PATTERN = re.compile(
    r"<\|tool_call_start\|>mcp_(?:odoo-mcp|(\w+(?:-\w+)?))_([\w-]+)\((.*)\)<\|tool_call_end\|>"
)


def validate_dataset(dataset_path: str, metadata_path: str, fail_on_warnings: bool = False) -> dict:
    """Run all validation checks on the dataset."""
    with open(metadata_path, "r") as f:
        metadata = json.load(f)

    with open(dataset_path, "r") as f:
        lines = [json.loads(line) for line in f if line.strip()]

    issues = []
    warnings = []
    stats = {
        "total_examples": len(lines),
        "categories": Counter(),
        "tools_covered": set(),
        "tools_missing": set(),
        "format_errors": 0,
        "empty_examples": 0,
    }

    # --- Check 1: Format validation ---
    for i, ex in enumerate(lines):
        if not isinstance(ex, dict):
            issues.append(f"Line {i+1}: not a JSON object")
            stats["format_errors"] += 1
            continue

        # Required fields
        for field in ["user", "assistant", "category", "tool_name"]:
            if field not in ex:
                issues.append(f"Line {i+1}: missing field '{field}'")

        # Validate tool_call format in assistant — must have valid mcp_ call
        if "assistant" in ex and isinstance(ex["assistant"], str):
            matches = TOOL_CALL_PATTERN.findall(ex["assistant"])
            if not matches:
                # Check if it contains a tool_call marker but with broken format
                if "<|tool_call_start|>" in ex["assistant"] and "<|tool_call_end|>" in ex["assistant"]:
                    issues.append(f"Line {i+1}: broken tool_call format (missing valid mcp_ call)")
                    stats["format_errors"] += 1

        # Check category is valid
        valid_cats = {"tool_selection", "argument_filling", "error_handling", "multi_turn"}
        if "category" in ex and ex["category"] not in valid_cats:
            warnings.append(f"Line {i+1}: unknown category '{ex['category']}'")

        # Track stats
        if "category" in ex:
            stats["categories"][ex["category"]] += 1
        if "tool_name" in ex:
            stats["tools_covered"].add(ex["tool_name"])

        if not ex.get("user") and not ex.get("assistant"):
            stats["empty_examples"] += 1

    # --- Check 2: Coverage ---
    metadata_tool_names = {t["name"] for t in metadata}
    stats["tools_missing"] = metadata_tool_names - stats["tools_covered"]

    if stats["tools_missing"]:
        warnings.append(
            f"{len(stats['tools_missing'])} tools not covered: "
            + ", ".join(sorted(stats["tools_missing"])[:10])
        )

    # --- Check 3: Balance ---
    cat_counts = dict(stats["categories"])
    total = stats["total_examples"]
    if total > 0:
        for cat, count in cat_counts.items():
            pct = count / total * 100
            if pct > 80:
                warnings.append(f"Category '{cat}' dominates at {pct:.1f}%")

    # --- Check 4: Integrity ---
    # Verify all referenced tool_names exist in metadata
    valid_tool_names = {t["name"] for t in metadata}
    for i, ex in enumerate(lines):
        if "tool_name" in ex and ex["tool_name"] not in valid_tool_names:
            warnings.append(f"Line {i+1}: references unknown tool '{ex['tool_name']}'")

    # --- Summary ---
    result = {
        "valid": len(issues) == 0,
        "issues": issues,
        "warnings": warnings,
        "stats": {
            "total_examples": stats["total_examples"],
            "categories": cat_counts,
            "tools_covered": len(stats["tools_covered"]),
            "tools_total": len(metadata),
            "tool_coverage_pct": round(
                len(stats["tools_covered"]) / len(metadata) * 100, 1
            ) if metadata else 0,
            "format_errors": stats["format_errors"],
            "empty_examples": stats["empty_examples"],
        },
    }

    # Write validation report to disk (for orchestrator and CI consumption)
    report_path = os.environ.get("VALIDATION_REPORT_PATH", "validation_report.json")
    try:
        report_dir = os.path.dirname(report_path)
        if report_dir:
            os.makedirs(report_dir, exist_ok=True)
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"Validation report written to {report_path}", file=sys.stderr)
    except OSError as e:
        print(f"WARNING: could not write validation report: {e}", file=sys.stderr)

    return result


def main():
    if len(sys.argv) < 3:
        print("Usage: validator.py <dataset.jsonl> <metadata.json> [--fail-on-warnings]", file=sys.stderr)
        sys.exit(1)

    dataset_path = sys.argv[1]
    metadata_path = sys.argv[2]
    fail_on_warnings = "--fail-on-warnings" in sys.argv

    result = validate_dataset(dataset_path, metadata_path, fail_on_warnings)

    print(f"\n{'='*60}", file=sys.stderr)
    print(f"VALIDATION {'PASSED' if result['valid'] else 'FAILED'}", file=sys.stderr)
    print(f"{'='*60}", file=sys.stderr)

    stats = result["stats"]
    print(f"\nExamples: {stats['total_examples']}", file=sys.stderr)
    print(f"Categories:", file=sys.stderr)
    for cat, count in sorted(stats["categories"].items()):
        print(f"  {cat}: {count}", file=sys.stderr)
    print(f"\nTool coverage: {stats['tools_covered']}/{stats['tools_total']} ({stats['tool_coverage_pct']}%)", file=sys.stderr)

    if result["issues"]:
        print(f"\n{len(result['issues'])} ISSUES:", file=sys.stderr)
        for issue in result["issues"][:20]:
            print(f"  ✗ {issue}", file=sys.stderr)

    if result["warnings"]:
        print(f"\n{len(result['warnings'])} WARNINGS:", file=sys.stderr)
        for warn in result["warnings"][:10]:
            print(f"  ⚠ {warn}", file=sys.stderr)

    if result["valid"]:
        print("\n✓ Dataset is valid.", file=sys.stderr)
    else:
        print(f"\n✗ Dataset has {len(result['issues'])} issues.", file=sys.stderr)

    sys.exit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()
