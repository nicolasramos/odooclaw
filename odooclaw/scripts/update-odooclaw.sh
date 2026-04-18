#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_REF=""
DRY_RUN=false
ALLOW_LOCAL_MODIFIED=false

PROTECTED_PATTERNS=(
  "workspace/*"
  "odooclaw/workspace/*"
  "config/*"
  "odooclaw/config/*"
  ".env"
  ".env.*"
  "odooclaw/.env"
  "odooclaw/.env.*"
)

print_help() {
  cat <<'EOF'
Usage: update-odooclaw.sh [options]

Safe updater for the official OdooClaw repository.
It updates tracked files from upstream while protecting user-editable paths.

Options:
  --repo-root PATH   Repository root path (default: parent of this script)
  --ref REF          Git ref to update from (default: upstream of current branch)
  --dry-run          Show planned actions without modifying files
  --allow-local-modified
                     Allow applying updates even if allowed files are locally modified
  -h, --help         Show this help message

Protected paths (never updated by this script):
  - workspace/**
  - config/**
  - .env and .env.*

Examples:
  ./scripts/update-odooclaw.sh
  ./scripts/update-odooclaw.sh --dry-run
  ./scripts/update-odooclaw.sh --ref origin/main
  ./scripts/update-odooclaw.sh --repo-root /opt/odooclaw
EOF
}

is_protected_path() {
  local path="$1"
  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    case "$path" in
      $pattern) return 0 ;;
    esac
  done
  return 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-root)
      REPO_ROOT="$2"
      shift 2
      ;;
    --ref)
      TARGET_REF="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --allow-local-modified)
      ALLOW_LOCAL_MODIFIED=true
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $1" >&2
      print_help
      exit 1
      ;;
  esac
done

if [[ ! -d "$REPO_ROOT/.git" ]]; then
  echo "ERROR: '$REPO_ROOT' is not a git repository root." >&2
  exit 1
fi

cd "$REPO_ROOT"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" == "HEAD" ]]; then
  echo "ERROR: Detached HEAD is not supported for updater." >&2
  exit 1
fi

if [[ -z "$TARGET_REF" ]]; then
  TARGET_REF="@{u}"
fi

echo "[1/5] Repository root: $REPO_ROOT"
echo "[1/5] Current branch: $CURRENT_BRANCH"
echo "[1/5] Target ref: $TARGET_REF"

echo "[2/5] Fetching latest refs..."
git fetch --prune

echo "[3/5] Building update plan..."
changed_files=()
while IFS= read -r line; do
  [[ -n "$line" ]] && changed_files+=("$line")
done < <(git diff --name-only HEAD "$TARGET_REF")

if [[ ${#changed_files[@]} -eq 0 ]]; then
  echo "No changes available from '$TARGET_REF'."
  exit 0
fi

allowed_files=()
protected_files=()

for file in "${changed_files[@]}"; do
  if is_protected_path "$file"; then
    protected_files+=("$file")
  else
    allowed_files+=("$file")
  fi
done

echo "  - Changed files upstream: ${#changed_files[@]}"
echo "  - Allowed update files:  ${#allowed_files[@]}"
echo "  - Protected skipped files: ${#protected_files[@]}"

if [[ ${#protected_files[@]} -gt 0 ]]; then
  echo "\nProtected files skipped:" 
  printf '  - %s\n' "${protected_files[@]}"
fi

if [[ ${#allowed_files[@]} -eq 0 ]]; then
  echo "No allowed files to update after protection rules."
  exit 0
fi

echo "[4/5] Checking local modifications in allowed files..."
if $DRY_RUN; then
  echo "Dry-run: skipping local-modification enforcement."
elif $ALLOW_LOCAL_MODIFIED; then
  echo "WARNING: --allow-local-modified enabled; local changes may be overwritten."
else
  if git status --porcelain -- "${allowed_files[@]}" | grep -q .; then
    echo "ERROR: Local modifications detected in files to update." >&2
    echo "Please commit/stash/discard them first, then run updater again." >&2
    echo "Or run with --allow-local-modified if overwrite is intentional." >&2
    git status --short -- "${allowed_files[@]}"
    exit 1
  fi
fi

if $DRY_RUN; then
  echo "[5/5] Dry-run mode, no files updated."
  echo "Planned updates:"
  printf '  - %s\n' "${allowed_files[@]}"
  exit 0
fi

echo "[5/5] Applying allowed updates from '$TARGET_REF'..."
git checkout "$TARGET_REF" -- "${allowed_files[@]}"

echo "Update completed successfully."
echo "Next recommended steps:"
echo "  1) Review changes: git status --short"
echo "  2) Validate deployment/runtime as needed"
