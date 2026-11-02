from unittest.mock import MagicMock

import pytest

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.sales_service import create_invoice_from_sale_order


@pytest.fixture
def mock_client():
    return MagicMock(spec=OdooClient)


def _order(state="sale", invoice_status="to invoice", lines=None):
    return {
        "id": 4,
        "name": "S00004",
        "partner_id": [8, "Cliente Prueba"],
        "state": state,
        "invoice_status": invoice_status,
        "order_line": [11, 12] if lines is None else lines,
    }


def _line(product_id, qty, price, discount=0.0, taxes=None):
    return {
        "product_id": [product_id, "Producto"],
        "name": "Linea",
        "product_uom_qty": qty,
        "price_unit": price,
        "discount": discount,
        "tax_id": taxes or [],
    }


def test_creates_customer_invoice_from_confirmed_order(mock_client):
    mock_client.call_kw.side_effect = [
        [_order()],
        [_line(1, 2, 100.0, 0.0, [3])],
        7,  # account.move create returns the new id
        [
            {
                "id": 7,
                "name": "INV/2026/0001",
                "amount_total": 230.0,
                "state": "draft",
                "move_type": "out_invoice",
                "partner_id": [8, "Cliente Prueba"],
            }
        ],
    ]

    result = create_invoice_from_sale_order(mock_client, 2, 4)

    assert result["id"] == 7
    assert result["amount_total"] == 230.0
    assert result["move_type"] == "out_invoice"
    assert result["origin"] == "S00004"

    create_call = mock_client.call_kw.call_args_list[2]
    assert create_call.args[0] == "account.move"
    assert create_call.args[1] == "create"
    values = create_call.kwargs["args"][0]
    assert values["move_type"] == "out_invoice"
    assert values["partner_id"] == 8
    assert values["invoice_origin"] == "S00004"
    line_vals = values["invoice_line_ids"][0][2]
    assert line_vals["product_id"] == 1
    assert line_vals["quantity"] == 2
    assert line_vals["price_unit"] == 100.0
    assert line_vals["tax_ids"] == [(6, 0, [3])]


def test_rejects_unconfirmed_order(mock_client):
    mock_client.call_kw.side_effect = [[_order(state="draft")]]

    result = create_invoice_from_sale_order(mock_client, 2, 4)

    assert "confirm it before invoicing" in result["error"]
    assert mock_client.call_kw.call_count == 1


def test_rejects_already_invoiced_order(mock_client):
    mock_client.call_kw.side_effect = [[_order(invoice_status="invoiced")]]

    result = create_invoice_from_sale_order(mock_client, 2, 4)

    assert result["error"] == "Sale order S00004 is already invoiced"


def test_rejects_order_without_lines(mock_client):
    mock_client.call_kw.side_effect = [[_order(lines=[])]]

    result = create_invoice_from_sale_order(mock_client, 2, 4)

    assert result["error"] == "Sale order S00004 has no lines"


def test_rejects_missing_order(mock_client):
    mock_client.call_kw.side_effect = [[]]

    result = create_invoice_from_sale_order(mock_client, 2, 999)

    assert result["error"] == "Sale order not found"
