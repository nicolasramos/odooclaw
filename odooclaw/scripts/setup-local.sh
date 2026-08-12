#!/usr/bin/env bash
#
# OdooClaw local setup — one-shot installer
# -----------------------------------------
# Installs llama.cpp (CPU inference), downloads the OdooClaw models from
# HuggingFace and generates the gateway config with local endpoints.
#
# Usage:
#   ./scripts/setup-local.sh              # install everything
#   ./scripts/setup-local.sh --force      # re-download models
#   ./scripts/setup-local.sh --skip-llama # only models + config
#   ./scripts/setup-local.sh --dry-run    # show what would be done
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
ODOOCLAW_HOME="${ODOOCLAW_HOME:-$HOME/.odooclaw}"
MODELS_DIR="$ODOOCLAW_HOME/models"
LLAMA_DIR="$ODOOCLAW_HOME/llama.cpp"
CONFIG_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/config/config.example.json"
CONFIG_DST="$ODOOCLAW_HOME/config.json"

# Models published on HuggingFace (canonical, GGUF format)
LLAMA_MODEL_REPO="nicolasramos/odooclaw-light-1.2b-ft"
LLAMA_MODEL_FILE="odooclaw-light-1.2b-ft-Q4_K_M.gguf"
VISION_MODEL_REPO="nicolasramos/odooclaw-vision"
VISION_MODEL_FILE="odooclaw-vision-Q5_K_M.gguf"
VISION_MMPROJ_FILE="mmproj-odooclaw-vision-Q8_0.gguf"

LLAMA_PORT="${LLAMA_PORT:-8082}"    # chat + tool calling
VISION_PORT="${VISION_PORT:-8093}"  # vision / OCR

FORCE=false
SKIP_LLAMA=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    --skip-llama) SKIP_LLAMA=true ;;
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

log()  { printf '\033[1;32m[odooclaw]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[odooclaw]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[odooclaw]\033[0m %s\n' "$*" >&2; exit 1; }

if $DRY_RUN; then
  log "Dry run — would:"
  $SKIP_LLAMA || echo "  1. Install llama.cpp -> $LLAMA_DIR"
  echo "  2. Download $LLAMA_MODEL_REPO/$LLAMA_MODEL_FILE -> $MODELS_DIR"
  echo "  3. Download $VISION_MODEL_REPO/$VISION_MODEL_FILE -> $MODELS_DIR"
  echo "  4. Download $VISION_MODEL_REPO/$VISION_MMPROJ_FILE -> $MODELS_DIR"
  echo "  5. Write gateway config -> $CONFIG_DST (ports $LLAMA_PORT / $VISION_PORT)"
  exit 0
fi

command -v curl >/dev/null || die "curl is required (brew install curl / apt install curl)"
command -v cmake >/dev/null || die "cmake is required (brew install cmake / apt install cmake)"

mkdir -p "$MODELS_DIR" "$ODOOCLAW_HOME"

# ---------------------------------------------------------------------------
# 1. llama.cpp
# ---------------------------------------------------------------------------
if $SKIP_LLAMA; then
  log "Skipping llama.cpp (--skip-llama)"
elif [ -x "$LLAMA_DIR/build/bin/llama-server" ]; then
  log "llama.cpp already installed ($LLAMA_DIR) — skipping"
else
  log "Cloning and building llama.cpp (this takes a few minutes)..."
  if [ ! -d "$LLAMA_DIR/.git" ]; then
    git clone --depth 1 https://github.com/ggml-org/llama.cpp.git "$LLAMA_DIR"
  fi
  cmake -S "$LLAMA_DIR" -B "$LLAMA_DIR/build" -DLLAMA_CURL=ON >/dev/null
  cmake --build "$LLAMA_DIR/build" --config Release -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)" >/dev/null
  log "llama.cpp built: $LLAMA_DIR/build/bin/llama-server"
fi

# ---------------------------------------------------------------------------
# 2. Models from HuggingFace (skip when present, unless --force)
# ---------------------------------------------------------------------------
download() { # repo file dest
  local repo="$1" file="$2" dest="$3"
  if [ -f "$dest" ] && ! $FORCE; then
    log "Already present: $(basename "$dest") — skipping (--force to re-download)"
    return
  fi
  log "Downloading $repo/$file ..."
  curl -fL --progress-bar "https://huggingface.co/$repo/resolve/main/$file" -o "$dest"
  [ -s "$dest" ] || die "Download failed for $file"
}

download "$LLAMA_MODEL_REPO"  "$LLAMA_MODEL_FILE"   "$MODELS_DIR/$LLAMA_MODEL_FILE"
download "$VISION_MODEL_REPO" "$VISION_MODEL_FILE"  "$MODELS_DIR/$VISION_MODEL_FILE"
download "$VISION_MODEL_REPO" "$VISION_MMPROJ_FILE" "$MODELS_DIR/$VISION_MMPROJ_FILE"

# ---------------------------------------------------------------------------
# 3. Gateway config (local endpoints, OpenAI-compatible)
# ---------------------------------------------------------------------------
log "Writing gateway config -> $CONFIG_DST"
cat > "$CONFIG_DST" <<EOF
{
  "agents": {
    "defaults": {
      "workspace": "$ODOOCLAW_HOME/workspace",
      "restrict_to_workspace": true,
      "model_name": "odooclaw-local",
      "max_tokens": 8192,
      "temperature": 0.7,
      "max_tool_iterations": 20,
      "context_window_tokens": 4096,
      "tool_result_max_chars": 4000
    }
  },
  "model_list": [
    {
      "model_name": "odooclaw-local",
      "model": "local/odooclaw-light-1.2b",
      "api_key": "local",
      "api_base": "http://127.0.0.1:$LLAMA_PORT/v1"
    }
  ],
  "ocr": {
    "vision_base_url": "http://127.0.0.1:$VISION_PORT/v1",
    "vision_model": "odooclaw-vision",
    "vision_api_key": "local"
  },
  "engram": { "enabled": false, "mcp_server": "engram" }
}
EOF

# ---------------------------------------------------------------------------
# 4. Run instructions
# ---------------------------------------------------------------------------
cat <<EOF

✅ OdooClaw local setup complete.

Models:
  $MODELS_DIR/$LLAMA_MODEL_FILE
  $MODELS_DIR/$VISION_MODEL_FILE
  $MODELS_DIR/$VISION_MMPROJ_FILE

Start the servers:

  # Chat + tool calling (port $LLAMA_PORT)
  $LLAMA_DIR/build/bin/llama-server -m $MODELS_DIR/$LLAMA_MODEL_FILE \\
    --host 127.0.0.1 --port $LLAMA_PORT --ctx-size 4096

  # Vision / OCR (port $VISION_PORT)
  $LLAMA_DIR/build/bin/llama-server -m $MODELS_DIR/$VISION_MODEL_FILE \\
    --mmproj $MODELS_DIR/$VISION_MMPROJ_FILE \\
    --host 127.0.0.1 --port $VISION_PORT

Gateway config: $CONFIG_DST
EOF
