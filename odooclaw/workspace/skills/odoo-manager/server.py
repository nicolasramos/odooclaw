import sys
import os
import json
import base64
import time
import ast
from typing import Optional

# Odoo JSON-RPC Skill Bridge for OdooClaw (MCP stdio protocol)
# Uses requests.Session for persistent auth (cookie reuse = much faster than XML-RPC)

try:
    import requests
except ImportError:
    sys.stderr.write(
        "[odoo-mcp] ERROR: 'requests' library not found. Install with: pip install requests\n"
    )
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
        self._last_env: tuple | None = None  # (url, db, username, password)

    # ── Configuration ────────────────────────

    def _env(self):
        url = os.environ.get("ODOO_URL", "").rstrip("/")
        db = os.environ.get("ODOO_DB", "")
        usr = os.environ.get("ODOO_USERNAME", "")
        pwd = os.environ.get("ODOO_PASSWORD", "")
        return url, db, usr, pwd

    def _env_changed(self):
        return self._env() != self._last_env

    # ── Authentication ───────────────────────

    def authenticate(self):
        url, db, username, password = self._env()
        if not all([url, db, username, password]):
            return {
                "isError": True,
                "content": "Missing Odoo credentials (ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD)",
            }

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
            },
        }

        try:
            t0 = time.monotonic()
            resp = self._session.post(
                f"{url}/web/session/authenticate", json=payload, timeout=15
            )
            resp.raise_for_status()
            data = resp.json()
            ms = int((time.monotonic() - t0) * 1000)

            if data.get("error"):
                err = data["error"]
                return {
                    "isError": True,
                    "content": f"Auth error: {err.get('message', 'unknown')}",
                }

            result = data.get("result", {})
            uid = result.get("uid")
            if not uid:
                return {
                    "isError": True,
                    "content": "Authentication failed: invalid credentials or database",
                }

            self._url = url
            self._db = db
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

    def call_kw(
        self,
        model: str,
        method: str,
        args: list,
        kwargs: dict,
        sender_id: int = None,
        rpc_context: Optional[dict] = None,
    ):
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
            },
        }

        endpoint = "/web/dataset/call_kw"
        if sender_id is not None:
            endpoint = "/odooclaw/call_kw_as_user"
            payload["params"]["user_id"] = sender_id
            if rpc_context:
                payload["params"]["context"] = rpc_context

        try:
            t0 = time.monotonic()
            resp = self._session.post(
                f"{self._url}{endpoint}", json=payload, timeout=30
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

                msg = err_info.get("data", {}).get("message") or err_info.get(
                    "message", "Unknown error"
                )
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
            return {
                "isError": True,
                "content": "pandas is not installed in the MCP environment",
            }

        res = self.call_kw(
            "ir.attachment",
            "search_read",
            [[["id", "=", attachment_id]]],
            {"fields": ["datas", "name"]},
        )
        if res.get("isError"):
            return res

        records = json.loads(res["content"])
        if not records:
            return {
                "isError": True,
                "content": f"Attachment ID {attachment_id} not found",
            }

        file_data = base64.b64decode(records[0]["datas"])
        file_name = records[0]["name"].lower()

        try:
            if file_name.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(file_data))
            else:
                df = pd.read_excel(io.BytesIO(file_data))
            return {
                "content": json.dumps(df.to_dict(orient="records"), ensure_ascii=False)
            }
        except Exception as e:
            return {"isError": True, "content": f"Failed to parse file: {str(e)}"}

    def _get_default_account(
        self,
        acc_type="expense",
        sender_id: int = None,
        rpc_context: Optional[dict] = None,
    ):
        types = (
            ["expense", "expense_direct_cost"]
            if acc_type == "expense"
            else ["income", "income_other"]
        )
        fallback_code = "6%" if acc_type == "expense" else "7%"
        res = self.call_kw(
            "account.account",
            "search_read",
            [[["account_type", "in", types]]],
            {"fields": ["id"], "limit": 1},
            sender_id=sender_id,
            rpc_context=rpc_context,
        )
        if (
            res.get("isError")
            or res.get("content") == "[]"
            or "account_type" in res.get("content", "")
        ):
            res = self.call_kw(
                "account.account",
                "search_read",
                [[["code", "=like", fallback_code]]],
                {"fields": ["id"], "limit": 1},
                sender_id=sender_id,
                rpc_context=rpc_context,
            )
        if not res.get("isError") and res.get("content") != "[]":
            try:
                return json.loads(res["content"])[0]["id"]
            except:
                pass
        return None

    # ── Convenience: create vendor invoice ──

    def create_vendor_invoice(
        self,
        partner_name: str,
        invoice_date: str,
        ref: str,
        lines: list,
        vat: str = None,
        invoice_date_due: str = None,
        currency_name: str = None,
        sender_id: int = None,
        rpc_context: Optional[dict] = None,
    ):
        try:
            # 0. Find currency
            currency_id = None
            if currency_name:
                curr_res = self.call_kw(
                    "res.currency",
                    "search_read",
                    [[["name", "ilike", currency_name]]],
                    {"fields": ["id"], "limit": 1},
                    sender_id=sender_id,
                )
                if not curr_res.get("isError") and curr_res.get("content") != "[]":
                    currency_id = json.loads(curr_res["content"])[0]["id"]

            # 1. Find or create Partner
            partner_id = None
            if vat:
                res = self.call_kw(
                    "res.partner",
                    "search_read",
                    [[["vat", "=", vat]]],
                    {"fields": ["id"], "limit": 1},
                    sender_id=sender_id,
                )
                if not res.get("isError") and res.get("content") != "[]":
                    partner_id = json.loads(res["content"])[0]["id"]

            if not partner_id:
                res = self.call_kw(
                    "res.partner",
                    "search_read",
                    [[["name", "ilike", partner_name]]],
                    {"fields": ["id"], "limit": 1},
                    sender_id=sender_id,
                )
                if not res.get("isError") and res.get("content") != "[]":
                    partner_id = json.loads(res["content"])[0]["id"]
                else:
                    # Create partner
                    create_res = self.call_kw(
                        "res.partner",
                        "create",
                        [
                            {
                                "name": partner_name,
                                "is_company": True,
                                "vat": vat,
                                "supplier_rank": 1,
                            }
                        ],
                        {},
                        sender_id=sender_id,
                    )
                    if create_res.get("isError"):
                        return create_res
                    partner_id = json.loads(create_res["content"])

            # 2. Get default expense account
            account_id = self._get_default_account(
                "expense", sender_id=sender_id, rpc_context=rpc_context
            )

            # 3. Process lines, products and taxes
            invoice_lines = []
            for line in lines:
                product_name = line.get("name", "Item")

                # Find or create product
                product_id = None
                prod_res = self.call_kw(
                    "product.product",
                    "search_read",
                    [[["name", "ilike", product_name]]],
                    {"fields": ["id"], "limit": 1},
                    sender_id=sender_id,
                )
                if not prod_res.get("isError") and prod_res.get("content") != "[]":
                    product_id = json.loads(prod_res["content"])[0]["id"]
                else:
                    # Create generic consumable product to allow receipts if needed later, and to show up on invoice
                    create_prod_res = self.call_kw(
                        "product.product",
                        "create",
                        [{"name": product_name, "type": "consu", "purchase_ok": True}],
                        {},
                        sender_id=sender_id,
                    )
                    if not create_prod_res.get("isError"):
                        product_id = json.loads(create_prod_res["content"])

                line_dict = {
                    "name": product_name,
                    "quantity": float(line.get("quantity", 1)),
                    "price_unit": float(line.get("price_unit", 0.0)),
                }
                if product_id:
                    line_dict["product_id"] = product_id
                if account_id:
                    line_dict["account_id"] = account_id

                tax_pct = line.get("tax_percentage")
                if tax_pct is not None:
                    # search for tax (purchase type)
                    tax_res = self.call_kw(
                        "account.tax",
                        "search_read",
                        [
                            [
                                ["type_tax_use", "=", "purchase"],
                                ["amount", "=", float(tax_pct)],
                            ]
                        ],
                        {"fields": ["id"], "limit": 1},
                        sender_id=sender_id,
                    )
                    if not tax_res.get("isError") and tax_res.get("content") != "[]":
                        try:
                            tax_id = json.loads(tax_res["content"])[0]["id"]
                            line_dict["tax_ids"] = [[6, 0, [tax_id]]]
                        except:
                            pass

                invoice_lines.append([0, 0, line_dict])

            # 4. Create Account Move
            move_vals = {
                "move_type": "in_invoice",
                "partner_id": partner_id,
                "invoice_date": invoice_date,
                "ref": ref or "N/A",
                "invoice_line_ids": invoice_lines,
            }
            if currency_id:
                move_vals["currency_id"] = currency_id
            if invoice_date_due:
                move_vals["invoice_date_due"] = invoice_date_due

            create_move_res = self.call_kw(
                "account.move", "create", [move_vals], {}, sender_id=sender_id
            )
            if create_move_res.get("isError"):
                return create_move_res

            created_id = json.loads(create_move_res["content"])
            return {"content": f"Vendor bill created successfully. ID: {created_id}"}
        except Exception as e:
            return {"isError": True, "content": f"Tool error: {str(e)}"}

    # ── Convenience: create purchase order ──

    def create_purchase_order(
        self,
        partner_name: str,
        date_order: str,
        lines: list,
        vat: str = None,
        partner_ref: str = None,
        currency_name: str = None,
        sender_id: int = None,
    ):
        try:
            # 0. Find currency
            currency_id = None
            if currency_name:
                curr_res = self.call_kw(
                    "res.currency",
                    "search_read",
                    [[["name", "ilike", currency_name]]],
                    {"fields": ["id"], "limit": 1},
                    sender_id=sender_id,
                )
                if not curr_res.get("isError") and curr_res.get("content") != "[]":
                    currency_id = json.loads(curr_res["content"])[0]["id"]
                curr_res = self.call_kw(
                    "res.currency",
                    "search_read",
                    [[["name", "ilike", currency_name]]],
                    {"fields": ["id"], "limit": 1},
                )
                if not curr_res.get("isError") and curr_res.get("content") != "[]":
                    currency_id = json.loads(curr_res["content"])[0]["id"]

            # 1. Find or create Partner
            partner_id = None
            if vat:
                res = self.call_kw(
                    "res.partner",
                    "search_read",
                    [[["vat", "=", vat]]],
                    {"fields": ["id"], "limit": 1},
                )
                if not res.get("isError") and res.get("content") != "[]":
                    partner_id = json.loads(res["content"])[0]["id"]

            if not partner_id:
                res = self.call_kw(
                    "res.partner",
                    "search_read",
                    [[["name", "ilike", partner_name]]],
                    {"fields": ["id"], "limit": 1},
                )
                if not res.get("isError") and res.get("content") != "[]":
                    partner_id = json.loads(res["content"])[0]["id"]
                else:
                    # Create partner
                    create_res = self.call_kw(
                        "res.partner",
                        "create",
                        [
                            {
                                "name": partner_name,
                                "is_company": True,
                                "vat": vat,
                                "supplier_rank": 1,
                            }
                        ],
                        {},
                    )
                    if create_res.get("isError"):
                        return create_res
                    partner_id = json.loads(create_res["content"])

            # 2. Process lines (finding or creating products) and taxes
            order_lines = []
            for line in lines:
                product_name = line.get("name", "Item")
                qty = float(line.get("quantity", 1))
                price = float(line.get("price_unit", 0.0))

                # Find or create product
                product_id = None
                prod_res = self.call_kw(
                    "product.product",
                    "search_read",
                    [[["name", "ilike", product_name]]],
                    {"fields": ["id"], "limit": 1},
                )
                if not prod_res.get("isError") and prod_res.get("content") != "[]":
                    product_id = json.loads(prod_res["content"])[0]["id"]
                else:
                    # Create generic consumable product to allow receipts
                    create_prod_res = self.call_kw(
                        "product.product",
                        "create",
                        [
                            {
                                "name": product_name,
                                "type": "consu",  # Consumable allows stock moves (receipts)
                                "purchase_ok": True,
                            }
                        ],
                        {},
                    )
                    if not create_prod_res.get("isError"):
                        product_id = json.loads(create_prod_res["content"])

                line_dict = {
                    "name": product_name,
                    "product_qty": qty,
                    "price_unit": price,
                }
                if product_id:
                    line_dict["product_id"] = product_id

                tax_pct = line.get("tax_percentage")
                if tax_pct is not None:
                    # search for tax (purchase type)
                    tax_res = self.call_kw(
                        "account.tax",
                        "search_read",
                        [
                            [
                                ["type_tax_use", "=", "purchase"],
                                ["amount", "=", float(tax_pct)],
                            ]
                        ],
                        {"fields": ["id"], "limit": 1},
                    )
                    if not tax_res.get("isError") and tax_res.get("content") != "[]":
                        try:
                            tax_id = json.loads(tax_res["content"])[0]["id"]
                            line_dict["taxes_id"] = [[6, 0, [tax_id]]]
                        except:
                            pass

                order_lines.append([0, 0, line_dict])

            # 3. Create Purchase Order
            po_vals = {
                "partner_id": partner_id,
                "date_order": date_order,
                "partner_ref": partner_ref or "",
                "order_line": order_lines,
            }
            if currency_id:
                po_vals["currency_id"] = currency_id

            create_po_res = self.call_kw("purchase.order", "create", [po_vals], {})
            if create_po_res.get("isError"):
                return create_po_res

            created_id = json.loads(create_po_res["content"])
            return {"content": f"Purchase order created successfully. ID: {created_id}"}
        except Exception as e:
            return {"isError": True, "content": f"Tool error: {str(e)}"}


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
                    "model": {
                        "type": "string",
                        "description": "Odoo model, e.g. 'sale.order'",
                    },
                    "method": {
                        "type": "string",
                        "description": "ORM method, e.g. 'search_count'",
                    },
                    "args": {
                        "type": "array",
                        "description": "Positional args. For search/search_count/search_read: args=[[domain_filters]]",
                    },
                    "kwargs": {
                        "type": "object",
                        "description": "Keyword args: fields, limit, offset, order. Do NOT put domain here.",
                    },
                },
                "required": ["model", "method"],
            },
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
                    "attachment_id": {
                        "type": "integer",
                        "description": "The Odoo ir.attachment record ID",
                    }
                },
                "required": ["attachment_id"],
            },
        },
        {
            "name": "create_vendor_invoice",
            "description": (
                "Create an Odoo vendor bill (in_invoice) from basic JSON invoice data. "
                "This tool handles Odoo ORM complexities like searching partners, taxes, accounts, and building One2many tuples. "
                "Use this tool directly after extracting invoice information instead of using odoo-manager."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "partner_name": {
                        "type": "string",
                        "description": "Name of the supplier/partner",
                    },
                    "vat": {
                        "type": "string",
                        "description": "VAT/Tax ID of the supplier (optional)",
                    },
                    "currency_name": {
                        "type": "string",
                        "description": "Currency code like EUR or USD (optional)",
                    },
                    "invoice_date": {
                        "type": "string",
                        "description": "Invoice date in YYYY-MM-DD format",
                    },
                    "invoice_date_due": {
                        "type": "string",
                        "description": "Due date in YYYY-MM-DD format (optional)",
                    },
                    "ref": {
                        "type": "string",
                        "description": "Supplier's invoice number / reference",
                    },
                    "lines": {
                        "type": "array",
                        "description": "Array of invoice lines",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "Product or description",
                                },
                                "quantity": {
                                    "type": "number",
                                    "description": "Quantity",
                                },
                                "price_unit": {
                                    "type": "number",
                                    "description": "Unit price",
                                },
                                "tax_percentage": {
                                    "type": "number",
                                    "description": "Tax percentage (e.g., 21 for 21%)",
                                },
                            },
                            "required": ["name", "quantity", "price_unit"],
                        },
                    },
                },
                "required": ["partner_name", "invoice_date", "ref", "lines"],
            },
        },
        {
            "name": "create_purchase_order",
            "description": (
                "Create an Odoo Purchase Order (purchase.order) from basic JSON invoice/order data. "
                "This tool handles searching partners, searching/creating products automatically, finding taxes, and building One2many tuples. "
                "Use this tool directly after extracting data if the user wants a purchase order (to receive goods before invoicing)."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "partner_name": {
                        "type": "string",
                        "description": "Name of the supplier/partner",
                    },
                    "vat": {
                        "type": "string",
                        "description": "VAT/Tax ID of the supplier (optional)",
                    },
                    "currency_name": {
                        "type": "string",
                        "description": "Currency code like EUR or USD (optional)",
                    },
                    "date_order": {
                        "type": "string",
                        "description": "Order date in YYYY-MM-DD HH:MM:SS format (or just YYYY-MM-DD)",
                    },
                    "partner_ref": {
                        "type": "string",
                        "description": "Supplier's reference number / invoice number",
                    },
                    "lines": {
                        "type": "array",
                        "description": "Array of order lines",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "Product name or description",
                                },
                                "quantity": {
                                    "type": "number",
                                    "description": "Quantity",
                                },
                                "price_unit": {
                                    "type": "number",
                                    "description": "Unit price",
                                },
                                "tax_percentage": {
                                    "type": "number",
                                    "description": "Tax percentage (e.g., 21 for 21%)",
                                },
                            },
                            "required": ["name", "quantity", "price_unit"],
                        },
                    },
                },
                "required": ["partner_name", "date_order", "lines"],
            },
        },
    ]


def handle_request(request: dict) -> dict | None:
    method = request.get("method")
    req_id = request.get("id")
    result = None

    if method == "initialize":
        result = {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "odoo-mcp", "version": "2.0.0"},
        }

    elif method == "tools/list":
        result = {"tools": build_tools()}

    elif method == "tools/call":
        params = request.get("params", {})
        tool_name = params.get("name")
        tool_args = params.get("arguments", {})
        res = None

        def try_parse(val):
            if isinstance(val, str):
                val = val.strip()
                try:
                    parsed = json.loads(val)
                    if isinstance(parsed, str) and (
                        parsed.startswith("[") or parsed.startswith("{")
                    ):
                        return try_parse(parsed)
                    return (
                        try_parse(parsed)
                        if isinstance(parsed, (dict, list))
                        else parsed
                    )
                except:
                    try:
                        parsed = ast.literal_eval(val)
                        if isinstance(parsed, str) and (
                            parsed.startswith("[") or parsed.startswith("{")
                        ):
                            return try_parse(parsed)
                        return (
                            try_parse(parsed)
                            if isinstance(parsed, (dict, list))
                            else parsed
                        )
                    except:
                        return val
            elif isinstance(val, list):
                return [try_parse(x) for x in val]
            elif isinstance(val, dict):
                return {k: try_parse(v) for k, v in val.items()}
            return val

        def _to_int(val):
            try:
                return int(val)
            except Exception:
                return None

        def _extract_rpc_context(_tool_args):
            company_id = _to_int(_tool_args.get("company_id"))
            allowed = _tool_args.get("allowed_company_ids")
            if isinstance(allowed, str):
                try:
                    allowed = json.loads(allowed)
                except Exception:
                    allowed = [x.strip() for x in allowed.split(",") if x.strip()]
            if isinstance(allowed, list):
                clean_allowed = []
                for x in allowed:
                    xi = _to_int(x)
                    if xi is not None:
                        clean_allowed.append(xi)
                allowed = clean_allowed
            else:
                allowed = []

            ctx = {}
            if company_id is not None:
                ctx["company_id"] = company_id
            if allowed:
                ctx["allowed_company_ids"] = allowed
            return ctx

        # Apply try_parse to all tool arguments globally
        tool_args = {k: try_parse(v) for k, v in tool_args.items()}

        if tool_name == "odoo-manager":
            model = tool_args.get("model")
            meth = tool_args.get("method")
            args = tool_args.get("args")
            kwargs = tool_args.get("kwargs")

            # Auto-fix: If model or method are missing from root, look in kwargs
            if not model or not meth:
                if kwargs:
                    if isinstance(kwargs, dict):
                        if not model:
                            model = kwargs.get("model")
                        if not meth:
                            meth = kwargs.get("method")

            if not model or not meth:
                res = {"isError": True, "content": "'model' and 'method' are required"}
            else:
                log(f"[DEBUG PARSE] raw args: {repr(args)}")
                log(f"[DEBUG PARSE] raw kwargs: {repr(kwargs)}")

                args = try_parse(args)
                kwargs = try_parse(kwargs)

                log(f"[DEBUG PARSE] after try_parse args: {repr(args)}")
                log(f"[DEBUG PARSE] after try_parse kwargs: {repr(kwargs)}")

                if args is not None and not isinstance(args, list):
                    log(f"Warning: 'args' is {type(args).__name__}, wrapping in list")
                    args = [args]
                if kwargs is None:
                    kwargs = {}
                elif not isinstance(kwargs, dict):
                    log(f"Warning: 'kwargs' is {type(kwargs).__name__}, ignoring")
                    kwargs = {}

                # Auto-fix: Catch common kwargs passed at the root of the tool payload
                for extra_kw in (
                    "limit",
                    "offset",
                    "fields",
                    "order",
                    "domain",
                    "context",
                ):
                    if extra_kw in tool_args and extra_kw not in kwargs:
                        kwargs[extra_kw] = try_parse(tool_args[extra_kw])

                if meth == "search":
                    if kwargs and "fields" in kwargs:
                        log("Auto-fixed: search() with 'fields' → search_read()")
                        meth = "search_read"

                # Auto-fix: search/read domains
                if meth in ("search", "search_count", "search_read"):
                    if kwargs and "domain" in kwargs:
                        domain = kwargs.pop("domain")
                        if not args:
                            args = [domain]
                        elif isinstance(args, list) and (
                            len(args) == 0 or not isinstance(args[0], list)
                        ):
                            args = [domain] + args
                        log(
                            f"Auto-fixed: moved 'domain' from kwargs to args for {meth}"
                        )

                    if not args:
                        log("Auto-fixed: empty args for search -> [[]]")
                        args = [[]]
                    elif isinstance(args, list):
                        # If args = ["string"] or args = [["name", "=", "value"]] (domain itself without wrapper)
                        if len(args) > 0 and (
                            isinstance(args[0], str)
                            or (
                                isinstance(args[0], list)
                                and len(args[0]) >= 1
                                and isinstance(args[0][0], str)
                            )
                        ):
                            log(
                                "Auto-fixed: wrapped args because it appears to be the domain itself"
                            )
                            args = [args]

                        # New Fix: Convert object-style domain filters -> [["field", "=", "value"]]
                        # If args = [[{"name": "Gemini"}]]
                        if len(args) > 0 and isinstance(args[0], list):
                            new_domain = []
                            for leaf in args[0]:
                                if isinstance(leaf, dict):
                                    for k, v in leaf.items():
                                        new_domain.append([k, "=", v])
                                        log(
                                            f"Auto-fixed: converted dict query leaf {{'{k}': '{v}'}} to ['{k}', '=', '{v}']"
                                        )
                                else:
                                    new_domain.append(leaf)
                            args[0] = new_domain

                # Auto-fix: read() with a domain -> search_read()
                if meth == "read" and args and isinstance(args, list) and len(args) > 0:
                    first_arg = args[0]
                    # If first arg is a domain (list of criteria)
                    if (
                        isinstance(first_arg, list)
                        and len(first_arg) > 0
                        and isinstance(first_arg[0], (list, tuple))
                    ):
                        log("Auto-fixed: read() with domain -> search_read()")
                        meth = "search_read"
                    elif (
                        isinstance(first_arg, list)
                        and len(first_arg) > 0
                        and isinstance(first_arg[0], str)
                        and first_arg[0] in ("|", "&", "!")
                    ):
                        log(
                            "Auto-fixed: read() with domain (poland notation) -> search_read()"
                        )
                        meth = "search_read"

                log(
                    f"Tool call → model={model}, method={meth}, args={str(args)[:80]}, kwargs={str(kwargs)[:80]}"
                )

                # Auto-fix: LLM sends "execute_kw" instead of the actual ORM method
                if meth == "execute_kw":
                    kw_args = (
                        args[0]
                        if (
                            args
                            and isinstance(args, list)
                            and len(args) == 1
                            and isinstance(args[0], list)
                        )
                        else args
                    )
                    if kw_args and isinstance(kw_args, list) and len(kw_args) >= 3:
                        log(
                            f"Auto-fixed: expanding execute_kw for model={kw_args[0]}, method={kw_args[1]}"
                        )
                        model = kw_args[0]
                        meth = kw_args[1]
                        args = kw_args[2] if len(kw_args) > 2 else []
                        if len(kw_args) > 3 and isinstance(kw_args[3], dict):
                            kwargs = kw_args[3]
                    else:
                        res = {
                            "isError": True,
                            "content": "execute_kw called but args are malformed. Need [model, method, [args]]",
                        }

                # Auto-fix: create/write if data is passed as keyword arguments instead of vals dict
                if meth == "create" and (not args or len(args) == 0) and kwargs:
                    special_kw = (
                        "context",
                        "domain",
                        "offset",
                        "limit",
                        "order",
                        "fields",
                    )
                    vals = {k: v for k, v in kwargs.items() if k not in special_kw}
                    if vals:
                        args = [vals]
                        for k in vals:
                            kwargs.pop(k)
                        log("Auto-fixed: moved create values from kwargs to args")

                if meth == "write" and kwargs:
                    # If we have ids in args but no vals dict in args, and we have extra kwargs
                    has_vals_dict = False
                    if isinstance(args, list):
                        if len(args) >= 2 and isinstance(args[1], dict):
                            has_vals_dict = True

                    if not has_vals_dict:
                        special_kw = (
                            "context",
                            "domain",
                            "offset",
                            "limit",
                            "order",
                            "fields",
                        )
                        vals = {k: v for k, v in kwargs.items() if k not in special_kw}
                        if vals:
                            if not args:
                                args = [[]]
                            if len(args) == 1:
                                args.append(vals)
                                for k in vals:
                                    kwargs.pop(k)
                                log(
                                    "Auto-fixed: moved write values from kwargs to args"
                                )

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

                # Auto-fix: Remove 'code' from fields when querying res.currency
                if (
                    model == "res.currency"
                    and meth in ("search_read", "read")
                    and kwargs
                    and "fields" in kwargs
                ):
                    if "code" in kwargs["fields"]:
                        kwargs["fields"].remove("code")
                        log("Auto-fixed: removed 'code' from fields for res.currency")

                # Auto-fix: Rename 'reference' to 'ref' and validate account_ids in account.move create/write
                if model == "account.move" and meth in ("create", "write"):
                    # Helper function to process invoices vals
                    def process_move_vals(mv):
                        if not isinstance(mv, dict):
                            return
                        if "reference" in mv:
                            mv["ref"] = mv.pop("reference")
                            log(
                                "Auto-fixed: renaming 'reference' -> 'ref' in account.move"
                            )

                        lines_key = (
                            "invoice_line_ids"
                            if "invoice_line_ids" in mv
                            else ("line_ids" if "line_ids" in mv else None)
                        )
                        if lines_key and isinstance(mv[lines_key], list):
                            m_type = mv.get("move_type", "in_invoice")
                            acc_type = (
                                "expense"
                                if m_type in ("in_invoice", "in_receipt", "in_refund")
                                else "income"
                            )
                            def_acc_id = None

                            for line in mv[lines_key]:
                                if (
                                    isinstance(line, list)
                                    and len(line) == 3
                                    and isinstance(line[2], dict)
                                ):
                                    line_dict = line[2]
                                    if "display_type" in line_dict and line_dict[
                                        "display_type"
                                    ] in ("line_section", "line_note"):
                                        continue

                                    acc_id = line_dict.get("account_id")
                                    is_valid = False
                                    if acc_id:
                                        chk = odoo.call_kw(
                                            "account.account",
                                            "search_count",
                                            [[["id", "=", acc_id]]],
                                            {},
                                        )
                                        if not chk.get("isError"):
                                            try:
                                                if (
                                                    json.loads(chk.get("content", "0"))
                                                    > 0
                                                ):
                                                    is_valid = True
                                            except:
                                                pass

                                    if not is_valid:
                                        if def_acc_id is None:
                                            def_acc_id = odoo._get_default_account(
                                                acc_type
                                            )
                                        if def_acc_id:
                                            line_dict["account_id"] = def_acc_id
                                            log(
                                                f"Auto-fixed: assigned default account {def_acc_id} to invoice line replacing/filling missing/invalid {acc_id}"
                                            )

                    # Check in args
                    if args and isinstance(args, list) and len(args) > 0:
                        vals_list = (
                            args[0]
                            if meth == "create"
                            else (args[1] if len(args) > 1 else None)
                        )
                        if isinstance(vals_list, list):
                            for vals in vals_list:
                                process_move_vals(vals)
                        elif isinstance(vals_list, dict):
                            process_move_vals(vals_list)
                    # Check in kwargs for write
                    if meth == "write" and kwargs and "vals" in kwargs:
                        process_move_vals(kwargs["vals"])

                sender_id = _to_int(tool_args.get("sender_id"))
                rpc_context = _extract_rpc_context(tool_args)

                if not res:
                    res = odoo.call_kw(
                        model,
                        meth,
                        args or [],
                        kwargs or {},
                        sender_id=sender_id,
                        rpc_context=rpc_context or None,
                    )

        elif tool_name == "odoo-read-excel-attachment":
            res = odoo.read_excel_attachment(tool_args.get("attachment_id"))

        elif tool_name == "create_vendor_invoice":
            sender_id = _to_int(tool_args.get("sender_id"))
            rpc_context = _extract_rpc_context(tool_args)
            res = odoo.create_vendor_invoice(
                partner_name=tool_args.get("partner_name"),
                invoice_date=tool_args.get("invoice_date"),
                ref=tool_args.get("ref"),
                lines=tool_args.get("lines"),
                vat=tool_args.get("vat"),
                invoice_date_due=tool_args.get("invoice_date_due"),
                currency_name=tool_args.get("currency_name"),
                sender_id=sender_id,
                rpc_context=rpc_context or None,
            )

        elif tool_name == "create_purchase_order":
            sender_id = _to_int(tool_args.get("sender_id"))
            res = odoo.create_purchase_order(
                partner_name=tool_args.get("partner_name"),
                date_order=tool_args.get("date_order"),
                lines=tool_args.get("lines"),
                vat=tool_args.get("vat"),
                partner_ref=tool_args.get("partner_ref"),
                currency_name=tool_args.get("currency_name"),
                sender_id=sender_id,
            )

        else:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"},
            }

        result = {
            "content": [{"type": "text", "text": res.get("content", "")}],
            "isError": res.get("isError", False),
        }

    elif method == "notifications/initialized":
        return None  # no response needed

    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Unknown method: {method}"},
        }

    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def main():
    log("Odoo MCP server v2.0 started (JSON-RPC mode)")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
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
