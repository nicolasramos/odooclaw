<div align="center">
  <img src="odooclaw/assets/logo_openclaw.png" alt="OdooClaw" width="600">

  <h1>OdooClaw: AI Assistant for Odoo ERP</h1>

  <h3>Native Odoo Integration · AI Assistant · $10 Hardware · 10MB RAM</h3>

  <p>
    <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go&logoColor=white" alt="Go">
    <img src="https://img.shields.io/badge/Odoo-17%20%7C%2018-F68B20?style=flat&logo=odoo&logoColor=white" alt="Odoo">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
    <br>
    <a href="https://github.com/nicolasramos/odooclaw"><img src="https://img.shields.io/badge/GitHub-Repository-black?style=flat&logo=github&logoColor=white" alt="GitHub"></a>
  </p>

</div>

---

> **Fork Notice**: This project is a fork of [PicoClaw](https://github.com/sipeed/picoclaw) created by [Sipeed](https://github.com/sipeed). We have deeply modified and adapted it to integrate natively with **Odoo ERP** using asynchronous webhooks and a dedicated communication channel.

### 🌟 The PicoClaw Legacy: Why this base?

PicoClaw was originally created by Sipeed to solve a very specific problem: bringing advanced AI Agent capabilities to ultra-low-cost hardware. We chose it as the foundation for OdooClaw because of its incredible technical feats:

- **Written in Go**: Resulting in a single, fast, self-contained binary.
- **Microscopic Footprint**: It uses **less than 10MB of RAM**, which is 99% less memory than its NodeJS/TypeScript counterparts (like OpenClaw or AutoGPT).
- **Instant Boot**: Boots in under 1 second, even on single-core 0.6GHz hardware ($10 boards).
- **True Portability**: Runs seamlessly on x86, ARM, and RISC-V architectures.

By using this engine, **OdooClaw** inherits the ability to run directly inside any Odoo deployment (even on minimal cloud VPS instances) without cannibalizing the resources your ERP needs to serve users.

---

🦐 **OdooClaw** is an ultra-lightweight AI assistant written in Go. We added a **native Odoo channel** and a specialized `odoo-manager` skill, allowing the agent to directly interact with your Odoo instance (read, search, write, execute functions) through its XML-RPC API, replying directly within the Odoo Discuss module.

## ✨ Key Features

- 🪶 **Ultra-Lightweight**: Under 10MB of RAM footprint. It can run on the exact same server as Odoo without impacting performance!
- 🤝 **Odoo Discuss Integration**: Talk to the AI directly from your Odoo chat.
- 🔐 **Native Permission Inheritance**: Secure by default. The AI dynamically assumes Odoo user permissions, preventing any bypass of native Security Rights or Record Rules.
- 🧠 **Intelligent ORM Bridge**: High-precision tool execution. The `odoo-manager` bridge includes a logic layer that automatically corrects LLM query hallucinations and maps non-standard arguments to valid Odoo ORM calls.
- 🔁 **RLM Acceleration (Context-Rot Resistant)**: For large Odoo datasets, OdooClaw decomposes analysis into recursive Map-Reduce steps (`rlm_partition` -> sub-agents -> `rlm_aggregate`) to keep context clean, improve accuracy, and reduce long-context cost.
- 📄 **Smart OCR & Action Generation**: Automatically scans PDF invoices, extracts data, and creates vendor bills or purchase orders intelligently.
- 🎤 **Voice Messages**: Send and receive voice notes! Supports transcription (STT) and speech synthesis (TTS).
- ⚡ **Asynchronous & Non-Blocking**: Odoo ↔ OdooClaw communication relies on Webhooks ("Fire & Forget"), releasing Odoo workers instantly.
- 🧠 **Segregated Context**: AI memory is independent per channel/user. It doesn't mix private information.
- 🤖 **Integrated MCP Server**: Uses the industry standard Model Context Protocol (MCP) via an embedded Python server, providing the LLM with the `odoo-manager` tool (full access to the XML-RPC API), `odoo-read-excel-attachment` (automatic parsing of Excel/CSV attachments), `ocr-invoice` (Invoice/PO parsing), `whisper-stt` (voice transcription), and `edge-tts` (text-to-speech).
- 🛡️ **Secure by Design**: Pre-configured personality (`AGENTS.md`) designed to query, ask for confirmation, and *never* perform critical modifications without explicit permission.

---

## 🚀 Integration Architecture

The integration consists of two parts:
1. **The OdooClaw container**: Acts as the AI Gateway.
2. **The Odoo module (`mail_bot_odooclaw`)**: Intercepts messages in Odoo and sends them to OdooClaw.

### The Communication Flow (Via Webhook)

1. **User writes to OdooClaw**: In Odoo, a user mentions `@OdooClaw` in any channel, or sends a Direct Message. The module overrides `_message_post` to detect this intent.
2. **Odoo sends an Asynchronous Webhook**: Instead of blocking while waiting for the AI, Odoo sends an HTTP POST JSON payload in the background to the OdooClaw API (`http://odooclaw:18790/webhook/odoo`).
3. **OdooClaw processes it**: The agent evaluates the intent and contacts the LLM provider (OpenAI, Anthropic, vLLM, etc.). The LLM invokes the `odoo-manager` skill from our **internal MCP server** (Python) which makes the XML-RPC calls (search, read, write) to Odoo to retrieve the requested info or execute actions.
4. **OdooClaw replies to Odoo**: Once the response is ready, OdooClaw makes an HTTP POST back to the Odoo endpoint (`/odooclaw/reply`), which injects the message into Discuss, impersonating the bot.

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

The native module is located at: `odoo/custom/src/mail_bot_odooclaw/`

### Installation in Odoo

1. Spin up your Odoo environment (for instance, using Doodba).
2. Copy the `mail_bot_odooclaw` folder to your `addons` directory.
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
    restart: unless-stopped
    environment:
      # Credentials for Odoo XML-RPC connection
      - ODOO_URL=http://odoo:8069
      - ODOO_DB=${POSTGRES_DB:-devel}
      - ODOO_USERNAME=${ODOO_USERNAME:-admin}
      - ODOO_PASSWORD=${ODOO_PASSWORD:-admin} # IMPORTANT: Use an Odoo API Key in PROD
      
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

# In production, use an Odoo API Key, not the admin password:
ODOO_PASSWORD="your-odoo-api-key"
```

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

### Browser Copilot in Doodba (Phase 1 MVP)

To enable the new browser-copilot module in the same dev/test stack:

1. Start backend from project root:

```bash
docker compose -f "odooclaw/browser_copilot/docker-compose.browser-copilot.yml" up --build
```

2. Configure extension popup:
   - Backend URL: `http://127.0.0.1:8765`
   - Token: same value as `BROWSER_COPILOT_TOKEN`

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
├── skills/            # Custom skills (like odoo-manager)
├── AGENTS.md          # AI personality and strict Odoo directives
├── HEARTBEAT.md       # Periodic task prompts (checked every 30 min)
├── IDENTITY.md        # Agent identity (Odoo Assistant)
├── SOUL.md            # Agent soul and values
└── USER.md            # User preferences and expectations
```

### Heartbeat (Periodic Tasks)

OdooClaw can perform periodic tasks automatically in the background without user intervention. Simply edit the `HEARTBEAT.md` file in your workspace:

```markdown
# Periodic Tasks

- Query Odoo for unconfirmed Sales Orders older than 3 days and summarize them.
- Check the Odoo logs or system parameters to ensure the webhook is correctly set.
```

The agent will read this file every 30 minutes (configurable via `ODOOCLAW_HEARTBEAT_INTERVAL` env var) and execute any tasks using the Odoo skill, silently acting as a background supervisor for your ERP.

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

---

## 🛠️ MCP Server and Skills

One of the most advanced features of OdooClaw is its use of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). We include MCP servers that expose vital tools to the AI:

### Core Skills

| Skill | Description |
|-------|-------------|
| `odoo-manager` | Full Odoo JSON-RPC API access, inheriting Odoo User Permissions securely |
| `odoo-read-excel-attachment` | Parse Excel/CSV attachments using Pandas |
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
- [Changelog](odooclaw/docs/CHANGELOG.md)
- [General Troubleshooting](odooclaw/docs/troubleshooting.md)
- [Antigravity Auth and Usage](odooclaw/docs/ANTIGRAVITY_USAGE.md)

Furthermore, OdooClaw retains the ability to integrate with **Telegram, Discord, WhatsApp, and WeCom**. Check the documentation in `docs/channels/` to enable them alongside Odoo.

---

## 🛠️ Architecture and Technical Documentation

OdooClaw shares the ultra-lightweight architectural principles of its predecessor PicoClaw, but extends them significantly for the ERP ecosystem:

- **Core Engine**: Written in Go (1.21+), compiling to a single standalone binary.
- **Event Bus**: An internal `bus` package decouples the Odoo webhooks from the LLM execution, allowing true asynchronous background processing.
- **Routing & Memory**: Channels route conversations seamlessly. Each user/thread gets isolated context to avoid data contamination between different Odoo records.
- **Skills Framework (MCP)**: Native support for the *Model Context Protocol*, allowing you to plug any external Python/Node script securely.

For an in-depth look at the architecture, please refer to the [Design Documentation](odooclaw/docs/design/ARCHITECTURE.md).

---

## ⚖️ License and Credits

This project is distributed under the **MIT** license.

- **OdooClaw** and its Odoo native integration have been developed by **Nicolás Ramos** and the OdooClaw contributors.
- It is a deeply adapted **fork** of [PicoClaw](https://github.com/sipeed/picoclaw) by Sipeed.
- In turn, PicoClaw is heavily inspired by [nanobot](https://github.com/HKUDS/nanobot) by HKUDS.

### Forking and Attribution

We strongly encourage the open-source community to fork, modify, and improve OdooClaw! If you fork this project or use its core components in your own work, we kindly request that you:

1. Maintain the attribution to the original creators (Nicolás Ramos / OdooClaw, Sipeed, and HKUDS).
2. Keep the `LICENSE` file intact.
3. Include a visible "Fork Notice" in your project's `README.md` pointing back to this repository, similar to the one at the top of this document.
