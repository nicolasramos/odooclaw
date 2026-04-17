from typing import Any, Optional

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.invoice_service import create_vendor_invoice
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access
from odoo_mcp.services.accounting_service import (
    find_unreconciled_bank_lines,
    suggest_bank_reconciliation,
    reconcile_bank_line,
    register_invoice_payment,
    get_ar_ap_aging,
    run_period_close_checks,
    create_journal_entry,
    post_journal_entry,
    get_tax_summary,
    validate_vendor_bill_duplicate,
    suggest_expense_account_and_taxes,
    create_vendor_bill_from_ocr_validated,
)


def odoo_create_vendor_invoice(
    client: OdooClient, user_id: int, partner_id: int, lines: list, ref: str = ""
) -> int:
    """Wrapper for odoo_create_vendor_invoice tool."""
    audit_action(
        "CREATE_INVOICE",
        user_id,
        "account.move",
        [],
        {"partner_id": partner_id, "ref": ref},
    )
    return create_vendor_invoice(client, user_id, partner_id, lines, ref)


def odoo_find_unreconciled_bank_lines(
    client: OdooClient,
    user_id: int,
    journal_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
    limit: int = 50,
) -> dict:
    guard_model_access("account.bank.statement.line")
    audit_action(
        "FIND_UNRECONCILED_BANK_LINES", user_id, "account.bank.statement.line", [], {}
    )
    return find_unreconciled_bank_lines(
        client=client,
        sender_id=user_id,
        journal_id=journal_id,
        date_from=date_from,
        date_to=date_to,
        amount_min=amount_min,
        amount_max=amount_max,
        limit=limit,
    )


def odoo_suggest_bank_reconciliation(
    client: OdooClient,
    user_id: int,
    statement_line_id: int,
    tolerance_amount: float = 0.01,
    days_window: int = 30,
    limit: int = 20,
) -> dict:
    audit_action(
        "SUGGEST_BANK_RECONCILIATION",
        user_id,
        "account.bank.statement.line",
        [statement_line_id],
        {},
    )
    return suggest_bank_reconciliation(
        client=client,
        sender_id=user_id,
        statement_line_id=statement_line_id,
        tolerance_amount=tolerance_amount,
        days_window=days_window,
        limit=limit,
    )


def odoo_reconcile_bank_line(
    client: OdooClient,
    user_id: int,
    statement_line_id: int,
    move_line_ids: list[int],
    confirm: bool = False,
) -> dict:
    audit_action(
        "RECONCILE_BANK_LINE",
        user_id,
        "account.bank.statement.line",
        [statement_line_id],
        {"move_line_ids": move_line_ids, "confirm": confirm},
    )
    return reconcile_bank_line(
        client=client,
        sender_id=user_id,
        statement_line_id=statement_line_id,
        move_line_ids=move_line_ids,
        confirm=confirm,
    )


def odoo_register_invoice_payment(
    client: OdooClient,
    user_id: int,
    invoice_id: int,
    amount: Optional[float] = None,
    payment_date: Optional[str] = None,
    journal_id: Optional[int] = None,
    memo: Optional[str] = None,
) -> dict:
    audit_action("REGISTER_INVOICE_PAYMENT", user_id, "account.move", [invoice_id], {})
    return register_invoice_payment(
        client=client,
        sender_id=user_id,
        invoice_id=invoice_id,
        amount=amount,
        payment_date=payment_date,
        journal_id=journal_id,
        memo=memo,
    )


def odoo_get_ar_ap_aging(
    client: OdooClient,
    user_id: int,
    report_type: str = "both",
    as_of: Optional[str] = None,
    company_id: Optional[int] = None,
    limit: int = 500,
) -> dict:
    audit_action(
        "GET_AR_AP_AGING", user_id, "account.move", [], {"report_type": report_type}
    )
    return get_ar_ap_aging(
        client=client,
        sender_id=user_id,
        report_type=report_type,
        as_of=as_of,
        company_id=company_id,
        limit=limit,
    )


def odoo_run_period_close_checks(
    client: OdooClient,
    user_id: int,
    period_start: str,
    period_end: str,
    company_id: Optional[int] = None,
) -> dict:
    audit_action("RUN_PERIOD_CLOSE_CHECKS", user_id, "account.move", [], {})
    return run_period_close_checks(
        client=client,
        sender_id=user_id,
        period_start=period_start,
        period_end=period_end,
        company_id=company_id,
    )


def odoo_create_journal_entry(
    client: OdooClient,
    user_id: int,
    journal_id: int,
    entry_date: str,
    lines: list[dict[str, Any]],
    ref: Optional[str] = None,
    company_id: Optional[int] = None,
) -> dict:
    audit_action(
        "CREATE_JOURNAL_ENTRY", user_id, "account.move", [], {"journal_id": journal_id}
    )
    return create_journal_entry(
        client=client,
        sender_id=user_id,
        journal_id=journal_id,
        entry_date=entry_date,
        lines=lines,
        ref=ref,
        company_id=company_id,
    )


def odoo_post_journal_entry(
    client: OdooClient,
    user_id: int,
    move_id: int,
    confirm: bool = False,
) -> dict:
    audit_action(
        "POST_JOURNAL_ENTRY", user_id, "account.move", [move_id], {"confirm": confirm}
    )
    return post_journal_entry(
        client=client,
        sender_id=user_id,
        move_id=move_id,
        confirm=confirm,
    )


def odoo_get_tax_summary(
    client: OdooClient,
    user_id: int,
    date_from: str,
    date_to: str,
    company_id: Optional[int] = None,
    tax_group_id: Optional[int] = None,
) -> dict:
    audit_action("GET_TAX_SUMMARY", user_id, "account.move.line", [], {})
    return get_tax_summary(
        client=client,
        sender_id=user_id,
        date_from=date_from,
        date_to=date_to,
        company_id=company_id,
        tax_group_id=tax_group_id,
    )


def odoo_validate_vendor_bill_duplicate(
    client: OdooClient,
    user_id: int,
    partner_id: int,
    vendor_bill_number: Optional[str] = None,
    invoice_date: Optional[str] = None,
    amount_total: Optional[float] = None,
    currency_id: Optional[int] = None,
    tolerance: float = 0.01,
) -> dict:
    audit_action(
        "VALIDATE_VENDOR_BILL_DUPLICATE",
        user_id,
        "account.move",
        [],
        {"partner_id": partner_id},
    )
    return validate_vendor_bill_duplicate(
        client=client,
        sender_id=user_id,
        partner_id=partner_id,
        vendor_bill_number=vendor_bill_number,
        invoice_date=invoice_date,
        amount_total=amount_total,
        currency_id=currency_id,
        tolerance=tolerance,
    )


def odoo_suggest_expense_account_and_taxes(
    client: OdooClient,
    user_id: int,
    description: str,
    amount: float,
    partner_id: Optional[int] = None,
    product_id: Optional[int] = None,
    company_id: Optional[int] = None,
) -> dict:
    audit_action("SUGGEST_EXPENSE_ACCOUNT_TAXES", user_id, "account.move.line", [], {})
    return suggest_expense_account_and_taxes(
        client=client,
        sender_id=user_id,
        description=description,
        amount=amount,
        partner_id=partner_id,
        product_id=product_id,
        company_id=company_id,
    )


def odoo_create_vendor_bill_from_ocr_validated(
    client: OdooClient,
    user_id: int,
    ocr_payload: dict[str, Any],
    attachment_id: Optional[int] = None,
    confirm: bool = False,
    dry_run: bool = False,
    company_id: Optional[int] = None,
    allowed_company_ids: Optional[list[int]] = None,
) -> dict:
    audit_action(
        "CREATE_VENDOR_BILL_FROM_OCR_VALIDATED",
        user_id,
        "account.move",
        [],
        {"confirm": confirm, "dry_run": dry_run},
    )
    return create_vendor_bill_from_ocr_validated(
        client=client,
        sender_id=user_id,
        ocr_payload=ocr_payload,
        attachment_id=attachment_id,
        confirm=confirm,
        dry_run=dry_run,
        company_id=company_id,
        allowed_company_ids=allowed_company_ids,
    )
