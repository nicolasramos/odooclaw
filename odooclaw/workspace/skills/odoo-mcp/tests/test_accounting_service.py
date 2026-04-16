from unittest.mock import MagicMock

import pytest

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.accounting_service import (
    create_journal_entry,
    create_vendor_bill_from_ocr_validated,
    find_unreconciled_bank_lines,
    get_ar_ap_aging,
    post_journal_entry,
    register_invoice_payment,
    run_period_close_checks,
    suggest_expense_account_and_taxes,
    validate_vendor_bill_duplicate,
)


@pytest.fixture
def mock_client():
    return MagicMock(spec=OdooClient)


def test_find_unreconciled_bank_lines_returns_unsupported_without_model(mock_client):
    mock_client.model_exists.return_value = False

    result = find_unreconciled_bank_lines(mock_client, sender_id=7)

    assert result["ok"] is False
    assert result["status"] == "unsupported"


def test_register_invoice_payment_blocks_non_posted_invoice(mock_client):
    mock_client.model_exists.side_effect = [True, True]
    mock_client.call_kw.return_value = [
        {
            "id": 10,
            "state": "draft",
            "payment_state": "not_paid",
            "amount_residual": 100.0,
        }
    ]

    result = register_invoice_payment(mock_client, sender_id=7, invoice_id=10)

    assert result["ok"] is False
    assert result["status"] == "invalid_state"


def test_register_invoice_payment_returns_before_after_residuals(mock_client):
    mock_client.model_exists.side_effect = [True, True]
    mock_client.call_kw.side_effect = [
        [
            {
                "id": 10,
                "state": "posted",
                "payment_state": "not_paid",
                "amount_residual": 100.0,
                "amount_total": 100.0,
            }
        ],
        801,
        True,
        [{"id": 10, "payment_state": "paid", "amount_residual": 0.0}],
    ]

    result = register_invoice_payment(
        mock_client,
        sender_id=7,
        invoice_id=10,
        amount=100.0,
        payment_date="2026-04-15",
    )

    assert result["ok"] is True
    assert result["payment_state_after"] == "paid"
    assert result["residual_after"] == 0.0


def test_get_ar_ap_aging_buckets_overdue_amounts(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.return_value = [
        {
            "id": 1,
            "name": "INV/001",
            "partner_id": [3, "ACME"],
            "move_type": "out_invoice",
            "invoice_date_due": "2026-03-01",
            "amount_residual": 150.0,
            "currency_id": [1, "EUR"],
        }
    ]

    result = get_ar_ap_aging(
        mock_client,
        sender_id=7,
        report_type="receivable",
        as_of="2026-04-15",
    )

    assert result["ok"] is True
    assert result["totals"]["31_60"] == 150.0


def test_run_period_close_checks_flags_critical_items(mock_client):
    mock_client.model_exists.side_effect = [True, True]
    mock_client.call_kw.side_effect = [2, 1, 3]

    result = run_period_close_checks(
        mock_client,
        sender_id=7,
        period_start="2026-04-01",
        period_end="2026-04-30",
    )

    assert result["ok"] is True
    assert result["go_no_go"] is False
    assert result["checks"]["draft_moves"] == 2
    assert result["checks"]["unreconciled_bank_lines"] == 3


def test_create_journal_entry_requires_balanced_lines(mock_client):
    mock_client.model_exists.return_value = True

    with pytest.raises(ValueError, match="not balanced"):
        create_journal_entry(
            mock_client,
            sender_id=7,
            journal_id=5,
            entry_date="2026-04-15",
            lines=[
                {"account_id": 101, "debit": 100.0, "credit": 0.0, "name": "D"},
                {"account_id": 201, "debit": 0.0, "credit": 90.0, "name": "C"},
            ],
        )


def test_post_journal_entry_requires_confirmation(mock_client):
    result = post_journal_entry(mock_client, sender_id=7, move_id=44, confirm=False)

    assert result["ok"] is False
    assert result["status"] == "confirmation_required"


def test_validate_vendor_bill_duplicate_returns_high_risk(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.return_value = [
        {
            "id": 90,
            "name": "BILL/90",
            "ref": "SUP-001",
            "invoice_date": "2026-04-10",
            "amount_total": 250.0,
            "currency_id": [1, "EUR"],
            "state": "posted",
            "payment_state": "not_paid",
        }
    ]

    result = validate_vendor_bill_duplicate(
        mock_client,
        sender_id=7,
        partner_id=4,
        vendor_bill_number="SUP-001",
        invoice_date="2026-04-10",
        amount_total=250.0,
    )

    assert result["ok"] is True
    assert result["risk_level"] == "high"
    assert len(result["candidates"]) == 1


def test_suggest_expense_account_and_taxes_falls_back_to_product(mock_client):
    mock_client.model_exists.side_effect = [True, True]
    mock_client.call_kw.side_effect = [
        [],
        [
            {
                "property_account_expense_id": [501, "Expenses"],
                "supplier_taxes_id": [7, 9],
            }
        ],
    ]

    result = suggest_expense_account_and_taxes(
        mock_client,
        sender_id=7,
        description="Hotel",
        amount=120.0,
        product_id=33,
    )

    assert result["ok"] is True
    assert result["suggested_account_id"] == 501
    assert result["suggested_tax_ids"] == [7, 9]


def test_create_vendor_bill_from_ocr_validated_returns_preview_in_dry_run(mock_client):
    mock_client.model_exists.side_effect = [True, True, True]
    mock_client.call_kw.side_effect = [
        [],
        [],
    ]

    result = create_vendor_bill_from_ocr_validated(
        mock_client,
        sender_id=7,
        ocr_payload={
            "partner_id": 12,
            "invoice_date": "2026-04-15",
            "ref": "F-123",
            "amount_total": 100.0,
            "lines": [{"name": "Service", "quantity": 1.0, "price_unit": 100.0}],
        },
        dry_run=True,
    )

    assert result["ok"] is True
    assert result["dry_run"] is True
    assert result["preview"]["partner_id"] == 12
