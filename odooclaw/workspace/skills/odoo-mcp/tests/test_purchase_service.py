from unittest.mock import MagicMock

import pytest

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.purchase_service import (
    find_purchase_order,
    get_purchase_invoice_status,
    get_purchase_receipt_status,
    match_vendor_bill_to_purchase_order,
    suggest_vendor_products,
)


@pytest.fixture
def mock_client():
    return MagicMock(spec=OdooClient)


def _configure_fields(mock_client, existing_models=None, fields_by_model=None):
    existing_models = existing_models or set()
    fields_by_model = fields_by_model or {}

    def model_exists(model, sender_id=None):
        return model in existing_models

    def field_exists(model, field, sender_id=None):
        return field in fields_by_model.get(model, set())

    mock_client.model_exists.side_effect = model_exists
    mock_client.field_exists.side_effect = field_exists


def test_find_purchase_order_returns_unsupported_without_model(mock_client):
    mock_client.model_exists.return_value = False

    result = find_purchase_order(mock_client, sender_id=7, partner_id=4)

    assert result["ok"] is False
    assert result["status"] == "unsupported"


def test_get_purchase_receipt_status_falls_back_to_line_quantities(mock_client):
    _configure_fields(
        mock_client,
        existing_models={"purchase.order", "purchase.order.line"},
        fields_by_model={
            "purchase.order": {"id", "name", "order_line", "receipt_status"},
            "purchase.order.line": {
                "id",
                "product_id",
                "name",
                "product_qty",
                "qty_received",
            },
        },
    )
    mock_client.call_kw.side_effect = [
        [{"id": 20, "name": "P00020", "receipt_status": "partial", "order_line": [1]}],
        [
            {
                "id": 1,
                "product_id": [33, "Product"],
                "name": "Product",
                "product_qty": 5.0,
                "qty_received": 2.0,
            }
        ],
    ]

    result = get_purchase_receipt_status(mock_client, sender_id=7, purchase_order_id=20)

    assert result["ok"] is True
    assert result["receipt_status"] == "partial"
    assert result["lines"][0]["remaining_to_receive"] == 3.0


def test_get_purchase_invoice_status_reports_qty_to_invoice(mock_client):
    _configure_fields(
        mock_client,
        existing_models={"purchase.order", "purchase.order.line"},
        fields_by_model={
            "purchase.order": {"id", "name", "order_line", "invoice_status", "invoice_ids"},
            "purchase.order.line": {
                "id",
                "product_id",
                "name",
                "product_qty",
                "qty_invoiced",
                "qty_to_invoice",
                "price_unit",
                "invoice_status",
            },
        },
    )
    mock_client.call_kw.side_effect = [
        [{"id": 20, "name": "P00020", "invoice_status": "to invoice", "invoice_ids": []}],
        [
            {
                "id": 1,
                "product_id": [33, "Product"],
                "name": "Product",
                "product_qty": 5.0,
                "qty_invoiced": 1.0,
                "qty_to_invoice": 4.0,
                "price_unit": 10.0,
                "invoice_status": "to invoice",
            }
        ],
    ]

    result = get_purchase_invoice_status(mock_client, sender_id=7, purchase_order_id=20)

    assert result["ok"] is True
    assert result["lines"][0]["qty_to_invoice"] == 4.0


def test_match_vendor_bill_to_purchase_order_detects_line_and_discrepancies(mock_client):
    _configure_fields(
        mock_client,
        existing_models={"purchase.order", "purchase.order.line"},
        fields_by_model={
            "purchase.order": {"id", "name", "state", "partner_id", "invoice_status"},
            "purchase.order.line": {
                "id",
                "product_id",
                "name",
                "product_qty",
                "qty_invoiced",
                "qty_to_invoice",
                "price_unit",
                "taxes_id",
            },
        },
    )
    mock_client.call_kw.side_effect = [
        [{"id": 20, "name": "P00020", "state": "purchase", "invoice_status": "to invoice"}],
        [
            {
                "id": 1,
                "product_id": [33, "Product"],
                "name": "Product A",
                "product_qty": 5.0,
                "qty_invoiced": 0.0,
                "qty_to_invoice": 5.0,
                "price_unit": 10.0,
                "taxes_id": [7],
            }
        ],
    ]

    result = match_vendor_bill_to_purchase_order(
        mock_client,
        sender_id=7,
        partner_id=4,
        ocr_payload={
            "lines": [
                {
                    "product_id": 33,
                    "name": "Product A",
                    "quantity": 7.0,
                    "price_unit": 12.0,
                    "tax_ids": [9],
                }
            ]
        },
    )

    assert result["ok"] is True
    assert result["candidate"]["line_matches"][0]["score"] >= 70
    discrepancy_types = {item["type"] for item in result["discrepancies"]}
    assert {"quantity", "price", "tax"}.issubset(discrepancy_types)
    assert result["risk_level"] == "medium"


def test_suggest_vendor_products_returns_unsupported_without_supplierinfo(mock_client):
    mock_client.model_exists.return_value = False

    result = suggest_vendor_products(mock_client, sender_id=7, partner_id=4)

    assert result["ok"] is False
    assert result["status"] == "unsupported"
