# Models

OdooClaw is **model-agnostic**: every layer (chat, vision) talks to an
OpenAI-compatible endpoint. You can use the canonical published models or
plug in any model you want by changing the config.

## Canonical models (HuggingFace)

| Model | Purpose | GGUF (Linux) | MLX (Apple) |
|---|---|---|---|
| `odooclaw-light-1.2b-ft` | Chat + tool calling (LFM2.5-1.2B fine-tuned) | [repo](https://huggingface.co/nicolasramos/odooclaw-light-1.2b-ft) `Q4_K_M` | [repo -mlx](https://huggingface.co/nicolasramos/odooclaw-light-1.2b-ft-mlx) |
| `odooclaw-vision` | Vision / invoice OCR (GLM-OCR) | [repo](https://huggingface.co/nicolasramos/odooclaw-vision) `Q5_K_M` + `mmproj` | [repo -mlx](https://huggingface.co/nicolasramos/odooclaw-vision-mlx) |

### Publishing convention

- **Never create versioned repos** — always overwrite the canonical file
  (each update is an improvement of the previous one).
- Publish **always in all formats**: GGUF, MLX (`-mlx` repo) and Ollama
  (Modelfile).
- Model cards in English with correct YAML frontmatter.
- Rollbacks live locally (`~/models/frozen/`), not on HuggingFace.

## How to change models

### Option A: change the gateway config

The gateway reads OpenAI-compatible endpoints from `config.json`:

```json
{
  "model_list": [
    {
      "model_name": "odooclaw-local",
      "model": "local/odooclaw-light-1.2b",
      "api_key": "local",
      "api_base": "http://127.0.0.1:8082/v1"
    }
  ],
  "ocr": {
    "vision_base_url": "http://127.0.0.1:8093/v1",
    "vision_model": "odooclaw-vision",
    "vision_api_key": "local"
  }
}
```

Point `api_base` / `vision_base_url` at any OpenAI-compatible server:
local (llama.cpp, oMLX), your LiteLLM proxy, or a cloud provider.

### Option B: serve a different model on the same port

Replace the model file argument when starting the server:

```bash
# Linux — swap the chat model (any GGUF)
llama-server -m /path/to/your-model-Q4_K_M.gguf --port 8082 ...

# macOS — swap the chat model (any MLX snapshot)
omlx serve --model /path/to/your-model-mlx --port 8082
```

The OCR pipeline (`pipeline.py`, 4-layer model-agnostic) accepts any vision
model via `vision_base_url` / `vision_model` / `vision_api_key` env vars.

## Fine-tuning your own

- **Tool-calling model** (light): fine-tune with [Soup](https://trysoup.dev)
  (MLX LoRA backend). Gate before deploy: `bench_conversacion_real.py ≥ 17/20`.
- **Vision model**: any VLM works via the OpenAI-compatible vision endpoint
  (GLM-OCR, PaddleOCR-VL, Qwen-VL, cloud models...). The pipeline is agnostic
  by design — see `docs/ocr-invoice/README.md`.

## Acceleration (NRA-541)

On Linux (llama.cpp), n-gram speculative decoding is benchmarked at **+49%**
on long generation with `n-max=16` (21.9 vs 14.7 tok/s, N100):

```bash
--spec-type ngram-mod --spec-ngram-mod-n-min 4 \
--spec-ngram-mod-n-max 16 --spec-ngram-mod-n-match 24
```

- MTP: not applicable (LFM architecture is `lfm2`, no qwen3-style draft).
- Engram: Cactus ecosystem only, not available in llama.cpp.
- Apple: MLX has its own optimizations; no llama.cpp on Apple Silicon.

## Troubleshooting

- **`Invalid model name`**: the model alias in `config.json` doesn't match
  what the server exposes. Check with `curl <api_base>/v1/models`.
- **Slow on Linux**: confirm the n-gram flags are present (see above).
- **Vision returns empty**: verify `--mmproj` is set for GLM-OCR GGUF, and
  the vision model id matches `ocr.vision_model`.
- **Apple**: make sure you use the `-mlx` repos, not GGUF.
