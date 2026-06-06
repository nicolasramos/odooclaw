# configuration Guide for OdooClaw (Odoo Integration)

This document explains how to configure OdooClaw, especially for its integration with Odoo and various AI model providers.

## 1. Initial Setup

OdooClaw uses a JSON configuration file. To get started, copy the example configuration:

```bash
cp config/config.example.json config/config.json
```

The file `config/config.json` is ignored by git to protect your secrets.

## 2. Model Configuration (`model_list`)

OdooClaw supports multiple AI providers. You define them in the `model_list` array.

### OpenAI (Cloud)
```json
{
  "model_name": "gpt-4o",
  "model": "openai/gpt-4o",
  "api_key": "sk-proj-..."
}
```

### Anthropic Claude (Cloud)
```json
{
  "model_name": "claude-3-5-sonnet",
  "model": "anthropic/claude-3-5-sonnet-20240620",
  "api_key": "sk-ant-..."
}
```

### Ollama (Local)
Run models locally using [Ollama](https://ollama.com/).
```json
{
  "model_name": "local-llama",
  "model": "ollama/llama3.1",
  "api_base": "http://localhost:11434/v1"
}
```

### LM Studio / vLLM / MLX (Local / OpenAI Compatible)
If you are running a local server that mimics the OpenAI API:
```json
{
  "model_name": "local-mlx",
  "model": "openai/mlx-community/Meta-Llama-3-8B-Instruct-4bit",
  "api_base": "http://localhost:8000/v1"
}
```

## 3. Selecting the Default Model

In the `agents` section, you specify which model to use by default:

```json
"agents": {
  "defaults": {
    "model_name": "local-mlx",
    "max_tokens": 8192,
    "temperature": 0.7
  }
}
```

The `model_name` must match one of the entries in your `model_list`.

## 4. Odoo Channel Configuration

To enable the integration with Odoo, ensure the `odoo` channel is enabled in the `channels` section:

```json
"channels": {
  "odoo": {
    "enabled": true,
    "webhook_host": "0.0.0.0",
    "webhook_port": 18790,
    "webhook_path": "/webhook/odoo"
  }
}
```

### Environment Variables for Odoo
In your `devel.yaml` or `prod.yaml`, make sure the following environment variables are set so OdooClaw can talk back to Odoo:

- `ODOO_URL`: The URL of your Odoo instance (e.g., `http://odoo:8069`).
- `ODOO_DB`: The name of the database.
- `ODOO_USERNAME`: Dedicated internal user with only the **OdooClaw Delegated RPC** group.
- `ODOO_PASSWORD`: Strong password or API Key for that dedicated user.

Do not use a general-purpose administrator. See [Odoo Technical User for Delegated MCP Access](ODOO_TECHNICAL_USER.md).

## 5. Engram Internal Memory Configuration

Engram can be used as OdooClaw's strategic-memory backend for durable project knowledge such as decisions, bug fixes, discoveries, conventions, and stable preferences.

Keep Engram as an **internal MCP server** so the model cannot call raw `mem_*` tools directly. OdooClaw will expose the controlled `memory_save_strategic` tool instead.

```json
{
  "engram": {
    "enabled": true,
    "mcp_server": "engram"
  },
  "tools": {
    "mcp": {
      "enabled": true,
      "servers": {
        "engram": {
          "enabled": true,
          "command": "engram",
          "args": ["mcp"],
          "exclude_from_auto_register": true
        }
      }
    }
  }
}
```

| Field | Purpose |
| --- | --- |
| `engram.enabled` | Enables OdooClaw's strategic-memory integration. |
| `engram.mcp_server` | MCP server name used by the internal Engram client. Defaults to `engram`. |
| `tools.mcp.servers.engram` | Starts `engram mcp` as a normal MCP server connection. |
| `exclude_from_auto_register` | Keeps raw Engram MCP tools internal instead of exposing them to the AI model. |

Environment overrides:

- `ODOOCLAW_ENGRAM_ENABLED=true`
- `ODOOCLAW_ENGRAM_MCP_SERVER=engram`

Docker/Doodba deployments must also make the `engram` binary available inside the OdooClaw container. See [Engram Internal Memory in Docker/Doodba](ENGRAM_DOCKER_DOODBA.md) for a pinned release-binary installation pattern with checksum verification.

## 6. Advanced: Model Routing

You can override the model for specific agents or purposes by adding more specific configurations in the `agents` section (see `config.example.json` for details).
