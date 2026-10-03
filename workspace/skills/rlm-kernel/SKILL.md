---
name: rlm-kernel
description: "RLM (Recursive Language Model) kernel for OdooClaw — persistent Python kernel + context lake + snapshot/restore."
---

# Skill: RLM Kernel

Persistent Python kernel + context lake implementing the RLM paradigm (arXiv:2512.24601) for OdooClaw.

## Capabilities

### 1. Persistent Python Kernel (`ipython`)
Execute Python code in a durable CPython REPL. Variables, imports, functions, and results survive across calls. Supports:
- `%%bash` cells — run shell commands
- `%cd` — change persistent working directory
- Top-level `await`
- Timeout per cell (default 120s)
- Output caps: stdout ≤100KB/cell, repr ≤4K chars

### 2. Context Lake
JSONL-based per-project data store. Data stored here NEVER enters the LLM prompt:
- `rlm_store` — store data with key + optional tags
- `rlm_get` — retrieve by key
- `rlm_search` — regex search
- `rlm_find` — text search
- `rlm_stats` — lake statistics
- `rlm_forget` — cleanup entries

### 3. Snapshot/Restore
Persist kernel namespace to disk (survives compactation/restart):
- `rlm_snapshot` — save namespace
- `rlm_restore` — reload namespace
- `rlm_list_names` — list all variables

## Usage

### When to use RLM

Use RLM when:
- Processing large datasets (use `ipython` to hold data in kernel, not in context)
- Running multi-step analysis (variables persist between calls)
- Storing intermediate results (context lake keeps them out of prompt)

### RLM Strategy

1. **Decompose**: Use `odoo-mcp` tools to fetch records
2. **Process in kernel**: Load data into `ipython`, process with Python
3. **Store results**: Use `rlm_store` to persist findings
4. **Reduce**: Summarize from lake, not from context

### Example

```
# Call 1: Load data
ipython(code="import json; data = json.loads('''[...]'''); print(len(data))")

# Call 2: Process (same kernel, same variables)
ipython(code="filtered = [d for d in data if d['amount'] > 1000]; print(len(filtered))")

# Call 3: Store result
rlm_store(key="filtered_invoices", content=json.dumps(filtered), tags=["invoices", "high-value"])
```

## Configuration

Add to `config.json` under `tools.mcp.servers`:

```json
"rlm-kernel": {
  "enabled": true,
  "command": "python3",
  "args": ["-m", "server"],
  "env": {
    "PYTHONUNBUFFERED": "1",
    "WORKSPACE_PATH": "${ODOOCLAW_WORKSPACE_PATH}",
    "RLM_LAKE_DIR": "${ODOOCLAW_WORKSPACE_PATH}/rlm-lake"
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_PATH` | `~/.odooclaw/workspace` | OdooClaw workspace root |
| `RLM_LAKE_DIR` | `{workspace}/rlm-lake` | Context lake directory |
| `RLM_KERNEL` | Auto-detected | Path to kernel.py |
| `RLM_KERNEL_PYTHON` | `python3` | Python binary for kernel |

## Files

- `server.py` — MCP server (JSON-RPC 2.0 over stdio)
- `kernel.py` — Persistent Python kernel (adapted from rlm-opencode)
