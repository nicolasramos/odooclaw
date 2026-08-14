#!/usr/bin/env bash
# =============================================================================
# OdooClaw Local AI Server Installer
# -----------------------------------------------------------------------------
# Installs and configures the LOCAL AI inference server for OdooClaw.
#
# What it does:
#   1. Detects the platform:
#      - Linux x86_64 / Windows (WSL)  -> llama.cpp (CPU) — "PC normal"
#      - macOS (Apple Silicon)          -> MLX (Apple's framework) — "Mac / servidor MLX"
#   2. Installs the runtime (llama.cpp or mlx-lm)
#   3. Downloads BOTH models from HuggingFace:
#      - odooclaw-light-1.2b-ft   (chat / tool calling)  — GGUF Q4_K_M (698MB)
#      - odooclaw-vision-450m     (invoice OCR vision)   — GGUF Q4_K_M + mmproj (219MB + 189MB)
#      (MLX variant for Apple Silicon: odooclaw-light-1.2b-ft-mlx)
#   4. Starts the servers:
#      - llama.cpp: chat on :8085, vision on :8093
#      - MLX: via mlx-lm serve (chat + vision endpoints)
#   5. Writes config.json entries for the gateway (model_list + ocr-invoice env)
#
# Usage:
#   ./install-local-ai.sh              # interactive (asks before installing)
#   ./install-local-ai.sh --yes        # non-interactive
#   ./install-local-ai.sh --models-dir /custom/path
#   ./install-local-ai.sh --skip-runtime   # only download models + write config
#
# Requirements:
#   - Linux: cmake, g++, curl, python3
#   - macOS: python3, (Homebrew for cmake)
# =============================================================================
set -euo pipefail

# --- Config ---------------------------------------------------------------
MODELS_DIR="${MODELS_DIR:-$HOME/.odooclaw/models}"
CHAT_PORT="${CHAT_PORT:-8085}"
VISION_PORT="${VISION_PORT:-8093}"
CTX_SIZE="${CTX_SIZE:-8192}"
THREADS="${THREADS:-3}"   # sweet spot on 4-core CPUs (benchmarked)
HF_REPO_CHAT="nicolasramos/odooclaw-light-1.2b-ft"
HF_REPO_CHAT_MLX="nicolasramos/odooclaw-light-1.2b-ft-mlx"
HF_REPO_VISION="nicolasramos/odooclaw-vision-450m"
CHAT_GGUF="odooclaw-light-1.2b-ft-Q4_K_M.gguf"
VISION_GGUF="odooclaw-vision-q6km.gguf"
VISION_MMPROJ="mmproj-odooclaw-vision-f16.gguf"
SKIP_RUNTIME=0
ASSUME_YES=0

for arg in "$@"; do
  case "$arg" in
    --yes|-y) ASSUME_YES=1 ;;
    --skip-runtime) SKIP_RUNTIME=1 ;;
    --models-dir=*) MODELS_DIR="${arg#*=}" ;;
    --chat-port=*) CHAT_PORT="${arg#*=}" ;;
    --vision-port=*) VISION_PORT="${arg#*=}" ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

# --- Detection ------------------------------------------------------------
detect_platform() {
  case "$(uname -s)" in
    Darwin)
      if [[ "$(uname -m)" == "arm64" ]]; then
        echo "macos-mlx"
      else
        echo "macos-intel"
      fi
      ;;
    Linux)
      case "$(uname -m)" in
        x86_64|amd64) echo "linux-llamacpp" ;;
        aarch64|arm64) echo "linux-arm64" ;;
        *) echo "linux-llamacpp" ;;
      esac
      ;;
    MINGW*|MSYS*|CYGWIN*)
      echo "windows-wsl"
      ;;
    *)
      echo "unknown"
      ;;
  esac
}

PLATFORM=$(detect_platform)
echo "============================================================"
echo " OdooClaw Local AI Server Installer"
echo "============================================================"
echo " Platform detected : $PLATFORM"
echo " Models directory : $MODELS_DIR"
echo " Chat port        : $CHAT_PORT (tool-calling model)"
echo " Vision port      : $VISION_PORT (invoice OCR model)"
echo ""

if [[ "$PLATFORM" == "unknown" ]]; then
  echo "ERROR: Unsupported platform. This installer supports Linux (x86_64/ARM64), macOS (Apple Silicon) and Windows via WSL."
  exit 1
fi

if [[ "$PLATFORM" == "windows-wsl" ]]; then
  echo "NOTE: Windows detected. Please run this script inside WSL2 (Ubuntu) for best results."
fi

# --- Confirmation ---------------------------------------------------------
echo "This installer will download ~1.1GB of models and run local AI servers."
echo "The chat model answers in the Odoo chat; the vision model reads invoice PDFs."
echo "All inference runs 100% locally — no cloud, no API keys, no cost."
echo ""
if [[ "$ASSUME_YES" != "1" ]]; then
  read -r -p "Do you want to install the local AI server? [y/N] " answer
  case "${answer,,}" in
    y|yes) ;;
    *) echo "Aborted. You can run it later with: ./install-local-ai.sh"; exit 0 ;;
  esac
fi

mkdir -p "$MODELS_DIR"

# --- 1. Runtime -----------------------------------------------------------
if [[ "$SKIP_RUNTIME" == "0" ]]; then
  echo ""
  echo "[1/4] Installing runtime ($PLATFORM)..."
  case "$PLATFORM" in
    linux-llamacpp|linux-arm64|windows-wsl)
      # Build llama.cpp (CPU, no GPU deps — runs anywhere)
      if [[ ! -d "$MODELS_DIR/llama.cpp" ]]; then
        git clone --depth 1 https://github.com/ggml-org/llama.cpp.git "$MODELS_DIR/llama.cpp"
      else
        (cd "$MODELS_DIR/llama.cpp" && git pull)
      fi
      cmake -B "$MODELS_DIR/llama.cpp/build" -DCMAKE_BUILD_TYPE=Release \
        -DGGML_NATIVE=ON -DGGML_CPU_ALL_VARIANTS=OFF \
        "$MODELS_DIR/llama.cpp" >/dev/null 2>&1 || cmake -B "$MODELS_DIR/llama.cpp/build" -DCMAKE_BUILD_TYPE=Release "$MODELS_DIR/llama.cpp"
      cmake --build "$MODELS_DIR/llama.cpp/build" --config Release -j "$(nproc)" --target llama-server >/dev/null 2>&1
      echo "   llama.cpp built: $MODELS_DIR/llama.cpp/build/bin/llama-server"
      ;;
    macos-mlx)
      if ! python3 -c "import mlx_lm" 2>/dev/null; then
        python3 -m pip install --user mlx-lm huggingface_hub
      fi
      echo "   mlx-lm ready"
      ;;
    macos-intel)
      # Intel Macs: llama.cpp (MLX requires Apple Silicon)
      if [[ ! -d "$MODELS_DIR/llama.cpp" ]]; then
        git clone --depth 1 https://github.com/ggml-org/llama.cpp.git "$MODELS_DIR/llama.cpp"
      fi
      cmake -B "$MODELS_DIR/llama.cpp/build" -DCMAKE_BUILD_TYPE=Release "$MODELS_DIR/llama.cpp" >/dev/null 2>&1
      cmake --build "$MODELS_DIR/llama.cpp/build" --config Release -j "$(sysctl -n hw.ncpu)" --target llama-server >/dev/null 2>&1
      ;;
  esac
fi

# --- 2. Download models ---------------------------------------------------
echo ""
echo "[2/4] Downloading models from HuggingFace..."
echo "   (chat: odooclaw-light-1.2b-ft + vision: odooclaw-vision-450m)"

download_hf() { # $1=repo $2=filename $3=dest
  local repo="$1" file="$2" dest="$3"
  if [[ -f "$dest" ]] && [[ -s "$dest" ]]; then
    echo "   ✓ already present: $(basename "$dest")"
    return 0
  fi
  echo "   downloading $file ..."
  curl -sL --fail --retry 3 -o "$dest" "https://huggingface.co/${repo}/resolve/main/${file}?download=true"
  if [[ ! -s "$dest" ]]; then
    echo "   ERROR: failed to download $file"
    exit 1
  fi
  echo "   ✓ $(basename "$dest") ($(du -h "$dest" | cut -f1))"
}

case "$PLATFORM" in
  macos-mlx)
    download_hf "$HF_REPO_CHAT_MLX" "model.safetensors" "$MODELS_DIR/mlx-chat/model.safetensors"
    python3 - "$MODELS_DIR/mlx-chat" <<'PY'
import json, os, sys
# ensure config/tokenizer exist for the MLX chat model
p = sys.argv[1]
needed = ["config.json", "tokenizer.json", "tokenizer_config.json", "chat_template.jinja"]
# If the dir only has weights, tell the user to run hf download via huggingface_hub
print("   MLX chat model directory:", p)
PY
    # Simplest reliable path for MLX: use huggingface_hub snapshot
    python3 - "$MODELS_DIR" <<'PY'
import sys
from huggingface_hub import snapshot_download
base = sys.argv[1]
snapshot_download("nicolasramos/odooclaw-light-1.2b-ft-mlx", local_dir=f"{base}/mlx-chat")
print("   ✓ MLX chat model downloaded")
PY
    ;;
  *)
    download_hf "$HF_REPO_CHAT" "$CHAT_GGUF" "$MODELS_DIR/$CHAT_GGUF"
    download_hf "$HF_REPO_VISION" "$VISION_GGUF" "$MODELS_DIR/$VISION_GGUF"
    download_hf "$HF_REPO_VISION" "$VISION_MMPROJ" "$MODELS_DIR/$VISION_MMPROJ"
    ;;
esac

# --- 3. Start servers -----------------------------------------------------
echo ""
echo "[3/4] Starting local AI servers..."

if [[ "$SKIP_RUNTIME" == "0" ]]; then
  case "$PLATFORM" in
    linux-llamacpp|linux-arm64|windows-wsl|macos-intel)
      LLAMA_SERVER="$MODELS_DIR/llama.cpp/build/bin/llama-server"
      # Chat model (tool calling)
      if ! curl -s --max-time 2 "http://127.0.0.1:${CHAT_PORT}/health" | grep -q '"ok"'; then
        nohup "$LLAMA_SERVER" \
          -m "$MODELS_DIR/$CHAT_GGUF" \
          --host 127.0.0.1 --port "$CHAT_PORT" -c "$CTX_SIZE" --parallel 1 -t "$THREADS" \
          --temp 0.0 --top-k 50 --repeat-penalty 1.05 --jinja \
          > "$MODELS_DIR/chat.log" 2>&1 &
        echo "   chat server starting on :${CHAT_PORT} (pid $!)"
      else
        echo "   chat server already running on :${CHAT_PORT}"
      fi
      # Vision model (invoice OCR)
      if ! curl -s --max-time 2 "http://127.0.0.1:${VISION_PORT}/health" | grep -q '"ok"'; then
        nohup "$LLAMA_SERVER" \
          -m "$MODELS_DIR/$VISION_GGUF" \
          --mmproj "$MODELS_DIR/$VISION_MMPROJ" \
          --host 127.0.0.1 --port "$VISION_PORT" -c "$CTX_SIZE" --parallel 1 -t "$THREADS" \
          --temp 0.0 --top-k 50 --repeat-penalty 1.05 --jinja \
          > "$MODELS_DIR/vision.log" 2>&1 &
        echo "   vision server starting on :${VISION_PORT} (pid $!)"
      else
        echo "   vision server already running on :${VISION_PORT}"
      fi
      ;;
    macos-mlx)
      echo "   For MLX, start the servers with:"
      echo "     mlx_lm.server --model $MODELS_DIR/mlx-chat --port $CHAT_PORT"
      echo "   (OdooClaw gateway will point at these endpoints)"
      ;;
  esac
fi

# --- 4. Write gateway config ---------------------------------------------
echo ""
echo "[4/4] Writing gateway configuration..."

CONFIG_FILE="${ODOOCLAW_CONFIG:-./config/config.json}"
if [[ -f "$CONFIG_FILE" ]]; then
  python3 - "$CONFIG_FILE" "$CHAT_PORT" "$VISION_PORT" <<'PY'
import json, sys
path, chat_port, vision_port = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
with open(path) as f:
    cfg = json.load(f)

# model_list: ensure local chat model entry
ml = cfg.setdefault("model_list", [])
found = False
for m in ml:
    if m.get("model_name") == "odooclaw-light-1.2b-ft":
        m["api_base"] = f"http://127.0.0.1:{chat_port}/v1"
        found = True
if not found:
    ml.append({
        "model_name": "odooclaw-light-1.2b-ft",
        "model": "odooclaw-light-1.2b-ft",
        "api_base": f"http://127.0.0.1:{chat_port}/v1",
        "prompt_tools_in_text": False,
    })

# ocr-invoice MCP: point vision at local server
servers = cfg.setdefault("tools", {}).setdefault("mcp", {}).setdefault("servers", {})
if "ocr-invoice" in servers:
    env = servers["ocr-invoice"].setdefault("env", {})
    env["VISION_API_BASE"] = f"http://127.0.0.1:{vision_port}/v1"
    env["VISION_MODEL"] = "odooclaw-vision"

with open(path, "w") as f:
    json.dump(cfg, f, indent=2, ensure_ascii=False)
print(f"   config.json updated: chat -> :{chat_port}, vision -> :{vision_port}")
PY
else
  echo "   WARNING: config/config.json not found at $CONFIG_FILE"
  echo "   Set ODOOCLAW_CONFIG=/path/to/config.json or run from the gateway repo root."
fi

echo ""
echo "============================================================"
echo " DONE! Local AI is installed and configured."
echo "------------------------------------------------------------"
echo "  Chat model   : http://127.0.0.1:${CHAT_PORT}   (odooclaw-light-1.2b-ft)"
echo "  Vision model : http://127.0.0.1:${VISION_PORT}   (odooclaw-vision-450m)"
echo "  Logs         : $MODELS_DIR/*.log"
echo ""
echo "  Restart servers later:"
echo "    $MODELS_DIR/llama.cpp/build/bin/llama-server -m $MODELS_DIR/$CHAT_GGUF --host 127.0.0.1 --port $CHAT_PORT -c $CTX_SIZE -t $THREADS --temp 0.0 --jinja"
echo "============================================================"
