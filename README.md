<div align="center">
  <img src="odooclaw/assets/logo_openclaw.png" alt="OdooClaw" width="600">

  <h1>OdooClaw 1.0 — Next Generation</h1>

  <h3>100% Local AI for Odoo · Own Trained Models · No Subscriptions · Data Sovereignty</h3>

  <p>
    <img src="https://img.shields.io/badge/release-v1.0.0-brightgreen" alt="Release v1.0.0">
    <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go&logoColor=white" alt="Go">
    <img src="https://img.shields.io/badge/Odoo-16%20%7C%2017%20%7C%2018-F68B20?style=flat&logo=odoo&logoColor=white" alt="Odoo">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
    <br>
    <a href="https://github.com/nicolasramos/odooclaw"><img src="https://img.shields.io/badge/GitHub-Repository-black?style=flat&logo=github&logoColor=white" alt="GitHub"></a>
    <a href="https://huggingface.co/nicolasramos"><img src="https://img.shields.io/badge/HuggingFace-Models-FFD21E?style=flat&logo=huggingface&logoColor=black" alt="HuggingFace Models"></a>
    <a href="https://github.com/nicolasramos/odooclaw/releases/tag/v1.0.0"><img src="https://img.shields.io/badge/Release-Notes-blue?style=flat" alt="Release Notes"></a>
  </p>

</div>

---

## 🚀 Next Generation: your own AI, on your own hardware

**OdooClaw 1.0 is no longer just an agent that borrows any model. It is a complete AI
system with its own trained models** — 100% local, open source (MIT), and free forever.

> **Your ERP. Your data. Your hardware. No subscriptions. No cloud.**
> If you already run OdooClaw with your own models, keep them — it stays model-agnostic.

### 🧠 Own trained models (published on HuggingFace)

| Model | Format | What it does |
|---|---|---|
| **[OdooClaw Light 1.2B](https://huggingface.co/nicolasramos/odooclaw-light-1.2b-ft)** | GGUF (llama.cpp) + Ollama | Conversational agent fine-tuned on **26,968 real business examples**: greetings, real conversation, record creation, destructive-operation refusal. **95% real-conversation accuracy, 600/600 record creations** with full schemas. |
| **[OdooClaw Light 1.2B (MLX)](https://huggingface.co/nicolasramos/odooclaw-light-1.2b-ft-mlx)** | MLX (Apple Silicon) | Same model, native MLX runtime for Mac — never llama.cpp on Apple. |
| **[OdooClaw Vision](https://huggingface.co/nicolasramos/odooclaw-vision)** | GGUF + mmproj | Invoice/document extraction straight from PDF, no cloud. **794/800 fields correct** in benchmark. |
| **[OdooClaw Vision (MLX)](https://huggingface.co/nicolasramos/odooclaw-vision-mlx)** | MLX (Apple Silicon) | Same vision model, native MLX. |

**Benchmarks (real hardware):** VPS 1 vCPU 20 tok/s · N100 72 · Mac Mini M1 146 · Strix Halo 221 · RTX 5070 Ti 620 · M1 Ultra **643 tok/s**. Less than 1GB of models.

### 📦 One-shot local install

```bash
# Linux (llama.cpp + n-gram speculative decoding, +49% tok/s)
curl -sL https://raw.githubusercontent.com/nicolasramos/odooclaw/v1.0.0/odooclaw/scripts/setup-local.sh | bash

# Apple Silicon (oMLX/MLX, never llama.cpp on Mac)
curl -sL https://raw.githubusercontent.com/nicolasramos/odooclaw/v1.0.0/odooclaw/scripts/setup-local.sh | bash
```

The installer builds the runtime, downloads the models from HuggingFace and writes the
gateway config pointing to **your hardware** (`127.0.0.1:8082` chat / `:8093` vision).
Zero API keys. Or deploy the full stack with the [Doodba template v18.0.0](https://github.com/nicolasramos/odooclaw-doodba)
(local AI runtime option included).

### 🧪 Tested before release

- **46/46 Go packages green** · **23/23 Odoo module tests** (Odoo 18) · **E2E 8/8** against a real stack
- CI gate on every branch/PR (GitHub Actions)
- History clean: no secrets, no build artifacts, no junk

---

## ✨ Key Features

- 🪶 **Ultra-Lightweight**: Under 10MB of RAM footprint. It can run on the exact same server as Odoo without impacting performance!
- 🤝 **Odoo Discuss Integration**: Talk to the AI directly from your Odoo chat.
- 🔐 **Native Permission Inheritance**: Secure by default. The AI dynamically assumes Odoo user permissions, preventing any bypass of native Security Rights or Record Rules.
- 🧠 **Intelligent ORM Bridge**: High-precision tool execution. The `odoo-mcp` bridge provides modular tools with strict validation, denylist/allowlist controls, and safer mappings for real Odoo ORM operations.
- 🧠 **Dual-Layer Memory (HOT + COLD)**: Keeps current prompt memory behavior while adding scoped historical memory, temporal facts, timeline recall, retrieval explainability, and optional historical markdown import.
- 🧠 **Structured Session Memory (NRA-511)**: Per-session business state (current partner/company/document/module, pending confirmations) + long-term profile (preferences, company) — tools `memory_set_session_state`, `memory_set_pending_confirmation`, `memory_clear_pending`.
- 📚 **Knowledge Base + Tool Retrieval (NRA-515)**: SQLite FTS5 KB with Odoo domain knowledge + retrieval engine that injects only the top 3-5 compact tool schemas (~245 tokens vs ~3,800 full) instead of all 100+.
- 🏭 **Reproducible Dataset Pipeline (NRA-512)**: repo → parser → metadata → JSONL generator + validator + orchestrator; change a tool → regenerate the dataset.
- 🧾 **4-Layer Model-Agnostic OCR Pipeline**: vision → fiscal → header → validation with any OpenAI-compatible model (default: GLM-OCR + LFM2.5). Validated 15/31 real invoices; failures go to declared review, never invented.
- 🧾 **Dynamic Billing Rules (account_dynamic_rules)**: our module amplified with `tax_ids` + `fiscal_position_id` (PR #9 merged in odoo-addons): the tax and fiscal position are decided by Odoo from the OCR invoice JSON — **zero hardcoded taxes**, purely configurable mechanism, backported for Odoo 16/17/18.
- 🛠️ **ToolGuard**: tool-call validation wrapper — schema validation + destructive-operation gating, dynamic allowlist from `ir.model` + denied models + escape hatch.
- 💾 **One-Shot Local Installer**: `scripts/setup-local.sh` — llama.cpp (Linux) / oMLX (Apple) + HuggingFace model download + gateway config. Apple Silicon always uses MLX.
- ⚡ **n-gram Speculative Decoding**: `--spec-ngram-mod-n-max 16` — benchmarked +49% tok/s on Linux (NRA-541).
- 🔁 **RLM Acceleration (Context-Rot Resistant)**: For large Odoo datasets, OdooClaw decomposes analysis into recursive Map-Reduce steps (`rlm_partition` -> sub-agents -> `rlm_aggregate`) to keep context clean, improve accuracy, and reduce long-context cost.
- 📄 **Smart OCR & Action Generation**: Automatically scans PDF invoices, extracts data, and creates vendor bills or purchase orders intelligently.
- 💼 **Workforce Ops Tools**: Native tools for attendance, check-in/check-out, task-centric timesheets, daily summaries, missing-timesheet detection, and expense report lifecycle.
- 🧾 **Accounting Ops Tools**: Native tools for bank reconciliation workflows, AR/AP aging, period-close checks, journal entry creation/posting, tax summary, and duplicate bill risk checks.
- 🚗 **OCR Expense Flows**: Attachment-to-expense creation for employee receipts and mileage (`ocr-create-employee-expense`, `ocr-create-mileage-expense`) with dry-run support.
- 🎤 **Voice Messages**: Send and receive voice notes! Supports transcription (STT) and speech synthesis (TTS).
- ⚡ **Asynchronous & Non-Blocking**: Odoo ↔ OdooClaw communication relies on Webhooks ("Fire & Forget"), releasing Odoo workers instantly.
- 🧠 **Segregated Context**: AI memory is independent per channel/user. It doesn't mix private information.
- 🤖 **Integrated MCP Server**: Uses the industry standard Model Context Protocol (MCP) via embedded Python servers, providing `odoo-mcp` (granular Odoo tools with permission-aware execution), `ocr-invoice` (invoice/PO parsing), `whisper-stt` (voice transcription), and `edge-tts` (text-to-speech).
- 🧷 **Reliable Odoo Chat Identity Context**: Odoo Discuss sender context now consistently propagates to `odoo-mcp` calls (including `odoo-mcp` server alias), ensuring correct `sender_id`/company scope in tool execution.
- 🔒 **Private Odoo Reply Routing**: Group mentions can be safely handled with private 1:1 reply targets and user-scoped sessions, preventing cross-user context leakage in shared channels.
- 🧩 **Gemma4 Tool-Calling Compatibility**: Supports Gemma4/OpenAI-compatible endpoints that emit pseudo tool-call content (`<|tool_call>call:...{...}`), including normalization of tool names, nested argument parsing, and automatic conversion to executable tool calls.
- 🛡️ **Secure by Design**: Pre-configured personality (`AGENTS.md`) designed to query, ask for confirmation, and *never* perform critical modifications without explicit permission.

---

## 🚀 Integration Architecture

The integration consists of two parts:
1. **The OdooClaw container**: Acts as the AI Gateway.
2. **The Odoo module (`mail_bot_odooclaw`)**: Intercepts messages in Odoo and sends them to OdooClaw.

### The Communication Flow (Via Webhook)

1. **User writes to OdooClaw**: In Odoo, a user sends a Direct Message (default mode) or, if enabled, mentions `@OdooClaw` in a channel. The module overrides `_message_post` to detect this intent.
2. **Odoo sends an Asynchronous Webhook**: Instead of blocking while waiting for the AI, Odoo sends an HTTP POST JSON payload in the background to the OdooClaw API (`http://odooclaw:18790/webhook/odoo`).
3. **OdooClaw processes it**: The agent evaluates the intent and contacts the LLM provider (OpenAI, Anthropic, vLLM, etc.). The LLM invokes `odoo-mcp` tools from our **internal MCP server** (Python), executing permission-aware Odoo operations (search, read, create, write, safe actions) for the requesting user context.
4. **OdooClaw replies to Odoo**: Once the response is ready, OdooClaw makes an HTTP POST back to the Odoo endpoint (`/odooclaw/reply`), which injects the message into Discuss, impersonating the bot.

### Multi-Database Routing (Important)

If your Odoo instance contains more than one database, configure an explicit target DB for Odoo channel replies:

```env
ODOO_DB=devel
ODOO_DBFILTER=^devel$
ODOOCLAW_CHANNELS_ODOO_TARGET_DB=devel
```

- `ODOOCLAW_CHANNELS_ODOO_TARGET_DB` forces deterministic routing for `/odooclaw/reply` requests.
- `ODOO_DBFILTER` prevents ambiguous DB resolution on the Odoo HTTP side.
- Without these settings in multi-DB setups, Odoo replies may fail with `404`.

---

## 🎤 Voice Messages (STT & TTS)

OdooClaw supports **voice notes** in both directions:

### Receiving Voice Messages (Speech-to-Text)

When a user sends a voice note in Odoo Discuss:
1. The webhook automatically detects the voice attachment
2. OdooClaw uses the `whisper-stt` skill to transcribe the audio
3. The LLM processes the transcribed text and responds

**Transcription Methods:**
- **Faster Whisper** (local): No API key needed, runs on CPU
- **Whisper API** (OpenAI): More accurate, requires `OPENAI_API_KEY`

### Sending Voice Responses (Text-to-Speech)

When the user asks for voice output (e.g., "read this aloud", "voice response"):
1. OdooClaw uses the `edge-tts` skill to generate audio
2. Audio is uploaded to Odoo as an attachment
3. Voice metadata is created for proper playback in Discuss
4. Bot responds with a playable voice note

**Available Voices:**
- Spanish: `es-ES-ElenaNeural`, `es-MX-DaliaNeural`, `es-AR-TomasNeural`
- English: `en-US-JennyNeural`, `en-US-GuyNeural`, `en-GB-SoniaNeural`
- And many more (French, German, Italian, Portuguese, Chinese, Japanese)

### Environment Variables for Voice

```yaml
# For STT (Speech-to-Text)
- OPENAI_API_KEY=${OPENAI_API_KEY}  # Optional, for Whisper API fallback

# For TTS (Text-to-Speech) - No additional config needed
# Edge TTS is free and included by default
```

See [Voice Features Documentation](odooclaw/docs/VOICE_FEATURES.md) for detailed configuration.

---

## 📦 Odoo Module (`mail_bot_odooclaw`)

The native module is located at: `odoo/custom/src/{version}/mail_bot_odooclaw/`

> **Note**: This module has been moved to a dedicated repository for standalone use:
> [`github.com/nicolasramos/odoo-addons`](https://github.com/nicolasramos/odoo-addons)  
> Each Odoo version lives on its own branch: [`16`](https://github.com/nicolasramos/odoo-addons/tree/16), [`17`](https://github.com/nicolasramos/odoo-addons/tree/17), [`18`](https://github.com/nicolasramos/odoo-addons/tree/18).

### Supported Odoo Versions

| Version | Module Path | Channel Model |
|---------|-------------|---------------|
| **Odoo 18** | `odoo/custom/src/18.0/mail_bot_odooclaw/` | `discuss.channel` |
| **Odoo 17** | `odoo/custom/src/17.0/mail_bot_odooclaw/` | `mail.channel` |
| **Odoo 16** | `odoo/custom/src/16.0/mail_bot_odooclaw/` | `mail.channel` |

> **Note**: Odoo 18 renamed `mail.channel` to `discuss.channel` and changed the member relationship structure. Each version's module handles these differences automatically.

### Installation in Odoo

1. Spin up your Odoo environment (for instance, using Doodba).
2. Get the `mail_bot_odooclaw` module:
   - Clone `https://github.com/nicolasramos/odoo-addons.git` (branch `16`, `17`, or `18`) and add it to your addons path.
3. Enable **Developer Mode** in Odoo (Settings -> Activate the developer mode).
4. Go to **Apps**, click on "Update Apps List".
5. Search for `OdooClaw` and install the **OdooClaw AI Bot** module.
6. **Additional Configuration:** Go to Settings > Technical > System Parameters and verify/create the key `odooclaw.webhook_url` with the value `http://odooclaw:18790/webhook/odoo`.

---

## 🐳 Deployment with Doodba (Docker Compose)

You can easily integrate OdooClaw into your Doodba stack. Here is an example of how to set up your `docker-compose.yml` (or `prod.yaml` / `devel.yaml`):

```yaml
version: "2.4"

services:
  odoo:
    # Your normal Odoo Doodba configuration...
    depends_on:
      - db
    networks:
      default:

  odooclaw:
    build:
      context: ./odooclaw # Path to OdooClaw source code
      dockerfile: docker/Dockerfile # Required for Doodba integration
    env_file:
      - .docker/odooclaw.env # Dedicated least-privilege Odoo technical user
    restart: unless-stopped
    environment:
      # Credentials for Odoo XML-RPC connection
      - ODOO_URL=http://odoo:8069
      - ODOO_DB=${POSTGRES_DB:-devel}
      
      # LLM Configuration
      - ODOOCLAW_AGENTS_DEFAULTS_PROVIDER=openai
      - ODOOCLAW_AGENTS_DEFAULTS_MODEL=gpt-4o
      - ODOOCLAW_PROVIDERS_OPENAI_API_KEY=${OPENAI_API_KEY}
      - ODOOCLAW_PROVIDERS_OPENAI_API_BASE=${OPENAI_API_BASE:-https://api.openai.com/v1}
      
      # Odoo Channel Configuration (Gateway)
      - ODOOCLAW_CHANNELS_ODOO_ENABLED=true
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_HOST=0.0.0.0
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PORT=18790
      - ODOOCLAW_CHANNELS_ODOO_WEBHOOK_PATH=/webhook/odoo
      - ODOOCLAW_CHANNELS_ODOO_TARGET_DB=${POSTGRES_DB:-devel}
      - ODOOCLAW_CHANNELS_ODOO_ALLOW_GROUP_MENTIONS=false # Recommended default: DM-only
    volumes:
      # Persistent volume for memory, configs, and OdooClaw local DB
      - odooclaw_data:/home/odooclaw/.odooclaw
    depends_on:
      - odoo
    networks:
      - default

volumes:
  odooclaw_data:
```

### Credentials Management (`.env`)

It is imperative to use environment variables (e.g., in `.docker/odoo.env`) to inject your keys securely:

```env
OPENAI_API_KEY="sk-your-api-key"
# Optional, if using LMStudio, vLLM or other OpenAI-compatible APIs:
# OPENAI_API_BASE="http://your-local-llm:1234/v1"

# Dedicated internal user with only the OdooClaw Delegated RPC group:
ODOO_USERNAME="odooclaw_service"
ODOO_PASSWORD="your-strong-password-or-odoo-api-key"
```

Never configure OdooClaw with a general-purpose administrator. See
[Odoo Technical User for Delegated MCP Access](odooclaw/docs/ODOO_TECHNICAL_USER.md).

### Doodba 18 Dev/Test (Practical Local Flow)

If your local Doodba project is in a path like `/Users/nramos/DEV/doodba-18`, this is the recommended open-source friendly flow:

1. Keep OdooClaw source in your Doodba workspace so Compose can build it.
2. Add `odooclaw` service to `devel.yaml` (or `prod.yaml`) with internal URL `ODOO_URL=http://odoo:8069`.
3. Store secrets in `.docker/odoo.env` (never commit API keys).
4. Set Odoo system parameter `odooclaw.webhook_url` to `http://odooclaw:18790/webhook/odoo`.
5. Rebuild only changed services:

```bash
docker compose build odoo odooclaw
docker compose up -d odoo odooclaw
docker compose logs -f odooclaw
```

For complete Doodba setup guides:
- English: `odooclaw/docs/GUIDE_DOODBA_SETUP_EN.md`
- Spanish: `odooclaw/docs/GUIA_DOODBA_PUESTA_EN_MARCHA_ES.md`

## 🔗 Related Projects

- 🦐 **[OdooClaw](https://github.com/nicolasramos/odooclaw)** — this repository (AI gateway + agent)
- 📦 **[OdooClaw Doodba Template](https://github.com/nicolasramos/odooclaw-doodba)** — stable deployment (v18.0.0) with **Local AI runtime option**
- 🧩 **[Odoo Addons](https://github.com/nicolasramos/odoo-addons)** — `mail_bot_odooclaw` (Odoo module) + `account_dynamic_rules` (dynamic billing rules, Odoo 16/17/18)
- 🤗 **[HuggingFace Models](https://huggingface.co/nicolasramos)** — OdooClaw Light 1.2B (GGUF/MLX/Ollama) + OdooClaw Vision (GGUF/MLX)
- 🌐 **[nramos.dev](https://nramos.dev)** — project blog and documentation

### Odoo Privacy Modes (Recommended)

- **DM-only (default and recommended):**
  - `ODOOCLAW_CHANNELS_ODOO_ALLOW_GROUP_MENTIONS=false`
  - Group mentions are ignored; only direct messages trigger the assistant.

- **Group mentions enabled (advanced mode):**
  - `ODOOCLAW_CHANNELS_ODOO_ALLOW_GROUP_MENTIONS=true`
  - Group mentions are accepted.
  - Odoo module provides private reply targets so responses can still be posted in a user↔bot private chat.
  - Session scope is isolated per requesting user for those interactions.

### Browser Copilot in Doodba (Phase 1 MVP)

Browser extension availability:

- Firefox Add-ons: [OdooClaw Browser Copilot](https://addons.mozilla.org/addon/odooclaw-browser-copilot/)
- Chrome Web Store: [OdooClaw Browser Copilot](https://chromewebstore.google.com/detail/odooclaw-browser-copilot/lnmdgafmodbhnaijnllfcoabfofdffkc)

To enable the new browser-copilot module in the same dev/test stack:

1. Start backend from project root:

```bash
docker compose -f "odooclaw/browser_copilot/docker-compose.browser-copilot.yml" up --build
```

2. Configure extension popup:
    - Backend URL: `http://127.0.0.1:8765`
    - Token: same value as `BROWSER_COPILOT_TOKEN`

   Browser support currently documented for:
   - Firefox Add-ons (public listing)
   - Chrome Web Store (public listing)
   - Firefox local development (load temporary add-on)

   See `browser_extension/README.md` for browser-specific install steps.

3. Keep secure defaults in phase 1:
   - `BROWSER_COPILOT_READ_ONLY=true`
   - allowlisted domains only
   - explicit user confirmation before action execution

4. Validate end-to-end:

```bash
./odooclaw/browser_copilot/scripts/smoke_test.sh
```

See full backend and extension documentation:
- `odooclaw/browser_copilot/README.md`
- `browser_extension/README.md`
- `odooclaw/docs/BROWSER_COPILOT_DOODBA_SETUP.md`
- `odooclaw/docs/BROWSER_EXTENSION_DISTRIBUTION.md`
- `odooclaw/docs/DOODBA_MINIMAL_STACK_EXAMPLE.md`

Copy/paste-ready baseline files for Doodba are available in:

- `examples/doodba/prod.odooclaw-browser-copilot.redis.yaml`
- `examples/doodba/odoo-env-odooclaw-browser-copilot.example`
- `examples/doodba/config.odooclaw.minimal.example.json`

### 3. Configuration Files

To facilitate its use in different environments (Docker/Doodba or local binaries), OdooClaw offers two ways to configure it:

1. **`odooclaw/.env.example`** (Recommended for Doodba / Docker Compose):
   - Shows how to inject settings directly via **environment variables** (e.g.: `OPENAI_API_KEY`).
   - In a Doodba environment, simply copy the contents of `.env.example` into your `.docker/odoo.env` file or your main server's environment file.
   - It is the safest approach to keep passwords (like the Odoo API Key and your LLM provider key) secure and portable.

2. **`odooclaw/config/config.example.json`** (Local Deployments / Binaries):
   - It is the structured template with **all the complete configuration** for OdooClaw.
   - Defines providers, sandbox rules, chat channels (Discord, Telegram, Odoo), web search, and scheduled tasks (`cron`).
   - When you run OdooClaw without Docker, it reads from `~/.odooclaw/config.json` by default. You should copy this example file to that path and edit it with your keys.
   - *Note: Docker environment variables will always take precedence over the `config.json` file.*

---

## 💻 Usage Modes

### 1. Server/Gateway (Recommended)
The container starts by default in gateway mode (`odooclaw gateway`). It listens on port `18790` waiting for webhooks from the Odoo chat.

### 2. CLI "One-Shot" Mode (Quick Testing)
Since you are running OdooClaw as a container within a `docker-compose` environment (like Doodba), you can execute queries directly in the terminal by attaching to the running container and using the agent mode:

```bash
# Test the Odoo skill from the terminal
docker compose exec odooclaw odooclaw agent -m "Tell me what Odoo version is running and verify the connection"

# Enter interactive terminal mode
docker compose exec odooclaw odooclaw agent
```

<img src="odooclaw/assets/screenshots/odooclaw_termina.png" alt="OdooClaw Terminal" width="800">

---

## ⚙️ Configuration Deep Dive

While the `.env.example` provides a quick way to configure OdooClaw for Docker, the core engine relies on a rich configuration system inherited and adapted from PicoClaw.

### Workspace Layout

OdooClaw stores its data in the configured workspace (default inside Docker: `/home/odooclaw/.odooclaw/workspace`):

```text
.odooclaw/workspace/
├── sessions/          # Conversation sessions and history for Odoo users
├── memory/            # Long-term vector memory 
├── state/             # Persistent state (last channel, etc.)
├── skills/            # Custom skills (like odoo-mcp)
├── AGENTS.md          # AI personality and strict Odoo directives
├── HEARTBEAT.md       # Periodic task prompts (checked every 30 min)
├── IDENTITY.md        # Agent identity (Odoo Assistant)
├── SOUL.md            # Agent soul and values
└── USER.md            # User preferences and expectations
```

### Heartbeat (Periodic Tasks)

OdooClaw supports periodic background tasks via `HEARTBEAT.md`. Disabled by default
to avoid unnecessary token consumption. Enable with:

```env
ODOOCLAW_HEARTBEAT_ENABLED=true
ODOOCLAW_HEARTBEAT_INTERVAL=30  # minutes, minimum 5
```

### 🔒 Security Sandbox

Because OdooClaw can execute terminal commands and write files, it runs in a sandboxed environment by default to ensure it doesn't accidentally mess with your host system files. 

- **Protected Tools**: Tools like `read_file`, `write_file`, and `list_dir` are restricted to the workspace folder.
- **Exec Protection**: Even if you disable the sandbox, the `exec` tool proactively blocks dangerous patterns like `rm -rf`, formatting commands, system shutdown commands, or fork bombs.

### Providers & Model Configuration

OdooClaw uses a **model-centric** configuration approach (`model_list` in `config.json`). You simply specify the `vendor/model` format to add new providers—**zero code changes required!**

This allows incredible flexibility for your ERP, such as using lightweight local models for easy queries to save costs, and falling back to massive models for complex data analysis.

**All Supported Vendors Prefix:**
`openai/`, `anthropic/`, `zhipu/`, `deepseek/`, `gemini/`, `groq/`, `moonshot/`, `qwen/`, `nvidia/`, `ollama/` (Local), `openrouter/`, `vllm/` (Local).

#### Example: Local Ollama Model
If you want to use a 100% free and local model hosted on your server alongside Odoo, you can easily point OdooClaw to it:

```json
{
  "model_list": [
    {
      "model_name": "llama3.1",
      "model": "ollama/llama3.1",
      "api_base": "http://host.docker.internal:11434/v1"
    }
  ],
  "agents": {
    "defaults": {
      "model": "llama3.1"
    }
  }
}
```

#### Load Balancing
If you manage a huge Odoo instance with hundreds of users querying the AI, you can configure multiple API keys/endpoints for the same model name, and OdooClaw will automatically **round-robin** between them to prevent rate-limiting!

### Engram Internal Memory

OdooClaw can use Engram as an internal strategic-memory backend for durable knowledge such as architecture decisions, bug fixes, discoveries, conventions, and stable preferences.

Engram should be configured as an **internal MCP server**: connected through `engram mcp`, but excluded from global MCP tool registration. This keeps raw `mem_*` tools away from the LLM and exposes only OdooClaw's controlled `memory_save_strategic` path.

See `odooclaw/docs/tools_configuration.md` for the full configuration example.

For Docker/Doodba deployments, install a pinned Engram release binary inside the OdooClaw image and enable it explicitly with `ODOOCLAW_ENGRAM_ENABLED=true`. See [Engram Internal Memory in Docker/Doodba](odooclaw/docs/ENGRAM_DOCKER_DOODBA.md).

---

## 🛠️ MCP Server and Skills

One of the most advanced features of OdooClaw is its use of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). We include MCP servers that expose vital tools to the AI:

### Core Skills

| Skill | Description |
|-------|-------------|
| `odoo-mcp` | Modular Odoo tools (`odoo_search`, `odoo_read`, `odoo_create`, `odoo_write`, safe actions) with strict permission context and denylist/allowlist security |
| `ocr-invoice` | Parse and extract structured data from PDF/Image documents |
| `rlm-utils` | Partition and aggregate large datasets for recursive long-context analysis |

### Voice Skills

| Skill | Description |
|-------|-------------|
| `whisper-stt` | Transcribe voice messages (Faster Whisper local + Whisper API fallback) |
| `edge-tts` | Generate voice responses using Microsoft Edge TTS |

By relying on the MCP standard, these servers run isolated and dynamically inject their capabilities into the LLM on every interaction.

### Why RLM in OdooClaw?

RLM (Recursive Language Models) is used as a practical inference strategy for ERP workloads where a single prompt can include hundreds of records or large attachments. Instead of pushing everything into one giant context, OdooClaw applies context-centric decomposition:

1. **Decompose**: Fetch data, split into chunks with `rlm_partition`.
2. **Map**: Process each chunk in parallel with sub-agents (`spawn` / `subagent`).
3. **Reduce**: Merge outputs using `rlm_aggregate` and produce a final answer.

Benefits in production:

- Better robustness against context rot on long conversations.
- Lower token pressure and more predictable latency/cost.
- Higher precision for analytical tasks (invoices, journals, stock moves, large order lists).

Recommended chunk sizing (starting point):

| Workload | Typical records | Suggested `chunk_size` | Why |
|---|---:|---:|---|
| Invoice/PO quick checks | 50-300 | 20-40 | Fast map phase with low overhead |
| Accounting analysis | 300-2,000 | 50-100 | Good cost/latency balance |
| Very large audits | 2,000+ | 100-200 | Fewer sub-calls while preserving context hygiene |

### Reproducible benchmark: single-pass vs RLM

Use `odooclaw/scripts/benchmark_rlm.py` to compare:

- **Latency** (`mean_latency_s`)
- **Cost proxy** (`mean_total_tokens`, `mean_cost_usd`)
- **Quality** (`exact_match_rate`, `mean_abs_error`)

Example:

```bash
python3 odooclaw/scripts/benchmark_rlm.py \
  --api-base "https://api.openai.com/v1" \
  --api-key "$OPENAI_API_KEY" \
  --model "gpt-4o-mini" \
  --sizes 100 500 2000 \
  --repeats 3 \
  --chunk-size 100 \
  --input-cost-per-1m 0.15 \
  --output-cost-per-1m 0.60
```

The script prints JSON summary per mode/size so you can track if RLM improves robustness as context grows.

---

## 🧠 Behavior Configuration (Workspace)

OdooClaw extracts its personality and rules from the `workspace/` folder. The files have been adjusted to suit an ERP environment:

- **`AGENTS.md` (Strict Directives)**: Instructed to **NEVER delete or critically modify** an Odoo record without first showing a summary and demanding an explicit "Yes" from the user.
- **`USER.md` (User Profile)**: Assumes it is talking to employees/operators of an ERP. Formats its results in clean Markdown and gets straight to the point.
- **`SOUL.md` (Alignment)**: Has a cautious personality; prefers to admit it can't find a piece of data rather than making it up (zero hallucinations).

If you need to "reset" the brain or wipe a user's vector memory, simply delete or purge the `odooclaw_data` volume.

---

## 📚 Additional Documentation

Deeper configuration (alternative providers like Anthropic, Ollama, etc., troubleshooting, and advanced setups) can be found in the `/odooclaw/docs/` directory:

- [Main Documentation](odooclaw/docs/README.md)
- [General Configuration (JSON)](odooclaw/docs/CONFIGURATION.md)
- [Voice Features (STT/TTS)](odooclaw/docs/VOICE_FEATURES.md)
- [SQLite + Historical Memory](odooclaw/docs/SQLITE_MEMORY.md)
- [Odoo Chat Memory QA Guide](odooclaw/docs/ODOO_CHAT_MEMORY_QA.md)
- [Changelog](odooclaw/docs/CHANGELOG.md)
- [General Troubleshooting](odooclaw/docs/troubleshooting.md)
- [Antigravity Auth and Usage](odooclaw/docs/ANTIGRAVITY_USAGE.md)

Furthermore, OdooClaw retains the ability to integrate with **Telegram, Discord, WhatsApp, and WeCom**. Check the documentation in `docs/channels/` to enable them alongside Odoo.

---

## 🛠️ Architecture and Technical Documentation

OdooClaw shares the ultra-lightweight architectural principles of its predecessor PicoClaw, but extends them significantly for the ERP ecosystem:

- **Core Engine**: Written in Go (1.21+), compiling to a single standalone binary.
- **Event Bus**: An internal `bus` package decouples the Odoo webhooks from the LLM execution, allowing true asynchronous background processing.
- **Routing & Memory**: Channels route conversations seamlessly. Each user/thread gets isolated context to avoid data contamination between different Odoo records. Memory uses a HOT operational layer plus a scoped COLD historical layer with temporal facts and explainability tools.
- **Skills Framework (MCP)**: Native support for the *Model Context Protocol*, allowing you to plug any external Python/Node script securely.

For an in-depth look at the architecture, please refer to the [Design Documentation](odooclaw/docs/design/ARCHITECTURE.md).

---

## 📚 Documentation

Guides for running and extending OdooClaw locally:

- **[Local Setup](odooclaw/docs/LOCAL_SETUP.md)** — one-shot installer: llama.cpp (Linux) / oMLX (Apple), model download from HuggingFace, gateway config, n-gram speculative flags.
- **[Memory System](odooclaw/docs/MEMORY.md)** — layered memory: HOT/COLD (SQLite), structured session memory (NRA-511), long-term profile, memory tools.
- **[Knowledge Base & Tool Retrieval](odooclaw/docs/KNOWLEDGE_RETRIEVAL.md)** — KB + retrieval engine (NRA-515): top-3-5 compact tool schemas, synonym rewriter, Odoo domain knowledge.
- **[Models](odooclaw/docs/MODELS.md)** — canonical models, how to change/swap models, HF publishing convention (GGUF + MLX + Ollama), acceleration.
- **[ToolGuard](odooclaw/docs/toolguard.md)** — tool-call validation wrapper: schema checks + destructive-operation gating.
- **[Dataset Pipeline](scripts/dataset_pipeline/README.md)** — reproducible training dataset generation (NRA-512).
- **[OCR Invoice Pipeline](odooclaw/workspace/skills/ocr-invoice/README.md)** — 4-layer model-agnostic invoice extraction (vision → fiscal → header → validation).
- **[Changelog](odooclaw/docs/CHANGELOG.md)** — release history (Unreleased covers NRA-511/512/513/515/540/541/542).

---


> **Fork Notice**: This project is a fork of [PicoClaw](https://github.com/sipeed/picoclaw) created by [Sipeed](https://github.com/sipeed). We have deeply modified and adapted it to integrate natively with **Odoo ERP** using asynchronous webhooks and a dedicated communication channel. The PicoClaw legacy gives OdooClaw its ultra-lightweight Go engine: under 10MB of RAM, boots in under 1 second, runs on x86/ARM/RISC-V — so it fits inside any Odoo deployment without cannibalizing ERP resources.

## ⚖️ License and Credits

This project is distributed under the **MIT** license.

- **OdooClaw** and its Odoo native integration have been developed by **Nicolás Ramos** and the OdooClaw contributors.
- It is a deeply adapted **fork** of [PicoClaw](https://github.com/sipeed/picoclaw) by Sipeed.
- In turn, PicoClaw is heavily inspired by [nanobot](https://github.com/HKUDS/nanobot) by HKUDS.
- Strategic memory integration is powered by [Engram](https://github.com/Gentleman-Programming/engram.git), created by **Gentleman Programming**.

### Forking and Attribution

We strongly encourage the open-source community to fork, modify, and improve OdooClaw! If you fork this project or use its core components in your own work, we kindly request that you:

1. Maintain the attribution to the original creators (Nicolás Ramos / OdooClaw, Sipeed, and HKUDS).
2. Keep the `LICENSE` file intact.
3. Include a visible "Fork Notice" in your project's `README.md` pointing back to this repository, similar to the one at the top of this document.
