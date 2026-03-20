import sys
import os
import json
import math
import uuid
from datetime import datetime

# RLM Utils MCP Server for OdooClaw
# Corrected for full JSON-RPC 2.0 / MCP compatibility


def log(msg):
    sys.stderr.write(f"[rlm-utils] {msg}\n")
    sys.stderr.flush()


def _ok(text):
    return {"isError": False, "content": [{"type": "text", "text": text}]}


def _err(text):
    return {"isError": True, "content": [{"type": "text", "text": text}]}


def get_workspace_tmp():
    # Priority: Env Var -> Home default -> /tmp
    workspace = os.environ.get("WORKSPACE_PATH")
    if not workspace:
        home = os.path.expanduser("~")
        workspace = os.path.join(home, ".odooclaw", "workspace")

    tmp_path = os.path.join(workspace, "tmp", "rlm")
    try:
        os.makedirs(tmp_path, exist_ok=True)
    except:
        # Extreme fallback for restricted environments
        tmp_path = "/tmp/rlm"
        os.makedirs(tmp_path, exist_ok=True)
    return tmp_path


def rlm_partition(data_payload, chunk_size=10, prefix=None):
    data = data_payload
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception as e:
            return _err(f"Invalid JSON data: {str(e)}")

    if not isinstance(data, list):
        return _err(
            f"Data must be a list of records to partition. Received: {type(data)}"
        )

    try:
        chunk_size = int(chunk_size)
    except Exception:
        chunk_size = 10
    if chunk_size <= 0:
        chunk_size = 10

    if not prefix:
        prefix = f"chunk_{uuid.uuid4().hex[:8]}"

    tmp_dir = get_workspace_tmp()
    total_records = len(data)
    num_chunks = math.ceil(total_records / chunk_size)

    file_paths = []
    for i in range(num_chunks):
        start = i * chunk_size
        end = min((i + 1) * chunk_size, total_records)
        chunk = data[start:end]

        filename = f"{prefix}_{i + 1}.json"
        full_path = os.path.join(tmp_dir, filename)

        with open(full_path, "w", encoding="utf-8") as f:
            json.dump(chunk, f, indent=2, ensure_ascii=False)

        file_paths.append(full_path)

    log(f"Partitioned {total_records} records into {num_chunks} chunks.")
    payload = {
        "total_records": total_records,
        "chunk_size": chunk_size,
        "num_chunks": num_chunks,
        "file_paths": file_paths,
    }
    return _ok(
        "Successfully partitioned records for recursive processing.\n"
        + json.dumps(payload, ensure_ascii=False)
    )


def rlm_aggregate(file_paths, aggregation_type="list"):
    if not isinstance(file_paths, list) or not file_paths:
        return _err("'file_paths' must be a non-empty list of absolute paths")

    results = []
    for path in file_paths:
        if not os.path.exists(path):
            log(f"Warning: File not found: {path}")
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = json.load(f)
                if isinstance(content, list):
                    results.extend(content)
                else:
                    results.append(content)
        except Exception as e:
            log(f"Error reading {path}: {str(e)}")

    if aggregation_type == "sum":
        total = 0.0
        for item in results:
            if isinstance(item, (int, float)):
                total += float(item)
            elif isinstance(item, dict):
                # Look for 'sum', 'total', 'amount', or the first numeric value
                val = (
                    item.get("sum")
                    or item.get("total")
                    or item.get("amount")
                    or item.get("value")
                )
                if val is not None:
                    try:
                        total += float(val)
                    except:
                        pass
                else:
                    # Fallback: take the first numeric value in the dict
                    for k, v in item.items():
                        try:
                            total += float(v)
                            break
                        except:
                            continue
            elif str(item).replace(".", "", 1).isdigit():
                total += float(item)

        return _ok(f"Total sum: {total} (from {len(results)} records)")

    return _ok(
        "Aggregated results from recursive chunks.\n"
        + json.dumps(
            {
                "aggregated_count": len(results),
                "shared_folder": get_workspace_tmp(),
                "data_preview": str(results)[:500],
            },
            ensure_ascii=False,
        )
    )


def list_tools():
    return [
        {
            "name": "rlm_partition",
            "description": "[RLM] Divide a large list of Odoo records into smaller JSON files in the workspace. Use this to avoid context window flooding or context rot. After partitioning, launch sub-agents with 'spawn' or 'subagent' tool to process each chunk individually.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "data": {
                        "type": "array",
                        "items": {"type": "object"},
                        "description": "The list of records/data to partition (list of dicts or strings).",
                    },
                    "chunk_size": {
                        "type": "integer",
                        "description": "Number of records per file (default: 10).",
                        "default": 10,
                    },
                    "prefix": {
                        "type": "string",
                        "description": "Filename prefix for generated chunks.",
                    },
                },
                "required": ["data"],
            },
        },
        {
            "name": "rlm_aggregate",
            "description": "[RLM] Combine results from multiple chunk files into a single report or list. Use this at the end of a recursive process ('Reduce' step).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "file_paths": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of absolute paths to result files.",
                    },
                    "aggregation_type": {
                        "type": "string",
                        "enum": ["list", "sum"],
                        "description": "How to combine the values (default: list).",
                    },
                },
                "required": ["file_paths"],
            },
        },
    ]


def handle_request(req):
    method = req.get("method")
    req_id = req.get("id")
    params = req.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "rlm-utils", "version": "1.0.0"},
            },
        }

    elif method == "notifications/initialized":
        return None

    elif method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": list_tools()}}

    elif method == "tools/call":
        name = params.get("name")
        args = params.get("arguments", {})

        if name == "rlm_partition":
            res = rlm_partition(
                args.get("data"), args.get("chunk_size", 10), args.get("prefix")
            )
        elif name == "rlm_aggregate":
            res = rlm_aggregate(
                args.get("file_paths", []), args.get("aggregation_type", "list")
            )
        else:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Unknown tool: {name}"},
            }

        return {"jsonrpc": "2.0", "id": req_id, "result": res}

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Unknown method: {method}"},
    }


if __name__ == "__main__":
    log("RLM Utils MCP server started")
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            req = json.loads(line)
            resp = handle_request(req)
            if resp is not None:
                sys.stdout.write(json.dumps(resp) + "\n")
                sys.stdout.flush()
        except Exception as e:
            log(f"Error: {str(e)}")
