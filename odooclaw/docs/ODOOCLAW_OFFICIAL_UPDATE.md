# OdooClaw Official Update Script

This guide documents the official updater for repository-managed OdooClaw deployments.

## Script

- Path: `scripts/update-odooclaw.sh`
- Goal: update OdooClaw safely from upstream while preserving user-editable files.

## Protection Rules (Mandatory)

The updater **never updates** these paths:

- `workspace/**`
- `odooclaw/workspace/**`
- `config/**`
- `odooclaw/config/**`
- `.env`
- `.env.*`
- `odooclaw/.env`
- `odooclaw/.env.*`

This protects user customizations, local runtime settings, and secrets.

## How It Works

1. Fetches remote refs (`git fetch --prune`).
2. Computes upstream diff (`HEAD..target-ref`).
3. Splits files into:
   - allowed updates,
   - protected files (skipped).
4. Aborts if allowed files have local modifications.
5. Applies only allowed files with `git checkout <ref> -- <files...>`.

In `--dry-run` mode, local-modification enforcement is skipped so you can inspect the full plan.

## Usage

```bash
# Default: current branch upstream
./scripts/update-odooclaw.sh

# Dry run
./scripts/update-odooclaw.sh --dry-run

# Allow overwrite when allowed files are locally modified
./scripts/update-odooclaw.sh --allow-local-modified

# Explicit ref
./scripts/update-odooclaw.sh --ref origin/main

# Custom repository path
./scripts/update-odooclaw.sh --repo-root /opt/odooclaw
```

## Options

- `--repo-root PATH`: repository root (default: parent of script).
- `--ref REF`: git ref to update from (default: `@{u}`).
- `--dry-run`: preview plan only.
- `--allow-local-modified`: bypass local-modification guard (use only when overwrite is intentional).
- `-h`, `--help`: help output.

## Operational Notes

- Run from a clean working tree for best results.
- If the script reports local modifications in allowed files, commit/stash/discard first.
- If you need forced overwrite in allowed files, use `--allow-local-modified` intentionally.
- After update, review with `git status --short` and run your normal runtime checks.
