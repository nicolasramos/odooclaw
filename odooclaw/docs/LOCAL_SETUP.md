# Local Setup

OdooClaw runs fully local with two small models (chat/tool-calling + vision/OCR).
This guide covers the one-shot installer for both platforms.

## Quick start

```bash
git clone https://github.com/nicolasramos/odooclaw.git
cd odooclaw
./scripts/setup-local.sh
```

The script is idempotent: re-running it skips what is already installed.
It detects your platform automatically:

| Platform | Runtime | Models (HuggingFace) |
|---|---|---|
| Linux (x86/ARM) | llama.cpp (built from source) | GGUF: `nicolasramos/odooclaw-light-1.2b-ft` + `nicolasramos/odooclaw-vision` |
| macOS (Apple Silicon) | oMLX / MLX | MLX: `nicolasramos/odooclaw-light-1.2b-ft-mlx` + `nicolasramos/odooclaw-vision-mlx` |

## What the installer does

1. **Runtime**
   - Linux: clones and builds `llama.cpp` (cmake, CPU). Skips if already built.
   - macOS: checks for `omlx` (install with `brew install omlx` if missing, then re-run).
2. **Models** — downloads the canonical models from HuggingFace into
   `~/.odooclaw/models/` (skips existing files; `--force` re-downloads).
   - MLX models are snapshots (config + safetensors + tokenizer).
3. **Gateway config** — writes `~/.odooclaw/config.json` with local
   OpenAI-compatible endpoints:
   - Chat: `http://127.0.0.1:8082/v1` (odooclaw-local)
   - Vision: `http://127.0.0.1:8093/v1` (odooclaw-vision)

## Flags

```bash
./scripts/setup-local.sh --force       # re-download models
./scripts/setup-local.sh --skip-llama  # runtime only (models + config)
./scripts/setup-local.sh --dry-run     # show what would be done
```

## Starting the servers

### Linux (llama.cpp)

```bash
# Chat + tool calling (port 8082) — ngram-mod speculative enabled (+49% tok/s, NRA-541)
~/odooclaw/llama.cpp/build/bin/llama-server \
  -m ~/.odooclaw/models/odooclaw-light-1.2b-ft-Q4_K_M.gguf \
  --host 127.0.0.1 --port 8082 --ctx-size 4096 \
  --spec-type ngram-mod --spec-ngram-mod-n-min 4 \
  --spec-ngram-mod-n-max 16 --spec-ngram-mod-n-match 24

# Vision / OCR (port 8093)
~/odooclaw/llama.cpp/build/bin/llama-server \
  -m ~/.odooclaw/models/odooclaw-vision-Q5_K_M.gguf \
  --mmproj ~/.odooclaw/models/mmproj-odooclaw-vision-Q8_0.gguf \
  --host 127.0.0.1 --port 8093
```

### macOS (oMLX)

```bash
omlx serve --model ~/.odooclaw/models/odooclaw-light-1.2b-ft-mlx --port 8082
omlx serve --model ~/.odooclaw/models/odooclaw-vision-mlx   --port 8093
```

Both runtimes expose the same OpenAI-compatible API — the gateway config
does not change between platforms.

## Verifying

```bash
# Chat endpoint
curl http://127.0.0.1:8082/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"odooclaw-local","messages":[{"role":"user","content":"Hola"}]}'

# Vision endpoint (invoice OCR)
curl http://127.0.0.1:8093/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"odooclaw-vision","messages":[{"role":"user","content":"Extract the invoice fields"}],"image":"data:image/jpeg;base64,..."}'
```

## Notes

- **Apple Silicon always uses MLX** (oMLX). llama.cpp is a Linux-only runtime
  in this project.
- The n-gram speculative flags are benchmarked (NRA-541): +49% on long
  generation (21.9 vs 14.7 tok/s on N100). MTP/Engram do not apply to the
  LFM architecture.
- Model directories and ports can be overridden with env vars:
  `ODOOCLAW_HOME`, `LLAMA_PORT`, `VISION_PORT`.
