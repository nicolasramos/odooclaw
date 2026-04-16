from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
from typing import Any, Optional

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.capability_service import (
    build_success_response,
    build_unsupported_response,
)


def _parse_iso_date(value: Optional[str], fallback: Optional[date] = None) -> date:
    if value:
        return datetime.strptime(value, "%Y-%m-%d").date()
    if fallback:
        return fallback
    return date.today()


def _safe_float(value: Any) -> float:
    if value in (None, False, ""):
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _date_domain(
    field_name: str, date_from: Optional[str], date_to: Optional[str]
) -> list:
    domain: list[list[Any]] = []
    if date_from:
        domain.append([field_name, ">=", date_from])
    if date_to:
        domain.append([field_name, "<=", date_to])
    return domain


def _to_line_commands(lines: list[dict]) -> list[tuple[int, int, dict[str, Any]]]:
    commands: list[tuple[int, int, dict[str, Any]]] = []
    for line in lines:
        vals = {
            "name": line.get("name") or "Line",
            "debit": _safe_float(line.get("debit")),
            "credit": _safe_float(line.get("credit")),
        }
        if line.get("account_id"):
            vals["account_id"] = int(line["account_id"])
        if line.get("partner_id"):
            vals["partner_id"] = int(line["partner_id"])
        if line.get("analytic_account_id"):
            vals["analytic_account_id"] = int(line["analytic_account_id"])
        if line.get("tax_ids"):
            vals["tax_ids"] = [(6, 0, [int(t) for t in line["tax_ids"]])]
        commands.append((0, 0, vals))
    return commands


def find_unreconciled_bank_lines(
    client: OdooClient,
    sender_id: int,
    journal_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
    limit: int = 50,
) -> dict:
    if not client.model_exists("account.bank.statement.line", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.find_unreconciled_bank_lines",
            "account.bank.statement.line model is not available in this Odoo instance.",
            ["account.bank.statement.line"],
        )

    domain: list[list[Any]] = [["is_reconciled", "=", False]]
    if journal_id:
        domain.append(["journal_id", "=", journal_id])
    domain.extend(_date_domain("date", date_from, date_to))
    if amount_min is not None:
        domain.append(["amount", ">=", amount_min])
    if amount_max is not None:
        domain.append(["amount", "<=", amount_max])

    fields = [
        "id",
        "date",
        "payment_ref",
        "name",
        "amount",
        "partner_id",
        "journal_id",
        "is_reconciled",
    ]
    rows = client.call_kw(
        "account.bank.statement.line",
        "search_read",
        args=[domain],
        kwargs={"fields": fields, "limit": limit, "order": "date asc, id asc"},
        sender_id=sender_id,
    )
    return build_success_response(
        "accounting.find_unreconciled_bank_lines",
        count=len(rows),
        lines=rows,
    )


def suggest_bank_reconciliation(
    client: OdooClient,
    sender_id: int,
    statement_line_id: int,
    tolerance_amount: float = 0.01,
    days_window: int = 30,
    limit: int = 20,
) -> dict:
    if not client.model_exists("account.bank.statement.line", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.suggest_bank_reconciliation",
            "account.bank.statement.line model is not available in this Odoo instance.",
            ["account.bank.statement.line"],
        )
    if not client.model_exists("account.move.line", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.suggest_bank_reconciliation",
            "account.move.line model is not available in this Odoo instance.",
            ["account.move.line"],
        )

    statement = client.call_kw(
        "account.bank.statement.line",
        "read",
        args=[[statement_line_id]],
        kwargs={
            "fields": ["id", "date", "amount", "partner_id", "payment_ref", "name"]
        },
        sender_id=sender_id,
    )
    if not statement:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "accounting.suggest_bank_reconciliation",
            "message": f"Statement line {statement_line_id} was not found.",
        }

    st = statement[0]
    st_amount = abs(_safe_float(st.get("amount")))
    st_date = _parse_iso_date(st.get("date")) if st.get("date") else date.today()
    st_partner = st.get("partner_id", [None])[0] if st.get("partner_id") else None
    st_ref = (st.get("payment_ref") or st.get("name") or "").strip().lower()

    domain: list[list[Any]] = [
        ["reconciled", "=", False],
        ["parent_state", "=", "posted"],
    ]
    if st_partner:
        domain.append(["partner_id", "=", st_partner])

    candidates = client.call_kw(
        "account.move.line",
        "search_read",
        args=[domain],
        kwargs={
            "fields": [
                "id",
                "date",
                "name",
                "ref",
                "partner_id",
                "amount_residual",
                "balance",
                "move_id",
            ],
            "limit": 200,
            "order": "date desc, id desc",
        },
        sender_id=sender_id,
    )

    scored: list[dict[str, Any]] = []
    for row in candidates:
        residual = abs(_safe_float(row.get("amount_residual")))
        if residual <= 0:
            residual = abs(_safe_float(row.get("balance")))
        if residual <= 0:
            continue

        diff = abs(residual - st_amount)
        score = max(0.0, 60.0 - min(diff / max(tolerance_amount, 0.01), 60.0))
        if diff <= tolerance_amount:
            score += 25.0

        line_date = _parse_iso_date(row.get("date"), fallback=st_date)
        days_diff = abs((line_date - st_date).days)
        if days_diff <= days_window:
            score += max(0.0, 15.0 - (days_diff * 0.5))

        partner_ref = (
            row.get("partner_id", [None])[0] if row.get("partner_id") else None
        )
        if st_partner and partner_ref == st_partner:
            score += 15.0

        row_ref = f"{row.get('ref') or ''} {row.get('name') or ''}".strip().lower()
        if st_ref and row_ref:
            if st_ref in row_ref or row_ref in st_ref:
                score += 10.0

        scored.append(
            {
                "score": round(score, 2),
                "id": row.get("id"),
                "move_line_id": row.get("id"),
                "date": row.get("date"),
                "amount_residual": residual,
                "partner_id": row.get("partner_id"),
                "ref": row.get("ref"),
                "name": row.get("name"),
                "move_id": row.get("move_id"),
            }
        )

    scored.sort(key=lambda item: item["score"], reverse=True)
    return build_success_response(
        "accounting.suggest_bank_reconciliation",
        statement_line_id=statement_line_id,
        suggestions=scored[:limit],
    )


def reconcile_bank_line(
    client: OdooClient,
    sender_id: int,
    statement_line_id: int,
    move_line_ids: list[int],
    confirm: bool = False,
) -> dict:
    if not confirm:
        return {
            "ok": False,
            "status": "confirmation_required",
            "capability": "accounting.reconcile_bank_line",
            "message": "Set confirm=true to execute bank reconciliation.",
            "statement_line_id": statement_line_id,
            "move_line_ids": move_line_ids,
        }
    if not client.model_exists("account.bank.statement.line", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.reconcile_bank_line",
            "account.bank.statement.line model is not available in this Odoo instance.",
            ["account.bank.statement.line"],
        )

    attempts = [
        (
            "process_reconciliation",
            [
                [statement_line_id],
                [{"move_line_id": line_id} for line_id in move_line_ids],
            ],
            {},
        ),
        ("action_reconcile", [[statement_line_id], move_line_ids], {}),
        ("reconcile", [[statement_line_id], move_line_ids], {}),
    ]
    last_error: Optional[str] = None
    for method, args, kwargs in attempts:
        try:
            client.call_kw(
                "account.bank.statement.line",
                method,
                args=args,
                kwargs=kwargs,
                sender_id=sender_id,
            )
            return build_success_response(
                "accounting.reconcile_bank_line",
                statement_line_id=statement_line_id,
                move_line_ids=move_line_ids,
                method=method,
            )
        except Exception as exc:  # pragma: no cover - fallback path
            last_error = str(exc)

    return {
        "ok": False,
        "status": "failed",
        "capability": "accounting.reconcile_bank_line",
        "message": "Could not reconcile statement line with available methods.",
        "error": last_error,
    }


def register_invoice_payment(
    client: OdooClient,
    sender_id: int,
    invoice_id: int,
    amount: Optional[float] = None,
    payment_date: Optional[str] = None,
    journal_id: Optional[int] = None,
    memo: Optional[str] = None,
) -> dict:
    if not client.model_exists("account.move", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.register_invoice_payment",
            "account.move model is not available in this Odoo instance.",
            ["account.move"],
        )
    if not client.model_exists("account.payment.register", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.register_invoice_payment",
            "account.payment.register model is not available in this Odoo instance.",
            ["account.payment.register"],
        )

    rows = client.call_kw(
        "account.move",
        "read",
        args=[[invoice_id]],
        kwargs={
            "fields": [
                "id",
                "state",
                "payment_state",
                "amount_residual",
                "amount_total",
            ]
        },
        sender_id=sender_id,
    )
    if not rows:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "accounting.register_invoice_payment",
            "message": f"Invoice {invoice_id} was not found.",
        }

    before = rows[0]
    if before.get("state") != "posted":
        return {
            "ok": False,
            "status": "invalid_state",
            "capability": "accounting.register_invoice_payment",
            "message": "Invoice must be posted before registering payments.",
            "invoice_state": before.get("state"),
        }

    context = {"active_model": "account.move", "active_ids": [invoice_id]}
    vals: dict[str, Any] = {}
    if amount is not None:
        vals["amount"] = amount
    if payment_date:
        vals["payment_date"] = payment_date
    if journal_id:
        vals["journal_id"] = journal_id
    if memo:
        vals["communication"] = memo

    wizard_id = client.call_kw(
        "account.payment.register",
        "create",
        args=[vals],
        kwargs={"context": context},
        sender_id=sender_id,
    )
    client.call_kw(
        "account.payment.register",
        "action_create_payments",
        args=[[wizard_id]],
        kwargs={"context": context},
        sender_id=sender_id,
    )

    after = client.call_kw(
        "account.move",
        "read",
        args=[[invoice_id]],
        kwargs={"fields": ["id", "payment_state", "amount_residual"]},
        sender_id=sender_id,
    )[0]
    return build_success_response(
        "accounting.register_invoice_payment",
        invoice_id=invoice_id,
        wizard_id=wizard_id,
        payment_state_before=before.get("payment_state"),
        payment_state_after=after.get("payment_state"),
        residual_before=_safe_float(before.get("amount_residual")),
        residual_after=_safe_float(after.get("amount_residual")),
    )


def get_ar_ap_aging(
    client: OdooClient,
    sender_id: int,
    report_type: str = "both",
    as_of: Optional[str] = None,
    company_id: Optional[int] = None,
    limit: int = 500,
) -> dict:
    if not client.model_exists("account.move", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.get_ar_ap_aging",
            "account.move model is not available in this Odoo instance.",
            ["account.move"],
        )

    mapping = {
        "receivable": ["out_invoice", "out_refund"],
        "payable": ["in_invoice", "in_refund"],
        "both": ["out_invoice", "out_refund", "in_invoice", "in_refund"],
    }
    move_types = mapping.get(report_type, mapping["both"])
    as_of_date = _parse_iso_date(as_of)
    domain: list[list[Any]] = [
        ["state", "=", "posted"],
        ["payment_state", "in", ["not_paid", "partial", "in_payment"]],
        ["move_type", "in", move_types],
    ]
    if company_id:
        domain.append(["company_id", "=", company_id])

    rows = client.call_kw(
        "account.move",
        "search_read",
        args=[domain],
        kwargs={
            "fields": [
                "id",
                "name",
                "partner_id",
                "move_type",
                "invoice_date_due",
                "amount_residual",
                "currency_id",
            ],
            "limit": limit,
            "order": "invoice_date_due asc, id asc",
        },
        sender_id=sender_id,
    )

    buckets = {
        "current": 0.0,
        "0_30": 0.0,
        "31_60": 0.0,
        "61_90": 0.0,
        "90_plus": 0.0,
    }
    enriched: list[dict[str, Any]] = []
    for row in rows:
        due_raw = row.get("invoice_date_due")
        residual = _safe_float(row.get("amount_residual"))
        if residual <= 0:
            continue
        overdue_days = 0
        bucket = "current"
        if due_raw:
            due_date = _parse_iso_date(due_raw)
            overdue_days = max(0, (as_of_date - due_date).days)
            if overdue_days == 0:
                bucket = "current"
            elif overdue_days <= 30:
                bucket = "0_30"
            elif overdue_days <= 60:
                bucket = "31_60"
            elif overdue_days <= 90:
                bucket = "61_90"
            else:
                bucket = "90_plus"
        buckets[bucket] += residual
        enriched.append(
            {
                **row,
                "overdue_days": overdue_days,
                "bucket": bucket,
            }
        )

    return build_success_response(
        "accounting.get_ar_ap_aging",
        as_of=as_of_date.isoformat(),
        report_type=report_type,
        totals={name: round(value, 2) for name, value in buckets.items()},
        invoices=enriched,
    )


def run_period_close_checks(
    client: OdooClient,
    sender_id: int,
    period_start: str,
    period_end: str,
    company_id: Optional[int] = None,
) -> dict:
    if not client.model_exists("account.move", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.run_period_close_checks",
            "account.move model is not available in this Odoo instance.",
            ["account.move"],
        )

    move_domain = _date_domain("date", period_start, period_end)
    if company_id:
        move_domain.append(["company_id", "=", company_id])

    draft_moves = client.call_kw(
        "account.move",
        "search_count",
        args=[[*move_domain, ["state", "=", "draft"]]],
        sender_id=sender_id,
    )
    unpaid_overdue = client.call_kw(
        "account.move",
        "search_count",
        args=[
            [
                *move_domain,
                ["state", "=", "posted"],
                ["move_type", "=", "out_invoice"],
                ["payment_state", "in", ["not_paid", "partial"]],
                ["invoice_date_due", "<=", period_end],
            ]
        ],
        sender_id=sender_id,
    )
    unreconciled_bank_lines = 0
    if client.model_exists("account.bank.statement.line", sender_id=sender_id):
        bank_domain = [
            ["is_reconciled", "=", False],
            ["date", ">=", period_start],
            ["date", "<=", period_end],
        ]
        if company_id:
            bank_domain.append(["company_id", "=", company_id])
        unreconciled_bank_lines = client.call_kw(
            "account.bank.statement.line",
            "search_count",
            args=[bank_domain],
            sender_id=sender_id,
        )

    checks = {
        "draft_moves": draft_moves,
        "unpaid_overdue_customer_invoices": unpaid_overdue,
        "unreconciled_bank_lines": unreconciled_bank_lines,
    }
    critical = []
    if draft_moves > 0:
        critical.append("There are draft journal entries inside the period.")
    if unreconciled_bank_lines > 0:
        critical.append("There are unreconciled bank statement lines in the period.")

    warnings = []
    if unpaid_overdue > 0:
        warnings.append("There are overdue customer invoices pending payment.")

    return build_success_response(
        "accounting.run_period_close_checks",
        period_start=period_start,
        period_end=period_end,
        company_id=company_id,
        go_no_go=not critical,
        checks=checks,
        critical=critical,
        warnings=warnings,
    )


def create_journal_entry(
    client: OdooClient,
    sender_id: int,
    journal_id: int,
    entry_date: str,
    lines: list[dict[str, Any]],
    ref: Optional[str] = None,
    company_id: Optional[int] = None,
) -> dict:
    if not client.model_exists("account.move", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.create_journal_entry",
            "account.move model is not available in this Odoo instance.",
            ["account.move"],
        )
    if not lines:
        raise ValueError("Journal entry requires at least one line.")

    debit = sum(_safe_float(line.get("debit")) for line in lines)
    credit = sum(_safe_float(line.get("credit")) for line in lines)
    if abs(debit - credit) > 0.0001:
        raise ValueError("Journal entry is not balanced (sum debit != sum credit).")

    vals: dict[str, Any] = {
        "move_type": "entry",
        "journal_id": journal_id,
        "date": entry_date,
        "line_ids": _to_line_commands(lines),
    }
    if ref:
        vals["ref"] = ref
    if company_id:
        vals["company_id"] = company_id

    move_id = client.call_kw("account.move", "create", args=[vals], sender_id=sender_id)
    return build_success_response(
        "accounting.create_journal_entry",
        move_id=move_id,
        balanced=True,
        debit_total=round(debit, 2),
        credit_total=round(credit, 2),
    )


def post_journal_entry(
    client: OdooClient,
    sender_id: int,
    move_id: int,
    confirm: bool = False,
) -> dict:
    if not confirm:
        return {
            "ok": False,
            "status": "confirmation_required",
            "capability": "accounting.post_journal_entry",
            "message": "Set confirm=true to post the journal entry.",
            "move_id": move_id,
        }

    row = client.call_kw(
        "account.move",
        "read",
        args=[[move_id]],
        kwargs={"fields": ["id", "state"]},
        sender_id=sender_id,
    )
    if not row:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "accounting.post_journal_entry",
            "message": f"Journal entry {move_id} was not found.",
        }

    if row[0].get("state") == "posted":
        return build_success_response(
            "accounting.post_journal_entry",
            move_id=move_id,
            already_posted=True,
        )

    client.call_kw("account.move", "action_post", args=[[move_id]], sender_id=sender_id)
    return build_success_response(
        "accounting.post_journal_entry",
        move_id=move_id,
        posted=True,
    )


def get_tax_summary(
    client: OdooClient,
    sender_id: int,
    date_from: str,
    date_to: str,
    company_id: Optional[int] = None,
    tax_group_id: Optional[int] = None,
) -> dict:
    if not client.model_exists("account.move.line", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.get_tax_summary",
            "account.move.line model is not available in this Odoo instance.",
            ["account.move.line"],
        )

    domain: list[list[Any]] = [
        ["tax_line_id", "!=", False],
        ["parent_state", "=", "posted"],
        ["date", ">=", date_from],
        ["date", "<=", date_to],
    ]
    if company_id:
        domain.append(["company_id", "=", company_id])

    rows = client.call_kw(
        "account.move.line",
        "search_read",
        args=[domain],
        kwargs={"fields": ["tax_line_id", "tax_base_amount", "balance"]},
        sender_id=sender_id,
    )
    tax_totals: dict[int, dict[str, Any]] = {}
    for row in rows:
        tax_ref = row.get("tax_line_id")
        if not tax_ref:
            continue
        tax_id = int(tax_ref[0])
        base_amount = _safe_float(row.get("tax_base_amount"))
        tax_amount = _safe_float(row.get("balance"))
        current = tax_totals.setdefault(
            tax_id,
            {
                "tax_id": tax_id,
                "tax_name": tax_ref[1],
                "base_amount": 0.0,
                "tax_amount": 0.0,
            },
        )
        current["base_amount"] += base_amount
        current["tax_amount"] += tax_amount

    if tax_group_id and client.model_exists("account.tax", sender_id=sender_id):
        tax_ids = list(tax_totals.keys())
        tax_rows = client.call_kw(
            "account.tax",
            "read",
            args=[tax_ids],
            kwargs={"fields": ["id", "tax_group_id"]},
            sender_id=sender_id,
        )
        allowed = {
            int(t["id"])
            for t in tax_rows
            if t.get("tax_group_id") and int(t["tax_group_id"][0]) == tax_group_id
        }
        tax_totals = {
            tax_id: info for tax_id, info in tax_totals.items() if tax_id in allowed
        }

    taxes = [
        {
            **info,
            "base_amount": round(_safe_float(info["base_amount"]), 2),
            "tax_amount": round(_safe_float(info["tax_amount"]), 2),
        }
        for info in tax_totals.values()
    ]
    taxes.sort(key=lambda item: abs(item["tax_amount"]), reverse=True)

    return build_success_response(
        "accounting.get_tax_summary",
        date_from=date_from,
        date_to=date_to,
        company_id=company_id,
        tax_group_id=tax_group_id,
        taxes=taxes,
        total_tax=round(sum(_safe_float(t["tax_amount"]) for t in taxes), 2),
    )


def validate_vendor_bill_duplicate(
    client: OdooClient,
    sender_id: int,
    partner_id: int,
    vendor_bill_number: Optional[str],
    invoice_date: Optional[str],
    amount_total: Optional[float],
    currency_id: Optional[int] = None,
    tolerance: float = 0.01,
) -> dict:
    if not client.model_exists("account.move", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.validate_vendor_bill_duplicate",
            "account.move model is not available in this Odoo instance.",
            ["account.move"],
        )

    domain: list[list[Any]] = [
        ["partner_id", "=", partner_id],
        ["move_type", "in", ["in_invoice", "in_refund"]],
        ["state", "!=", "cancel"],
    ]
    if currency_id:
        domain.append(["currency_id", "=", currency_id])
    candidates = client.call_kw(
        "account.move",
        "search_read",
        args=[domain],
        kwargs={
            "fields": [
                "id",
                "name",
                "ref",
                "invoice_date",
                "amount_total",
                "currency_id",
                "state",
                "payment_state",
            ],
            "limit": 100,
            "order": "invoice_date desc, id desc",
        },
        sender_id=sender_id,
    )

    bill_ref = (vendor_bill_number or "").strip().lower()
    invoice_amount = _safe_float(amount_total)
    scored: list[dict[str, Any]] = []
    for row in candidates:
        score = 0.0
        row_ref = (row.get("ref") or "").strip().lower()
        row_name = (row.get("name") or "").strip().lower()
        if bill_ref:
            if bill_ref == row_ref or bill_ref == row_name:
                score += 70
            elif bill_ref in row_ref or bill_ref in row_name:
                score += 40
        if invoice_date and row.get("invoice_date") == invoice_date:
            score += 15
        row_amount = _safe_float(row.get("amount_total"))
        if invoice_amount and abs(invoice_amount - row_amount) <= tolerance:
            score += 15
        if score > 0:
            scored.append({**row, "duplicate_score": round(score, 2)})

    scored.sort(key=lambda item: item["duplicate_score"], reverse=True)
    risk_level = "low"
    if scored and scored[0]["duplicate_score"] >= 70:
        risk_level = "high"
    elif scored and scored[0]["duplicate_score"] >= 40:
        risk_level = "medium"

    return build_success_response(
        "accounting.validate_vendor_bill_duplicate",
        partner_id=partner_id,
        vendor_bill_number=vendor_bill_number,
        invoice_date=invoice_date,
        amount_total=amount_total,
        risk_level=risk_level,
        candidates=scored,
    )


def suggest_expense_account_and_taxes(
    client: OdooClient,
    sender_id: int,
    description: str,
    amount: float,
    partner_id: Optional[int] = None,
    product_id: Optional[int] = None,
    company_id: Optional[int] = None,
) -> dict:
    if not client.model_exists("account.move.line", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.suggest_expense_account_and_taxes",
            "account.move.line model is not available in this Odoo instance.",
            ["account.move.line"],
        )

    domain: list[list[Any]] = [
        ["display_type", "=", False],
        ["move_id.state", "=", "posted"],
        ["move_id.move_type", "=", "in_invoice"],
    ]
    if partner_id:
        domain.append(["move_id.partner_id", "=", partner_id])
    if product_id:
        domain.append(["product_id", "=", product_id])
    if company_id:
        domain.append(["company_id", "=", company_id])

    rows = client.call_kw(
        "account.move.line",
        "search_read",
        args=[domain],
        kwargs={
            "fields": ["account_id", "tax_ids", "name", "price_subtotal"],
            "limit": 100,
            "order": "id desc",
        },
        sender_id=sender_id,
    )

    account_counter: dict[int, int] = defaultdict(int)
    tax_counter: dict[int, int] = defaultdict(int)
    for row in rows:
        account_ref = row.get("account_id")
        if account_ref:
            account_counter[int(account_ref[0])] += 1
        for tax_id in row.get("tax_ids") or []:
            tax_counter[int(tax_id)] += 1

    suggested_account_id = (
        max(
            account_counter.keys(),
            key=lambda account_id: account_counter[account_id],
        )
        if account_counter
        else None
    )
    suggested_tax_ids = [
        tax
        for tax, _ in sorted(
            tax_counter.items(), key=lambda item: item[1], reverse=True
        )[:3]
    ]

    if (
        not suggested_account_id
        and product_id
        and client.model_exists("product.product", sender_id=sender_id)
    ):
        product_rows = client.call_kw(
            "product.product",
            "read",
            args=[[product_id]],
            kwargs={"fields": ["property_account_expense_id", "supplier_taxes_id"]},
            sender_id=sender_id,
        )
        if product_rows:
            product = product_rows[0]
            if product.get("property_account_expense_id"):
                suggested_account_id = int(product["property_account_expense_id"][0])
            if not suggested_tax_ids:
                suggested_tax_ids = [
                    int(tax_id) for tax_id in (product.get("supplier_taxes_id") or [])
                ]

    return build_success_response(
        "accounting.suggest_expense_account_and_taxes",
        description=description,
        amount=amount,
        suggested_account_id=suggested_account_id,
        suggested_tax_ids=suggested_tax_ids,
        confidence="high"
        if account_counter
        else "medium"
        if suggested_account_id
        else "low",
    )


def _normalize_ocr_lines(payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw_lines = payload.get("lines") or payload.get("invoice_lines") or []
    normalized: list[dict[str, Any]] = []
    for raw in raw_lines:
        normalized.append(
            {
                "name": raw.get("name") or raw.get("description") or "Line",
                "quantity": _safe_float(raw.get("quantity") or 1.0),
                "price_unit": _safe_float(
                    raw.get("price_unit") or raw.get("unit_price") or 0.0
                ),
                "product_id": raw.get("product_id"),
                "account_id": raw.get("account_id"),
                "tax_ids": raw.get("tax_ids") or [],
            }
        )
    return normalized


def create_vendor_bill_from_ocr_validated(
    client: OdooClient,
    sender_id: int,
    ocr_payload: dict[str, Any],
    attachment_id: Optional[int] = None,
    confirm: bool = False,
    dry_run: bool = False,
    company_id: Optional[int] = None,
    allowed_company_ids: Optional[list[int]] = None,
) -> dict:
    if not client.model_exists("account.move", sender_id=sender_id):
        return build_unsupported_response(
            "accounting.create_vendor_bill_from_ocr_validated",
            "account.move model is not available in this Odoo instance.",
            ["account.move"],
        )

    partner_id = ocr_payload.get("partner_id")
    if not partner_id:
        raise ValueError("OCR payload must include partner_id to create vendor bill.")

    lines = _normalize_ocr_lines(ocr_payload)
    if not lines:
        raise ValueError("OCR payload must include at least one invoice line.")

    duplicate_check = validate_vendor_bill_duplicate(
        client=client,
        sender_id=sender_id,
        partner_id=int(partner_id),
        vendor_bill_number=ocr_payload.get("ref")
        or ocr_payload.get("vendor_bill_number"),
        invoice_date=ocr_payload.get("invoice_date"),
        amount_total=ocr_payload.get("amount_total"),
        currency_id=ocr_payload.get("currency_id"),
    )
    risk_level = duplicate_check.get("risk_level")
    if risk_level == "high" and not confirm:
        return {
            "ok": False,
            "status": "duplicate_risk",
            "capability": "accounting.create_vendor_bill_from_ocr_validated",
            "message": "High duplicate risk detected. Confirm the operation to proceed.",
            "duplicate_candidates": duplicate_check.get("candidates", []),
        }

    line_commands: list[tuple[int, int, dict[str, Any]]] = []
    for line in lines:
        account_id = line.get("account_id")
        tax_ids = list(line.get("tax_ids") or [])
        if not account_id or not tax_ids:
            suggestion = suggest_expense_account_and_taxes(
                client=client,
                sender_id=sender_id,
                description=str(line.get("name") or "Line"),
                amount=_safe_float(line.get("price_unit"))
                * _safe_float(line.get("quantity")),
                partner_id=int(partner_id),
                product_id=line.get("product_id"),
                company_id=company_id,
            )
            account_id = account_id or suggestion.get("suggested_account_id")
            if not tax_ids:
                tax_ids = list(suggestion.get("suggested_tax_ids") or [])

        vals: dict[str, Any] = {
            "name": line.get("name") or "Line",
            "quantity": _safe_float(line.get("quantity")) or 1.0,
            "price_unit": _safe_float(line.get("price_unit")),
        }
        if line.get("product_id"):
            vals["product_id"] = int(line["product_id"])
        if account_id:
            vals["account_id"] = int(account_id)
        if tax_ids:
            vals["tax_ids"] = [(6, 0, [int(t) for t in tax_ids])]
        line_commands.append((0, 0, vals))

    move_vals: dict[str, Any] = {
        "move_type": "in_invoice",
        "partner_id": int(partner_id),
        "invoice_date": ocr_payload.get("invoice_date"),
        "invoice_line_ids": line_commands,
        "ref": ocr_payload.get("ref") or ocr_payload.get("vendor_bill_number") or "",
    }
    if company_id:
        move_vals["company_id"] = company_id

    preview = {
        "partner_id": move_vals["partner_id"],
        "invoice_date": move_vals.get("invoice_date"),
        "ref": move_vals.get("ref"),
        "line_count": len(line_commands),
        "duplicate_risk": risk_level,
    }
    if dry_run:
        return build_success_response(
            "accounting.create_vendor_bill_from_ocr_validated",
            dry_run=True,
            preview=preview,
            move_vals=move_vals,
        )
    if not confirm:
        return {
            "ok": False,
            "status": "confirmation_required",
            "capability": "accounting.create_vendor_bill_from_ocr_validated",
            "message": "Set confirm=true to create the vendor bill.",
            "preview": preview,
        }

    kwargs: dict[str, Any] = {}
    if allowed_company_ids:
        kwargs["context"] = {"allowed_company_ids": allowed_company_ids}

    move_id = client.call_kw(
        "account.move",
        "create",
        args=[move_vals],
        kwargs=kwargs,
        sender_id=sender_id,
    )

    if attachment_id and client.model_exists("ir.attachment", sender_id=sender_id):
        client.call_kw(
            "ir.attachment",
            "write",
            args=[[attachment_id], {"res_model": "account.move", "res_id": move_id}],
            sender_id=sender_id,
        )

    return build_success_response(
        "accounting.create_vendor_bill_from_ocr_validated",
        move_id=move_id,
        duplicate_risk=risk_level,
        duplicate_candidates=duplicate_check.get("candidates", []),
        attachment_linked=bool(attachment_id),
    )
