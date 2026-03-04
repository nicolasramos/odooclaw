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
- ⚡ **Asynchronous & Non-Blocking**: Odoo ↔ OdooClaw communication relies on Webhooks ("Fire & Forget"), releasing Odoo workers instantly.
- 🧠 **Segregated Context**: AI memory is independent per channel/user. It doesn't mix private information.
- 🤖 **Integrated MCP Server**: Uses the industry standard Model Context Protocol (MCP) via an embedded Python server, providing the LLM with the `odoo-manager` tool (full access to the XML-RPC API) and `odoo-read-excel-attachment` (automatic parsing of Excel/CSV attachments in Odoo using Pandas).
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
You can execute queries directly in the terminal by entering the container:

```bash
docker-compose exec odooclaw sh

# Test the Odoo skill from the terminal
odooclaw agent -m "Tell me what Odoo version is running and verify the connection"
odooclaw agent -m "List the first 5 contacts (res.partner) in the database"
```

<img src="odooclaw/assets/screenshots/odooclaw_termina.png" alt="OdooClaw Terminal" width="800">

---

## 🛠️ MCP Server and Skills

One of the most advanced features of OdooClaw is its use of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). We include an MCP server (`odoo-manager/server.py`) that exposes vital tools to the AI:

1. **`odoo-manager`**: A complete wrapper around the Odoo `xmlrpc.client` API. It allows the AI to perform complex database operations (`search_read`, `create`, `write`, `unlink`, executing model methods, etc.).
2. **`odoo-read-excel-attachment`**: When a user uploads or mentions an Excel/CSV attachment in an Odoo thread, the AI can automatically download the binary (`ir.attachment`), read it into memory using **Pandas**, and process its JSON rows to answer complex queries or import data.

By relying on the MCP standard, this server runs isolated and dynamically injects its capabilities into the LLM on every interaction.

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
- [General Troubleshooting](odooclaw/docs/troubleshooting.md)
- [Antigravity Auth and Usage](odooclaw/docs/ANTIGRAVITY_USAGE.md)

Furthermore, OdooClaw retains the ability to integrate with **Telegram, Discord, WhatsApp, and WeCom**. Check the documentation in `docs/channels/` to enable them alongside Odoo.

---

## ⚖️ License and Credits

This project is distributed under the **MIT** license.

- It is a deeply adapted **fork** of [PicoClaw](https://github.com/sipeed/picoclaw) by Sipeed.
- In turn, PicoClaw is heavily inspired by [nanobot](https://github.com/HKUDS/nanobot) by HKUDS.
- The integration and the native Odoo module have been developed by the **OdooClaw** contributors.

### Forking and Attribution

We strongly encourage the open-source community to fork, modify, and improve OdooClaw! If you fork this project or use its core components in your own work, we kindly request that you:

1. Maintain the attribution to the original creators (OdooClaw, Sipeed, and HKUDS).
2. Keep the `LICENSE` file intact.
3. Include a visible "Fork Notice" in your project's `README.md` pointing back to this repository, similar to the one at the top of this document.
