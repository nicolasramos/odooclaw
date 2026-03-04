import sys
import os
import json
import base64
import time

# Odoo JSON-RPC Skill Bridge for OdooClaw (MCP stdio protocol)
# Uses requests.Session for persistent auth (cookie reuse = much faster than XML-RPC)

try:
    import requests
except ImportError:
    sys.stderr.write("[odoo-mcp] ERROR: 'requests' library not found. Install with: pip install requests\n")
    sys.exit(1)


# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────

def log(msg):
    sys.stderr.write(f"[odoo-mcp] {msg}\n")
    sys.stderr.flush()


# ──────────────────────────────────────────────
# Session singleton (reused across all calls)
# ──────────────────────────────────────────────

class OdooSession:
    """
    Persistent JSON-RPC session to Odoo.
    Authentication is done once; the session cookie is reused for all
    subsequent calls, eliminating per-call auth overhead.
    """

    def __init__(self):
        self._session: requests.Session | None = None
        self._url: str | None = None
        self._db: str | None = None
        self._uid: int | None = None
        self._last_env: tuple | None = None   # (url, db, username, password)

    # ── Configuration ────────────────────────

    def _env(self):
        url = os.environ.get("ODOO_URL", "").rstrip("/")
        db  = os.environ.get("ODOO_DB", "")
        usr = os.environ.get("ODOO_USERNAME", "")
        pwd = os.environ.get("ODOO_PASSWORD", "")
        return url, db, usr, pwd

    def _env_changed(self):
        return self._env() != self._last_env

    # ── Authentication ───────────────────────

    def authenticate(self):
        url, db, username, password = self._env()
        if not all([url, db, username, password]):
            return {"isError": True, "content": "Missing Odoo credentials (ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD)"}

        self._session = requests.Session()
        self._session.headers.update({"Content-Type": "application/json"})

        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "id": 1,
            "params": {
                "db": db,
                "login": username,
                "password": password,
            }
        }

        try:
            t0 = time.monotonic()
            resp = self._session.post(f"{url}/web/session/authenticate", json=payload, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            ms = int((time.monotonic() - t0) * 1000)

            if data.get("error"):
                err = data["error"]
                return {"isError": True, "content": f"Auth error: {err.get('message', 'unknown')}"}

            result = data.get("result", {})
            uid = result.get("uid")
            if not uid:
                return {"isError": True, "content": "Authentication failed: invalid credentials or database"}

            self._url = url
            self._db  = db
            self._uid = uid
            self._last_env = (url, db, username, password)
            log(f"Authenticated via JSON-RPC in {ms}ms (uid={uid}, db={db})")
            return None  # no error

        except requests.exceptions.RequestException as e:
            return {"isError": True, "content": f"Connection error: {str(e)}"}

    def _ensure_session(self):
        """Re-authenticate if env changed or session is missing."""
        if self._session is None or self._env_changed():
            return self.authenticate()
        return None

    # ── Core RPC call ────────────────────────

    def call_kw(self, model: str, method: str, args: list, kwargs: dict):
        err = self._ensure_session()
        if err:
            return err

        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "id": 2,
            "params": {
                "model": model,
                "method": method,
                "args": args,
                "kwargs": kwargs,
            }
        }

        try:
            t0 = time.monotonic()
            resp = self._session.post(
                f"{self._url}/web/dataset/call_kw",
                json=payload,
                timeout=30
            )
            resp.raise_for_status()
            ms = int((time.monotonic() - t0) * 1000)
            data = resp.json()

            if data.get("error"):
                err_info = data["error"]
                # Handle session expiry → re-auth and retry once
                if err_info.get("code") == 100:  # session_invalid
                    log("Session expired, re-authenticating...")
                    self._session = None
                    auth_err = self._ensure_session()
                    if auth_err:
                        return auth_err
                    return self.call_kw(model, method, args, kwargs)  # retry

                msg = err_info.get("data", {}).get("message") or err_info.get("message", "Unknown error")
                return {"isError": True, "content": f"Odoo error: {msg}"}

            result = data.get("result")
            log(f"call_kw {model}.{method} → {ms}ms")
            return {
                "content": json.dumps(result, ensure_ascii=False, default=str)
                if isinstance(result, (list, dict))
                else str(result)
            }

        except requests.exceptions.RequestException as e:
            # Network error → reset session
            self._session = None
            return {"isError": True, "content": f"Network error: {str(e)}"}

    # ── Convenience: read Excel attachment ──

    def read_excel_attachment(self, attachment_id: int):
        try:
            import pandas as pd
            import io
        except ImportError:
            return {"isError": True, "content": "pandas is not installed in the MCP environment"}

        res = self.call_kw(
            "ir.attachment", "search_read",
            [[["id", "=", attachment_id]]],
            {"fields": ["datas", "name"]}
        )
        if res.get("isError"):
            return res

        records = json.loads(res["content"])
        if not records:
            return {"isError": True, "content": f"Attachment ID {attachment_id} not found"}

        file_data = base64.b64decode(records[0]["datas"])
        file_name = records[0]["name"].lower()

        try:
            if file_name.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(file_data))
            else:
                df = pd.read_excel(io.BytesIO(file_data))
            return {"content": json.dumps(df.to_dict(orient="records"), ensure_ascii=False)}
        except Exception as e:
            return {"isError": True, "content": f"Failed to parse file: {str(e)}"}


# ──────────────────────────────────────────────
# Global session (one per MCP server process)
# ──────────────────────────────────────────────

odoo = OdooSession()


# ──────────────────────────────────────────────
# MCP stdio message loop
# ──────────────────────────────────────────────

def build_tools():
    """Build tool definitions with current date injected so the LLM always knows today."""
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    today_str = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")  # Monday
    week_end = today_str

    return [
        {
            "name": "odoo-manager",
            "description": (
                f"Execute any Odoo 18 ORM operation via JSON-RPC. "
                f"Supports search, search_read, search_count, read, create, write, unlink "
                f"and workflow actions (action_confirm, action_post, button_validate, etc.) "
                f"on ANY Odoo model. Always search for the numeric ID first before calling actions. "
                f"IMPORTANT — Current date context: today={today_str} UTC, "
                f"current week starts on {week_start} (Monday) and ends on {week_end}. "
                f"Use these dates when the user asks about 'this week', 'today', 'this month', etc. "
                f"DOMAIN goes in 'args' as the first element: args=[[filters]], NOT in kwargs."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "model":  {"type": "string",  "description": "Odoo model, e.g. 'sale.order'"},
                    "method": {"type": "string",  "description": "ORM method, e.g. 'search_count'"},
                    "args":   {"type": "array",   "description": "Positional args. For search/search_count/search_read: args=[[domain_filters]]"},
                    "kwargs": {"type": "object",  "description": "Keyword args: fields, limit, offset, order. Do NOT put domain here."}
                },
                "required": ["model", "method"]
            }
        },
        {
            "name": "odoo-read-excel-attachment",
            "description": (
                "Read an Excel or CSV file from an Odoo ir.attachment by its ID. "
                "Returns the file contents as a JSON array of row objects. "
                "Use this when the user uploads a spreadsheet and you need to analyze or import it."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "attachment_id": {"type": "integer", "description": "The Odoo ir.attachment record ID"}
                },
                "required": ["attachment_id"]
            }
        }
    ]


def handle_request(request: dict) -> dict | None:
    method  = request.get("method")
    req_id  = request.get("id")
    result  = None

    if method == "initialize":
        result = {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "odoo-mcp", "version": "2.0.0"}
        }

    elif method == "tools/list":
        result = {"tools": build_tools()}

    elif method == "tools/call":
        params    = request.get("params", {})
        tool_name = params.get("name")
        tool_args = params.get("arguments", {})

        if tool_name == "odoo-manager":
            model  = tool_args.get("model")
            meth   = tool_args.get("method")
            args   = tool_args.get("args")
            kwargs = tool_args.get("kwargs")

            if not model or not meth:
                res = {"isError": True, "content": "'model' and 'method' are required"}
            else:
                # Normalize types
                if args is not None and not isinstance(args, list):
                    log(f"Warning: 'args' is {type(args).__name__}, wrapping in list")
                    args = [args]
                if kwargs is not None and not isinstance(kwargs, dict):
                    log(f"Warning: 'kwargs' is {type(kwargs).__name__}, ignoring")
                    kwargs = {}

                log(f"Tool call → model={model}, method={meth}, args={str(args)[:80]}, kwargs={str(kwargs)[:80]}")
                
                # Auto-fix: some models put 'domain' inside kwargs instead of args.
                # For search/search_count/search_read, move it to args automatically.
                if kwargs and "domain" in kwargs and meth in ("search", "search_count", "search_read"):
                    domain = kwargs.pop("domain")
                    if not args:
                        args = [domain]
                    elif isinstance(args, list) and (len(args) == 0 or not isinstance(args[0], list)):
                        args = [domain] + args
                    log(f"Auto-fixed: moved 'domain' from kwargs to args for {meth}")

                # Auto-fix: search() doesn't accept 'fields' — upgrade to search_read()
                if meth == "search" and kwargs and "fields" in kwargs:
                    log("Auto-fixed: search() with 'fields' → search_read()")
                    meth = "search_read"

                # Auto-fix: write() with 'values' in kwargs → move to args.
                # Correct ORM signature: write([[ids], {values}])
                if meth == "write" and kwargs and "values" in kwargs:
                    values = kwargs.pop("values")
                    if isinstance(args, list) and len(args) == 1:
                        args = [args[0], values]
                    log("Auto-fixed: write() 'values' from kwargs → args")

                # Auto-fix: read() doesn't accept 'limit' — remove it silently.
                if meth == "read" and kwargs and "limit" in kwargs:
                    kwargs.pop("limit")
                    log("Auto-fixed: removed unsupported 'limit' from read()")

                res = odoo.call_kw(model, meth, args or [], kwargs or {})


        elif tool_name == "odoo-read-excel-attachment":
            res = odoo.read_excel_attachment(tool_args.get("attachment_id"))

        else:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}
            }

        result = {
            "content": [{"type": "text", "text": res.get("content", "")}],
            "isError": res.get("isError", False)
        }

    elif method == "notifications/initialized":
        return None  # no response needed

    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Unknown method: {method}"}
        }

    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def main():
    log("Odoo MCP server v2.0 started (JSON-RPC mode)")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request  = json.loads(line)
            response = handle_request(request)
            if response is not None:
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()
        except json.JSONDecodeError as e:
            log(f"Invalid JSON received: {e}")
        except Exception as e:
            log(f"Unhandled error: {e}")
            # Keep the server alive; don't crash on single message errors


if __name__ == "__main__":
    main()
