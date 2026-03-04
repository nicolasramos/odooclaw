# OdooClaw Architecture

OdooClaw builds upon the lightweight foundation of PicoClaw, transforming it into a robust, concurrent AI Gateway specifically tailored for Odoo ERP integration.

## Core Architecture

OdooClaw follows a modular, event-driven architecture designed to minimize latency and resource consumption:

```mermaid
graph TD
    subgraph Odoo ERP
        A[Odoo Discuss] -->|Webhook POST| B(Gateway HTTP)
        F(XML-RPC API) <--|Data / Actions| E
    end

    subgraph OdooClaw (Go Binary)
        B -->|Event| C{Message Bus}
        C -->|Dispatch| D[Agent Router]
        D -->|Invoke| E[LLM Provider]
        
        E -->|Tool Call| G[MCP Server]
        G -->|server.py| F
    end
```

### 1. The Gateway (`pkg/channels/odoo`)
The Gateway is a lightweight HTTP server (using standard `net/http`) that listens on a designated port (e.g., `18790`). When a user mentions the bot in Odoo, Odoo sends an asynchronous, non-blocking HTTP POST request containing the message payload. 
The Gateway maps the Odoo `author_id` and `res_id` to internal OdooClaw session identifiers to ensure context isolation.

### 2. The Message Bus (`pkg/bus`)
To prevent the HTTP handler from blocking (which could lead to webhook timeouts in Odoo), the Gateway immediately pushes the incoming message to an internal Go Channel (Event Bus) and returns a `200 OK`. 
A pool of worker goroutines consumes these events, routing them to the appropriate AI Agent.

### 3. The Agent Router (`pkg/agent`)
The Agent handles the lifecycle of a conversation. It retrieves the chat history from the local SQLite/Vector memory, formulates the prompt by appending the workspace directives (`AGENTS.md`, `SOUL.md`), and sends the payload to the LLM Provider.

### 4. LLM Providers (`pkg/providers`)
An abstraction layer that standardizes requests across various backends (OpenAI, Anthropic, Gemini, DeepSeek, vLLM). It handles streaming, tool-calling capabilities, and token limitations transparently.

### 5. Model Context Protocol (MCP) Server
OdooClaw implements Anthropic's MCP standard. Instead of hardcoding Odoo logic into the Go binary, OdooClaw spawns a lightweight Python process (`workspace/skills/odoo-manager/server.py`).
- The LLM requests to execute an action (e.g., `search_read`).
- OdooClaw passes this via `stdio` to the Python process.
- The Python process uses `xmlrpc.client` to communicate with Odoo, returning the JSON result back to the LLM.

## Memory Management

Because an ERP deals with distinct, isolated records (Invoices, Leads, Tasks), OdooClaw strictly separates conversation memory based on the Odoo Model and Record ID (`model` + `res_id`).
This prevents the AI from mixing up the context of "Invoice 15" with the context of "Lead 302", even if the same user is chatting with it.

## Concurrency and Performance
By utilizing Go's lightweight Goroutines, OdooClaw can handle hundreds of simultaneous Odoo users chatting with the bot, all while keeping the memory footprint under `10MB`.