#!/usr/bin/env python3
"""
Dataset Pipeline Orchestrator.

Runs the full pipeline: parse → generate → validate → produce artifacts.

Usage:
    python orchestrator.py <repo_root> [--seed 42] [--dry-run]

Pipeline stages:
    1. Parse MCP tools → metadata.json
    2. Generate examples → dataset.jsonl
    3. Validate dataset → validation_report.json
    4. Produce manifest → manifest.json
"""

import json
import os
import sys
import subprocess
from datetime import datetime, timezone


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PIPELINE_DIR = os.path.dirname(SCRIPT_DIR)  # scripts/dataset_pipeline/parent = scripts/
REPO_ROOT = None  # set by main


def run_stage(name, cmd_args, env=None):
    """Run a pipeline stage and return (success, output)."""
    print(f"\n{'─'*50}")
    print(f"STAGE: {name}")
    print(f"{'─'*50}", file=sys.stderr)

    result = subprocess.run(
        cmd_args,
        capture_output=True,
        text=True,
        env={**os.environ, **(env or {})},
    )

    if result.stdout:
        print(result.stdout, file=sys.stderr)
    if result.stderr:
        # Only print non-stderr (parser/generator use stderr for progress)
        pass

    return result.returncode == 0, result.stderr


def main():
    global REPO_ROOT

    args = sys.argv[1:]
    if not args:
        print("Usage: orchestrator.py <repo_root> [--seed 42] [--dry-run]", file=sys.stderr)
        sys.exit(1)

    repo_root = os.path.abspath(args[0])
    seed = 42
    dry_run = False

    for arg in args[1:]:
        if arg.startswith("--seed"):
            seed = int(arg.split("=", 1)[1]) if "=" in arg else 42
        elif arg == "--dry-run":
            dry_run = True

    output_dir = os.path.join(repo_root, "scripts", "dataset_pipeline", "output")
    os.makedirs(output_dir, exist_ok=True)

    metadata_path = os.path.join(output_dir, "metadata.json")
    dataset_path = os.path.join(output_dir, "dataset.jsonl")
    validation_path = os.path.join(output_dir, "validation_report.json")
    manifest_path = os.path.join(output_dir, "manifest.json")

    print(f"Pipeline output: {output_dir}", file=sys.stderr)
    print(f"Seed: {seed}", file=sys.stderr)

    # --- Stage 1: Parse ---
    print("\n" + "█"*50)
    print("STAGE 1: PARSE MCP TOOLS")
    print("█"*50, file=sys.stderr)

    parser_script = os.path.join(SCRIPT_DIR, "parser.py")
    success, _ = run_stage("Parse", [sys.executable, parser_script, repo_root, f"--output={metadata_path}"])

    if not success:
        print("ERROR: Parser failed. Check that odoo-mcp server.py exists.", file=sys.stderr)
        sys.exit(1)

    with open(metadata_path) as f:
        metadata = json.load(f)
    print(f"  → {len(metadata)} tools parsed", file=sys.stderr)

    # --- Stage 2: Generate ---
    print("\n" + "█"*50)
    print("STAGE 2: GENERATE DATASET")
    print("█"*50, file=sys.stderr)

    gen_script = os.path.join(SCRIPT_DIR, "generator.py")
    success, _ = run_stage("Generate", [
        sys.executable, gen_script, metadata_path,
        f"--output={dataset_path}",
        f"--seed={seed}",
    ])

    if not success:
        print("ERROR: Generator failed.", file=sys.stderr)
        sys.exit(1)

    # Count examples
    with open(dataset_path) as f:
        example_count = sum(1 for line in f if line.strip())
    print(f"  → {example_count} examples generated", file=sys.stderr)

    # --- Stage 3: Validate ---
    print("\n" + "█"*50)
    print("STAGE 3: VALIDATE DATASET")
    print("█"*50, file=sys.stderr)

    validator_script = os.path.join(SCRIPT_DIR, "validator.py")
    success, _ = run_stage("Validate", [
        sys.executable, validator_script, dataset_path, metadata_path,
    ])

    if not success:
        print("WARNING: Validation found issues. Check validation_report.json.", file=sys.stderr)

    # --- Stage 4: Manifest ---
    print("\n" + "█"*50)
    print("STAGE 4: PRODUCE MANIFEST")
    print("█"*50, file=sys.stderr)

    manifest = {
        "version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "seed": seed,
        "repo_root": repo_root,
        "tools_count": len(metadata),
        "examples_count": example_count,
        "files": {
            "metadata": metadata_path,
            "dataset": dataset_path,
            "validation": validation_path,
        },
    }

    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n{'='*50}", file=sys.stderr)
    print("PIPELINE COMPLETE", file=sys.stderr)
    print(f"{'='*50}", file=sys.stderr)
    print(f"  Metadata: {metadata_path}", file=sys.stderr)
    print(f"  Dataset:  {dataset_path}", file=sys.stderr)
    print(f"  Manifest: {manifest_path}", file=sys.stderr)

    if dry_run:
        print("\n(Dry run — no files written to disk)", file=sys.stderr)


if __name__ == "__main__":
    main()
