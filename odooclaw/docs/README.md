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
- [Browser Copilot + Doodba Setup](BROWSER_COPILOT_DOODBA_SETUP.md): End-to-end setup for pairing flow, per-tab sharing, Chrome/Firefox local testing, plus minimal `prod.yaml` and mount strategy (required vs optional).
- [Browser Extension Distribution](BROWSER_EXTENSION_DISTRIBUTION.md): Internal packaging, dual-browser ZIP artifacts, and store-readiness notes.
- [Doodba Minimal Stack Example](DOODBA_MINIMAL_STACK_EXAMPLE.md): Copy/paste-ready files for `prod.yaml`, env variables, minimal OdooClaw config, and Redis-backed baseline.
- [SQLite Memory Backend](SQLITE_MEMORY.md): Core memory architecture, runtime paths, and retrieval behavior.

### 3. The Odoo MCP Server (`odoo-mcp`)

The core interaction of this agent with Odoo is governed by the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) standard. We provide a modular MCP server (Python) located at `odooclaw/workspace/skills/odoo-mcp`.

#### Why MCP?
MCP is the protocol promoted by Anthropic that standardizes how an LLM discovers and uses external tools. By using MCP, we delegate the responsibility of connecting to Odoo (via JSON-RPC / XML-RPC) to an isolated and secure process, which dynamically injects its tools into the AI model in an agnostic way.

#### Available Capabilities

`odoo-mcp` replaces legacy monolithic access with granular tools and stricter safeguards:

1. **Modular Odoo operations**:
   - Core tools such as `odoo_search`, `odoo_read`, `odoo_create`, `odoo_write`.
   - Safer business actions exposed as explicit tools instead of free-form unrestricted calls.

2. **Permission-aware execution context**:
   - Calls are executed with the invoking user context to preserve Odoo ACLs and record rules.
   - Security controls include denylist/allowlist protections for sensitive models/operations.

3. **Attachment/data workflows**:
   - Attachment handling and structured extraction remain supported through MCP skill composition.

#### Dependencies
The internal MCP server runs a Python process, so it assumes that the container or environment where you run OdooClaw has Python 3 and `pandas` installed if you want to make use of the Excel reading features.

---
For more details on the integration architecture with Discuss, channels, and deployment, check the **Main README** of the repository.
