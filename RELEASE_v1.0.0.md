# OdooClaw v1.0.0 — Next Generation

## Summary

OdooClaw 1.0 is the first stable release of the **Next Generation**: a complete,
100% local AI system for Odoo with **its own trained models** — no subscriptions,
no cloud, no API keys. It is no longer just an agent that borrows any model:
it now ships with models fine-tuned specifically for Odoo business conversations,
plus a vision model for invoice/document extraction.

The unification of the `lms` and `main` lines (PR #64) brings the full Next
Generation stack into one stable branch, fully tested and CI-gated.

## Highlights

### 🧠 Own trained models (HuggingFace)
- **OdooClaw Light 1.2B** — fine-tuned on 26,968 real business examples:
  greetings, real conversation, record creation, destructive-operation refusal.
  - 95% accuracy in real conversation
  - 600/600 record creations with full schemas
  - Published as GGUF (llama.cpp) + MLX (Apple Silicon) + Ollama Modelfile
- **OdooClaw Vision** — invoice/document extraction straight from PDF, no cloud.
  - 794/800 fields correct in benchmark
  - Published as GGUF + mmproj and MLX

### 📄 4-layer invoice OCR pipeline
- Vision + deterministic fiscal layer + LLM header + arithmetic validation.
- Cross-checks against Odoo reality: supplier, duplicates, totals.
- Never invents data; failures go to declared review.

### ⚖️ Dynamic billing rules (`account_dynamic_rules`)
- Amplified with `tax_ids` + `fiscal_position_id` (PR #9 in odoo-addons).
- Tax and fiscal position decided by Odoo from the OCR invoice JSON —
  **zero hardcoded taxes**, purely configurable mechanism.
- Backported for Odoo 16/17/18.

### 🧠 Memory system
- HOT + COLD dual-layer memory, structured session memory (NRA-511),
  knowledge base + tool retrieval (NRA-515), always-on recipe store.

### 🔧 134 tools · 5 MCP servers
- Only the 3-5 relevant tools injected per query: **245 tokens instead of 14,000**.
- Deterministic counting (`odoo_count`, NRA-556) and hallucination rejection.

### 🔒 Security
- **ToolGuard**: schema validation + destructive-operation gating,
  deny-by-default, escape hatch via `ir.config_parameter`.
- Reply-token validation on every webhook (single-use, TTL).
- Agent inherits real Odoo user permissions.

### 🚀 Performance
- Runs on any hardware: VPS 1 vCPU (20 tok/s) → M1 Ultra (**643 tok/s**).
- Less than 1GB of models.
- n-gram speculative decoding: **+49% tok/s** (NRA-541).

### 📦 One-shot installer
- `setup-local.sh`: llama.cpp (Linux) / oMLX (Apple Silicon) + HuggingFace
  model download + gateway config with local endpoints.
- Doodba template **v18.0.0**: full stack with **Local AI runtime option**
  (gateway → `host.docker.internal`, no API keys needed).

## Model-agnostic (BYOM)

Our models are **recommended defaults — never a requirement**. OdooClaw stays fully
model-agnostic: you can keep using any model you already have.

- **Cloud**: OpenAI, Anthropic, DeepSeek, Gemini, Groq, OpenRouter, Moonshot, Qwen, NVIDIA, Zhipu
- **Local**: llama.cpp, oMLX/MLX, Ollama, vLLM — any OpenAI-compatible endpoint

The gateway treats your model and ours exactly the same. Nothing is hardcoded to the
shipped models; switching providers is a one-line config change.

## Safety model

- No changes to the Odoo ACL, record-rule, or delegated-user enforcement.
- ToolGuard blocks destructive operations (unlink/delete) unless explicitly
  confirmed; deny-by-default when no security configuration exists.
- Webhooks require a valid single-use reply token.
- OAuth credentials are read from environment variables — no hardcoded secrets
  in the repository (history sanitized, verified by tree scan).

## Validation

- Go suite: **46/46 packages green** (`go build ./...` + `go test ./...`).
- Odoo module (`mail_bot_odooclaw`): **23/23 tests green** against Odoo 18.
- E2E against real stack: **8/8** (login, partner summary, create activity,
  list, task/sale-order search, rejections).
- CI gate: GitHub Actions on every branch/PR (build + vet + test).
- Installer verified in both modes (local AI runtime + cloud) with mocks.

## Issues

- Merge: https://github.com/nicolasramos/odooclaw/pull/64
- Dynamic billing rules PR: https://github.com/nicolasramos/odoo-addons/pull/9
- Roadmap continuation (NRA-511..515): memory, dataset builder, context <1K,
  Odoo domain, knowledge base.
