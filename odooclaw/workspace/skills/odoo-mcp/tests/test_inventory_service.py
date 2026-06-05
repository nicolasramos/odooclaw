from unittest.mock import MagicMock

import pytest

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.inventory_service import (
    find_product,
    find_stock_locations,
    get_location_stock_summary,
    get_product_stock_context,
    get_stock_moves,
)


@pytest.fixture
def mock_client():
    return MagicMock(spec=OdooClient)


def _configure_capabilities(mock_client, models=None, fields_by_model=None):
    models = models or set()
    fields_by_model = fields_by_model or {}

    def model_exists(model, sender_id=None):
        return model in models

    def field_exists(model, field, sender_id=None):
        return field in fields_by_model.get(model, set())

    mock_client.model_exists.side_effect = model_exists
    mock_client.field_exists.side_effect = field_exists


def test_find_product_returns_unsupported_without_product_model(mock_client):
    mock_client.model_exists.return_value = False

    result = find_product(mock_client, sender_id=7, name="Cable")

    assert result["ok"] is False
    assert result["status"] == "unsupported"
    assert result["missing"] == ["product.product"]


def test_find_product_filters_by_vendor_supplierinfo(mock_client):
    _configure_capabilities(
        mock_client,
        models={"product.product", "product.supplierinfo"},
        fields_by_model={
            "product.product": {"id", "name", "default_code", "product_tmpl_id"},
            "product.supplierinfo": {"product_id", "product_tmpl_id"},
        },
    )
    mock_client.call_kw.side_effect = [
        [
            {"product_id": [10, "Cable A"], "product_tmpl_id": [20, "Cable"]},
        ],
        [{"id": 10, "name": "Cable A", "default_code": "CAB", "product_tmpl_id": [20, "Cable"]}],
    ]

    result = find_product(mock_client, sender_id=7, vendor_id=4, limit=5)

    assert result["ok"] is True
    assert result["count"] == 1
    supplier_call = mock_client.call_kw.call_args_list[0]
    assert supplier_call.args[:2] == ("product.supplierinfo", "search_read")
    product_call = mock_client.call_kw.call_args_list[1]
    assert product_call.args[:2] == ("product.product", "search_read")
    assert "|" in product_call.kwargs["args"][0]


def test_get_product_stock_context_aggregates_quants(mock_client):
    _configure_capabilities(
        mock_client,
        models={"product.product", "stock.quant"},
        fields_by_model={
            "product.product": {
                "id",
                "display_name",
                "qty_available",
                "virtual_available",
                "incoming_qty",
                "outgoing_qty",
                "free_qty",
            },
            "stock.quant": {
                "id",
                "product_id",
                "location_id",
                "quantity",
                "reserved_quantity",
            },
        },
    )
    mock_client.call_kw.side_effect = [
        [
            {
                "id": 10,
                "display_name": "Cable A",
                "qty_available": 8.0,
                "virtual_available": 12.0,
                "incoming_qty": 5.0,
                "outgoing_qty": 1.0,
                "free_qty": 7.0,
            }
        ],
        [
            {"id": 1, "quantity": 5.0, "reserved_quantity": 1.0},
            {"id": 2, "quantity": 3.0, "reserved_quantity": 2.0},
        ],
    ]

    result = get_product_stock_context(mock_client, sender_id=7, product_id=10)

    assert result["ok"] is True
    assert result["totals"]["quant_on_hand"] == 8.0
    assert result["totals"]["quant_reserved"] == 3.0
    assert result["totals"]["quant_available"] == 5.0
    assert result["totals"]["product_virtual_available"] == 12.0


def test_get_location_stock_summary_groups_by_product(mock_client):
    _configure_capabilities(
        mock_client,
        models={"stock.quant"},
        fields_by_model={
            "stock.quant": {
                "id",
                "product_id",
                "location_id",
                "quantity",
                "reserved_quantity",
            }
        },
    )
    mock_client.call_kw.return_value = [
        {"id": 1, "product_id": [10, "Cable A"], "quantity": 5.0, "reserved_quantity": 1.0},
        {"id": 2, "product_id": [10, "Cable A"], "quantity": 3.0, "reserved_quantity": 2.0},
        {"id": 3, "product_id": [11, "Cable B"], "quantity": 2.0, "reserved_quantity": 0.0},
    ]

    result = get_location_stock_summary(mock_client, sender_id=7, location_id=3)

    assert result["ok"] is True
    assert result["totals"]["quantity"] == 10.0
    assert result["totals"]["reserved_quantity"] == 3.0
    assert len(result["products"]) == 2
    first = next(item for item in result["products"] if item["product_id"][0] == 10)
    assert first["available_quantity"] == 5.0


def test_find_stock_locations_returns_safe_list(mock_client):
    _configure_capabilities(
        mock_client,
        models={"stock.location"},
        fields_by_model={
            "stock.location": {"id", "name", "complete_name", "usage", "active"}
        },
    )
    mock_client.call_kw.return_value = [
        {"id": 3, "name": "Stock", "complete_name": "WH/Stock", "usage": "internal", "active": True}
    ]

    result = find_stock_locations(mock_client, sender_id=7, usage="internal")

    assert result["ok"] is True
    assert result["locations"][0]["complete_name"] == "WH/Stock"


def test_get_stock_moves_returns_unsupported_without_model(mock_client):
    mock_client.model_exists.return_value = False

    result = get_stock_moves(mock_client, sender_id=7, product_id=10)

    assert result["ok"] is False
    assert result["status"] == "unsupported"
