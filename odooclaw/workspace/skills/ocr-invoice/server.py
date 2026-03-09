#!/usr/bin/env python3
import base64
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime
from typing import Any

import requests


def log(msg: str) -> None:
    sys.stderr.write(f"[ocr-invoice] {msg}\n")
    sys.stderr.flush()


class OdooOCRSkill:
    def __init__(self):
        self.odoo_url = os.environ.get("ODOO_URL", "").rstrip("/")
        self.odoo_db = os.environ.get("ODOO_DB", "")
        self.odoo_user = os.environ.get("ODOO_USERNAME", "")
        self.odoo_pwd = os.environ.get("ODOO_PASSWORD", "")

        self.vision_api_base = os.environ.get(
            "VISION_API_BASE", "https://api.openai.com/v1"
        ).rstrip("/")
        self.vision_model = os.environ.get("VISION_MODEL", "gpt-4o-mini")
        self.openai_api_key = os.environ.get("OPENAI_API_KEY", "")

        self.ocr_api_base = os.environ.get("OCR_API_BASE", "").rstrip("/")
        self.ocr_timeout = float(os.environ.get("OCR_TIMEOUT_SECONDS", "240"))
        self.ocr_max_pages = int(os.environ.get("OCR_MAX_PAGES", "4"))
        self.ocr_image_dpi = int(os.environ.get("OCR_IMAGE_DPI", "170"))

        self.session = None
        self.uid = None
        self.runtime_sender_id = None
        self.runtime_rpc_context: dict[str, Any] = {}

    def _odoo_auth(self):
        if self.session and self.uid:
            return None

        if not all([self.odoo_url, self.odoo_db, self.odoo_user, self.odoo_pwd]):
            return {
                "isError": True,
                "content": "Missing Odoo credentials (ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD)",
            }

        self.session = requests.Session()
        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "id": 1,
            "params": {
                "db": self.odoo_db,
                "login": self.odoo_user,
                "password": self.odoo_pwd,
            },
        }

        try:
            r = self.session.post(
                f"{self.odoo_url}/web/session/authenticate", json=payload, timeout=20
            )
            r.raise_for_status()
            data = r.json()
            if data.get("error"):
                return {
                    "isError": True,
                    "content": f"Odoo auth error: {data['error'].get('message', 'unknown')}",
                }

            self.uid = data.get("result", {}).get("uid")
            if not self.uid:
                return {"isError": True, "content": "Odoo authentication failed"}
            return None
        except Exception as exc:
            return {"isError": True, "content": f"Cannot connect to Odoo: {str(exc)}"}

    def _odoo_call(self, model: str, method: str, args=None, kwargs=None):
        args = args or []
        kwargs = kwargs or {}

        err = self._odoo_auth()
        if err:
            return err

        endpoint = "/web/dataset/call_kw"
        params = {
            "model": model,
            "method": method,
            "args": args,
            "kwargs": kwargs,
        }

        if self.runtime_sender_id is not None:
            endpoint = "/odooclaw/call_kw_as_user"
            params["user_id"] = self.runtime_sender_id
            if self.runtime_rpc_context:
                params["context"] = self.runtime_rpc_context

        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "id": 2,
            "params": params,
        }

        try:
            assert self.session is not None
            r = self.session.post(
                f"{self.odoo_url}{endpoint}", json=payload, timeout=60
            )
            r.raise_for_status()
            data = r.json()
            if data.get("error"):
                msg = data["error"].get("data", {}).get("message") or data["error"].get(
                    "message", "unknown"
                )
                return {"isError": True, "content": f"Odoo error: {msg}"}
            return {"result": data.get("result")}
        except Exception as exc:
            return {
                "isError": True,
                "content": f"Odoo RPC error ({model}.{method}): {str(exc)}",
            }

    def _download_attachment(self, attachment_id: int):
        res = self._odoo_call(
            "ir.attachment",
            "read",
            [[attachment_id]],
            {"fields": ["id", "name", "mimetype", "datas"]},
        )
        if res.get("isError"):
            return res

        rows = res.get("result") or []
        if not rows:
            return {"isError": True, "content": f"Attachment {attachment_id} not found"}

        row = rows[0]
        b64 = row.get("datas")
        if not b64:
            return {
                "isError": True,
                "content": f"Attachment {attachment_id} has no datas",
            }

        try:
            data = base64.b64decode(b64)
        except Exception:
            return {
                "isError": True,
                "content": f"Attachment {attachment_id} datas cannot be decoded",
            }

        return {
            "attachment_id": attachment_id,
            "name": row.get("name") or f"attachment_{attachment_id}",
            "mimetype": (row.get("mimetype") or "application/octet-stream").lower(),
            "data": data,
        }

    def _to_data_url(self, raw: bytes, mimetype: str) -> str:
        return f"data:{mimetype};base64,{base64.b64encode(raw).decode('utf-8')}"

    def _extract_first_json(self, text: str):
        if not text:
            raise ValueError("Empty model response")

        cleaned = text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        m = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if m:
            candidate = m.group(0)
            for end in range(len(candidate), 0, -1):
                if candidate[end - 1] not in ("}", "]"):
                    continue
                try:
                    return json.loads(candidate[:end])
                except Exception:
                    continue

        raise ValueError("No valid JSON found in model response")

    def _pdf_to_images(self, pdf_data: bytes):
        out = []
        with tempfile.TemporaryDirectory(prefix="ocr_invoice_") as workdir:
            pdf_path = os.path.join(workdir, "invoice.pdf")
            with open(pdf_path, "wb") as f:
                f.write(pdf_data)

            prefix = os.path.join(workdir, "page")
            bin_path = (
                "/opt/homebrew/bin/pdftoppm"
                if os.path.exists("/opt/homebrew/bin/pdftoppm")
                else "pdftoppm"
            )
            cmd = [bin_path, "-jpeg", "-r", str(self.ocr_image_dpi), pdf_path, prefix]

            try:
                subprocess.run(
                    cmd, check=True, capture_output=True, text=True, timeout=120
                )
            except FileNotFoundError:
                return {
                    "isError": True,
                    "content": "PDF OCR requires pdftoppm (poppler). Install poppler or configure OCR_API_BASE.",
                }
            except subprocess.CalledProcessError as exc:
                return {
                    "isError": True,
                    "content": f"PDF conversion failed: {exc.stderr}",
                }

            names = sorted(
                [
                    n
                    for n in os.listdir(workdir)
                    if n.startswith("page-") and n.endswith(".jpg")
                ]
            )
            for name in names[: self.ocr_max_pages]:
                p = os.path.join(workdir, name)
                with open(p, "rb") as imgf:
                    out.append((imgf.read(), "image/jpeg"))

        if not out:
            return {"isError": True, "content": "No pages extracted from PDF"}
        return {"images": out}

    def _call_external_ocr(self, attachment):
        if not self.ocr_api_base:
            return None

        url = f"{self.ocr_api_base}/v1/ocr/invoice"
        headers = {}
        if self.openai_api_key:
            headers["Authorization"] = f"Bearer {self.openai_api_key}"

        try:
            r = requests.post(
                url,
                headers=headers,
                files={
                    "file": (
                        attachment["name"],
                        attachment["data"],
                        attachment["mimetype"],
                    )
                },
                timeout=self.ocr_timeout,
            )
            r.raise_for_status()
            body = r.json()
            if (
                isinstance(body, dict)
                and "invoice_data" in body
                and isinstance(body["invoice_data"], dict)
            ):
                return body["invoice_data"]
            if isinstance(body, dict):
                return body
            return {"isError": True, "content": "Invalid JSON from OCR_API_BASE"}
        except Exception as exc:
            return {"isError": True, "content": f"External OCR call failed: {str(exc)}"}

    def _call_vision(self, attachment):
        prompt = (
            "You are an OCR+Accounting extractor for supplier invoices. "
            "Return ONLY valid JSON, no markdown, no explanations.\n\n"
            "JSON schema:\n"
            "{\n"
            '  "partner_name": "",\n'
            '  "partner_vat": "",\n'
            '  "customer_name": "",\n'
            '  "customer_vat": "",\n'
            '  "invoice_date": "",\n'
            '  "invoice_date_due": "",\n'
            '  "ref": "",\n'
            '  "currency": "EUR",\n'
            '  "amount_untaxed": 0,\n'
            '  "amount_tax": 0,\n'
            '  "amount_total": 0,\n'
            '  "notes": "",\n'
            '  "invoice_line_ids": [\n'
            '    {"name": "", "quantity": 1, "price_unit": 0, "tax_percentage": 21}\n'
            "  ]\n"
            "}\n\n"
            "Rules: dates must be YYYY-MM-DD, numbers as numeric values, tax_percentage as number (0,4,10,21...)."
        )

        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]

        mime = attachment["mimetype"]
        if "pdf" in mime or attachment["name"].lower().endswith(".pdf"):
            pages = self._pdf_to_images(attachment["data"])
            if pages.get("isError"):
                return pages
            for image_bytes, image_mime in pages["images"]:
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": self._to_data_url(image_bytes, image_mime)
                        },
                    }
                )
        else:
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": self._to_data_url(attachment["data"], mime)},
                }
            )

        payload = {
            "model": self.vision_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a strict OCR extractor. Return only valid JSON.",
                },
                {"role": "user", "content": content},
            ],
            "temperature": 0,
        }

        headers = {"Content-Type": "application/json"}
        if self.openai_api_key:
            headers["Authorization"] = f"Bearer {self.openai_api_key}"

        try:
            r = requests.post(
                f"{self.vision_api_base}/chat/completions",
                json=payload,
                headers=headers,
                timeout=self.ocr_timeout,
            )
            r.raise_for_status()
            body = r.json()
            text = body.get("choices", [{}])[0].get("message", {}).get("content", "")
            parsed = self._extract_first_json(text)
            return {"parsed": parsed, "raw_text": text}
        except Exception as exc:
            return {"isError": True, "content": f"Vision extraction failed: {str(exc)}"}

    def _num(self, value, default=0.0):
        try:
            if isinstance(value, str):
                value = value.replace(" ", "").replace(",", ".")
            return float(value)
        except Exception:
            return float(default)

    def _to_int(self, value):
        try:
            return int(value)
        except Exception:
            return None

    def _build_rpc_context(self, company_id=None, allowed_company_ids=None):
        out = {}
        cid = self._to_int(company_id)
        if cid is not None:
            out["company_id"] = cid

        allowed = allowed_company_ids
        if isinstance(allowed, str):
            try:
                allowed = json.loads(allowed)
            except Exception:
                allowed = [x.strip() for x in allowed.split(",") if x.strip()]

        if isinstance(allowed, list):
            clean = []
            for item in allowed:
                iv = self._to_int(item)
                if iv is not None:
                    clean.append(iv)
            if clean:
                out["allowed_company_ids"] = clean

        return out

    def _normalize_invoice(self, data):
        lines = data.get("invoice_line_ids") or data.get("lines") or []
        normalized_lines = []
        for line in lines:
            if not isinstance(line, dict):
                continue
            normalized_lines.append(
                {
                    "name": str(
                        line.get("name") or line.get("description") or "Item"
                    ).strip()
                    or "Item",
                    "quantity": self._num(line.get("quantity"), 1),
                    "price_unit": self._num(
                        line.get("price_unit") or line.get("unit_price"), 0
                    ),
                    "tax_percentage": self._num(
                        line.get("tax_percentage") or line.get("tax_rate"), 0
                    ),
                }
            )

        if not normalized_lines:
            normalized_lines = [
                {"name": "Item", "quantity": 1, "price_unit": 0, "tax_percentage": 0}
            ]

        return {
            "partner_name": str(
                data.get("partner_name") or data.get("vendor_name") or ""
            ).strip(),
            "partner_vat": str(
                data.get("partner_vat") or data.get("vendor_vat") or ""
            ).strip(),
            "customer_name": str(data.get("customer_name") or "").strip(),
            "customer_vat": str(data.get("customer_vat") or "").strip(),
            "invoice_date": str(data.get("invoice_date") or "").strip(),
            "invoice_date_due": str(
                data.get("invoice_date_due") or data.get("due_date") or ""
            ).strip(),
            "ref": str(data.get("ref") or data.get("invoice_number") or "").strip(),
            "currency": str(data.get("currency") or "EUR").strip() or "EUR",
            "amount_untaxed": self._num(
                data.get("amount_untaxed") or data.get("subtotal"), 0
            ),
            "amount_tax": self._num(
                data.get("amount_tax") or data.get("tax_amount"), 0
            ),
            "amount_total": self._num(
                data.get("amount_total") or data.get("total_amount"), 0
            ),
            "notes": str(data.get("notes") or "").strip(),
            "invoice_line_ids": normalized_lines,
        }

    def _find_currency_id(self, currency_name):
        if not currency_name:
            return None
        res = self._odoo_call(
            "res.currency",
            "search_read",
            [[["name", "ilike", currency_name]]],
            {"fields": ["id", "name"], "limit": 1},
        )
        if res.get("isError"):
            return None
        rows = res.get("result") or []
        return rows[0]["id"] if rows else None

    def _find_or_create_partner(self, partner_name, vat):
        if vat:
            res = self._odoo_call(
                "res.partner",
                "search_read",
                [[["vat", "=", vat]]],
                {"fields": ["id"], "limit": 1},
            )
            if not res.get("isError") and res.get("result"):
                return {"partner_id": res["result"][0]["id"]}

        if partner_name:
            res = self._odoo_call(
                "res.partner",
                "search_read",
                [[["name", "ilike", partner_name]]],
                {"fields": ["id"], "limit": 1},
            )
            if not res.get("isError") and res.get("result"):
                return {"partner_id": res["result"][0]["id"]}

        create_res = self._odoo_call(
            "res.partner",
            "create",
            [
                {
                    "name": partner_name or "Proveedor OCR",
                    "is_company": True,
                    "company_type": "company",
                    "supplier_rank": 1,
                    "vat": vat or False,
                }
            ],
            {},
        )
        if create_res.get("isError"):
            return create_res
        return {"partner_id": create_res.get("result")}

    def _get_default_expense_account(self):
        for domain in (
            [["account_type", "in", ["expense", "expense_direct_cost"]]],
            [["code", "=like", "6%"]],
        ):
            res = self._odoo_call(
                "account.account",
                "search_read",
                [domain],
                {"fields": ["id"], "limit": 1},
            )
            if not res.get("isError") and res.get("result"):
                return res["result"][0]["id"]
        return None

    def _find_purchase_tax(self, pct):
        if pct is None:
            return None
        res = self._odoo_call(
            "account.tax",
            "search_read",
            [[["type_tax_use", "=", "purchase"], ["amount", "=", float(pct)]]],
            {"fields": ["id"], "limit": 1},
        )
        if not res.get("isError") and res.get("result"):
            return res["result"][0]["id"]
        return None

    def _attach_original_file(self, move_id, attachment):
        datas_b64 = base64.b64encode(attachment["data"]).decode("utf-8")
        name = attachment["name"] or f"invoice_{move_id}.pdf"
        return self._odoo_call(
            "ir.attachment",
            "create",
            [
                {
                    "name": name,
                    "type": "binary",
                    "datas": datas_b64,
                    "res_model": "account.move",
                    "res_id": move_id,
                    "mimetype": attachment.get("mimetype")
                    or "application/octet-stream",
                }
            ],
            {},
        )

    def _create_vendor_bill(self, invoice_data, attachment):
        partner_res = self._find_or_create_partner(
            invoice_data.get("partner_name"), invoice_data.get("partner_vat")
        )
        if partner_res.get("isError"):
            return partner_res
        partner_id = partner_res["partner_id"]
        account_id = self._get_default_expense_account()

        line_cmds = []
        for line in invoice_data.get("invoice_line_ids", []):
            line_vals = {
                "name": line.get("name") or "Item",
                "quantity": self._num(line.get("quantity"), 1),
                "price_unit": self._num(line.get("price_unit"), 0),
            }
            if account_id:
                line_vals["account_id"] = account_id
            tax_id = self._find_purchase_tax(line.get("tax_percentage"))
            if tax_id:
                line_vals["tax_ids"] = [[6, 0, [tax_id]]]
            line_cmds.append([0, 0, line_vals])

        if not line_cmds:
            line_cmds = [[0, 0, {"name": "Item", "quantity": 1, "price_unit": 0}]]

        move_vals = {
            "move_type": "in_invoice",
            "partner_id": partner_id,
            "invoice_date": invoice_data.get("invoice_date")
            or datetime.utcnow().strftime("%Y-%m-%d"),
            "invoice_date_due": invoice_data.get("invoice_date_due") or False,
            "ref": invoice_data.get("ref") or "OCR",
            "invoice_line_ids": line_cmds,
        }

        currency_id = self._find_currency_id(invoice_data.get("currency"))
        if currency_id:
            move_vals["currency_id"] = currency_id

        create_res = self._odoo_call("account.move", "create", [move_vals], {})
        if create_res.get("isError"):
            return create_res

        move_id = create_res.get("result")
        attach_res = self._attach_original_file(move_id, attachment)
        if attach_res.get("isError"):
            log(
                f"Warning: bill created but attachment failed: {attach_res.get('content')}"
            )

        return {
            "move_id": move_id,
            "partner_id": partner_id,
            "attachment_linked": not attach_res.get("isError"),
        }

    def extract_invoice(
        self,
        attachment_id: int,
        sender_id=None,
        company_id=None,
        allowed_company_ids=None,
    ):
        self.runtime_sender_id = self._to_int(sender_id)
        self.runtime_rpc_context = self._build_rpc_context(
            company_id=company_id, allowed_company_ids=allowed_company_ids
        )

        attachment = self._download_attachment(attachment_id)
        if attachment.get("isError"):
            return attachment

        extracted = None
        raw_text = None

        ext_res = self._call_external_ocr(attachment)
        if isinstance(ext_res, dict) and not ext_res.get("isError"):
            extracted = ext_res
        else:
            vision_res = self._call_vision(attachment)
            if vision_res.get("isError"):
                if isinstance(ext_res, dict) and ext_res.get("isError"):
                    return {
                        "isError": True,
                        "content": f"External OCR failed: {ext_res.get('content')} | Vision fallback failed: {vision_res.get('content')}",
                    }
                return vision_res
            extracted = vision_res.get("parsed")
            raw_text = vision_res.get("raw_text")

        invoice_data = self._normalize_invoice(extracted or {})
        return {
            "content": json.dumps(
                {
                    "success": True,
                    "attachment_id": attachment_id,
                    "invoice_data": invoice_data,
                    "raw_response": raw_text,
                },
                ensure_ascii=False,
            )
        }

    def extract_and_create_vendor_bill(
        self,
        attachment_id: int,
        dry_run: bool = False,
        sender_id=None,
        company_id=None,
        allowed_company_ids=None,
    ):
        self.runtime_sender_id = self._to_int(sender_id)
        self.runtime_rpc_context = self._build_rpc_context(
            company_id=company_id, allowed_company_ids=allowed_company_ids
        )

        attachment = self._download_attachment(attachment_id)
        if attachment.get("isError"):
            return attachment

        ext_res = self.extract_invoice(
            attachment_id,
            sender_id=sender_id,
            company_id=company_id,
            allowed_company_ids=allowed_company_ids,
        )
        if ext_res.get("isError"):
            return ext_res

        payload = json.loads(str(ext_res.get("content", "{}")))
        invoice_data = payload.get("invoice_data", {})

        if dry_run:
            return {
                "content": json.dumps(
                    {"success": True, "dry_run": True, "invoice_data": invoice_data},
                    ensure_ascii=False,
                )
            }

        create_res = self._create_vendor_bill(invoice_data, attachment)
        if create_res.get("isError"):
            return create_res

        return {
            "content": json.dumps(
                {
                    "success": True,
                    "move_id": create_res["move_id"],
                    "partner_id": create_res["partner_id"],
                    "attachment_linked": create_res["attachment_linked"],
                    "invoice_data": invoice_data,
                },
                ensure_ascii=False,
            )
        }


ocr = OdooOCRSkill()


def build_tools():
    return [
        {
            "name": "ocr-invoice",
            "description": "Extract structured invoice data from an Odoo attachment (PDF/image).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "attachment_id": {
                        "type": "integer",
                        "description": "ir.attachment ID of invoice PDF/image",
                    },
                    "sender_id": {
                        "type": "integer",
                        "description": "res.users ID of the message author (for permission/company inheritance)",
                    },
                    "company_id": {
                        "type": "integer",
                        "description": "Active company ID from Odoo context",
                    },
                    "allowed_company_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "Allowed company IDs from Odoo context",
                    },
                },
                "required": ["attachment_id"],
            },
        },
        {
            "name": "ocr-create-vendor-bill",
            "description": "Extract invoice data from attachment and create vendor bill in Odoo (account.move in_invoice).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "attachment_id": {
                        "type": "integer",
                        "description": "ir.attachment ID of invoice PDF/image",
                    },
                    "dry_run": {
                        "type": "boolean",
                        "description": "If true, only extract and normalize data without creating bill",
                    },
                    "sender_id": {
                        "type": "integer",
                        "description": "res.users ID of the message author (for permission/company inheritance)",
                    },
                    "company_id": {
                        "type": "integer",
                        "description": "Active company ID from Odoo context",
                    },
                    "allowed_company_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "Allowed company IDs from Odoo context",
                    },
                },
                "required": ["attachment_id"],
            },
        },
    ]


def handle_request(request):
    method = request.get("method")
    req_id = request.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "ocr-invoice-mcp", "version": "3.0.0"},
            },
        }

    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": build_tools()}}

    if method == "notifications/initialized":
        return None

    if method != "tools/call":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Unknown method: {method}"},
        }

    params = request.get("params", {})
    name = params.get("name")
    arguments = params.get("arguments", {}) or {}

    attachment_id_raw = arguments.get("attachment_id")
    sender_id_raw = arguments.get("sender_id")
    company_id_raw = arguments.get("company_id")
    allowed_company_ids = arguments.get("allowed_company_ids")
    attachment_id = None
    sender_id = None
    company_id = None
    try:
        if attachment_id_raw is not None:
            attachment_id = int(attachment_id_raw)
    except Exception:
        attachment_id = None

    try:
        if sender_id_raw is not None:
            sender_id = int(sender_id_raw)
    except Exception:
        sender_id = None

    try:
        if company_id_raw is not None:
            company_id = int(company_id_raw)
    except Exception:
        company_id = None

    if not attachment_id:
        res = {
            "isError": True,
            "content": "'attachment_id' is required and must be integer",
        }
    elif name == "ocr-invoice":
        res = ocr.extract_invoice(
            attachment_id,
            sender_id=sender_id,
            company_id=company_id,
            allowed_company_ids=allowed_company_ids,
        )
    elif name == "ocr-create-vendor-bill":
        dry_run = bool(arguments.get("dry_run", False))
        res = ocr.extract_and_create_vendor_bill(
            attachment_id,
            dry_run=dry_run,
            sender_id=sender_id,
            company_id=company_id,
            allowed_company_ids=allowed_company_ids,
        )
    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Unknown tool: {name}"},
        }

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "result": {
            "content": [{"type": "text", "text": res.get("content", "")}],
            "isError": bool(res.get("isError", False)),
        },
    }


def main():
    log("OCR Invoice MCP server v3.0 started")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            resp = handle_request(req)
            if resp is not None:
                sys.stdout.write(json.dumps(resp) + "\n")
                sys.stdout.flush()
        except Exception as exc:
            log(f"Unhandled error: {str(exc)}")


if __name__ == "__main__":
    main()
