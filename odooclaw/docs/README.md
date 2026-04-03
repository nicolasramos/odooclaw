# OdooClaw AI Documentation

OdooClaw is a specialized version of PicoClaw, tailored for integration with **Odoo ERP**. In this directory, you will find technical documentation, configuration manuals, and usage guides for the system.

## Documentation Index

### 1. Core Configuration
 - [General Configuration (JSON)](CONFIGURATION.md): Detailed structure of the `config.json` file.
 - [Guia completa Doodba (ES)](GUIA_DOODBA_PUESTA_EN_MARCHA_ES.md): Instalacion, configuracion, uso y cambios de `config.json` paso a paso.
 - [Complete Doodba Guide (EN)](GUIDE_DOODBA_SETUP_EN.md): Installation, configuration, usage and `config.json` changes step by step.
 - [Tools Configuration](tools_configuration.md): How to configure web search, cron jobs, etc.

### 2. Integration & Support
- [General Troubleshooting](troubleshooting.md): Answers to common issues.
- [Antigravity Usage and Authentication](ANTIGRAVITY_USAGE.md): Integration with the Antigravity cloud.
- [Browser Copilot + Doodba Setup](BROWSER_COPILOT_DOODBA_SETUP.md): End-to-end setup for pairing flow, per-tab sharing, and Chrome/Firefox local testing.
- [Browser Extension Distribution](BROWSER_EXTENSION_DISTRIBUTION.md): Internal packaging, dual-browser ZIP artifacts, and store-readiness notes.
- [SQLite Memory Backend](SQLITE_MEMORY.md): Core memory architecture, runtime paths, and retrieval behavior.

### 3. The Odoo MCP Server (`odoo-manager`)

The core interaction of this agent with Odoo is governed by the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) standard. We have developed an MCP server (written in Python) located at `odooclaw/workspace/skills/odoo-manager/server.py`.

#### Why MCP?
MCP is the protocol promoted by Anthropic that standardizes how an LLM discovers and uses external tools. By using MCP, we delegate the responsibility of connecting to Odoo (via JSON-RPC / XML-RPC) to an isolated and secure process, which dynamically injects its tools into the AI model in an agnostic way.

#### Available Tools

The server automatically exposes two powerful tools to your language model:

1. **`odoo-manager`**:
   - Acts as a universal bridge to the Odoo JSON-RPC / XML-RPC backend.
   - **Schema:** Takes parameters such as `model`, `method`, `args`, and `kwargs`.
   - **Usage:** The LLM can use it to call `execute_kw` and perform `search_read`, `create`, `write`, or execute any method exposed on Odoo models.

2. **`odoo-read-excel-attachment`**:
   - A key tool for data analysis.
   - **Schema:** Receives an `attachment_id`.
   - **Usage:** Downloads the attachment file from `ir.attachment` in Odoo, decodes the Base64, and uses **Pandas** to convert Excel or CSV files into JSON that the AI can interpret and analyze for the user in the chat.

#### Dependencies
The internal MCP server runs a Python process, so it assumes that the container or environment where you run OdooClaw has Python 3 and `pandas` installed if you want to make use of the Excel reading features.

---
For more details on the integration architecture with Discuss, channels, and deployment, check the **Main README** of the repository.
