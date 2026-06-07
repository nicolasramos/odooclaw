from unittest.mock import MagicMock

import pytest

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.inventory_service import (
    apply_inventory_adjustment,
    check_lot_requirements,
    find_internal_transfers,
    find_inventory_discrepancies,
    find_lot_serial,
    find_product,
    find_purchase_receipts,
    find_reordering_rules,
    find_sale_deliveries,
    find_stock_locations,
    get_location_stock_summary,
    get_logistics_capabilities,
    get_lot_traceability,
    get_product_stock_context,
    get_receipt_summary,
    get_transfer_summary,
    get_delivery_summary,
    get_stock_moves,
    match_delivery_to_sale_order,
    match_receipt_to_purchase_order,
    prepare_receipt_validation,
    get_replenishment_suggestions,
    prepare_transfer_validation,
    prepare_internal_transfer,
    prepare_inventory_adjustment,
    create_internal_transfer,
    prepare_delivery_validation,
    validate_delivery,
    validate_receipt,
    validate_transfer,
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


def test_get_logistics_capabilities_detects_optional_oca_fields(mock_client):
    _configure_capabilities(
        mock_client,
        models={"stock.picking", "purchase.order", "purchase.order.line", "sale.order"},
        fields_by_model={
            "stock.picking": {"invoice_ids"},
            "purchase.order": {"reception_status"},
            "purchase.order.line": {"reception_status", "invoice_status"},
            "sale.order": {"delivery_state"},
        },
    )

    result = get_logistics_capabilities(mock_client, sender_id=7)

    assert result["ok"] is True
    assert result["oca"]["purchase_reception_status"]["available"] is True
    assert result["oca"]["purchase_invoice_status_line"]["available"] is True
    assert result["oca"]["purchase_stock_picking_invoice_link"]["available"] is True
    assert result["oca"]["sale_stock_delivery_state"]["available"] is True


def test_get_logistics_capabilities_reports_missing_optional_oca_cleanly(mock_client):
    _configure_capabilities(mock_client, models={"stock.picking"}, fields_by_model={})

    result = get_logistics_capabilities(mock_client, sender_id=7)

    assert result["ok"] is True
    assert result["core"]["stock_picking"] is True
    assert all(capability["available"] is False for capability in result["oca"].values())


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


def test_find_lot_serial_filters_by_name_and_product(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.return_value = [
        {"id": 70, "name": "LOT-001", "product_id": [10, "Cable"]}
    ]

    result = find_lot_serial(mock_client, sender_id=7, name="LOT-001", product_id=10)

    assert result["ok"] is True
    assert result["lots"][0]["id"] == 70
    domain = mock_client.call_kw.call_args.kwargs["args"][0]
    assert ["name", "ilike", "LOT-001"] in domain
    assert ["product_id", "=", 10] in domain


def test_get_lot_traceability_returns_stock_and_move_history(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 70, "name": "LOT-001", "product_id": [10, "Cable"]}],
        [{"id": 1, "lot_id": [70, "LOT-001"], "product_id": [10, "Cable"], "location_id": [8, "Stock"], "quantity": 4.0, "reserved_quantity": 1.0}],
        [{"id": 11, "lot_id": [70, "LOT-001"], "product_id": [10, "Cable"], "location_id": [4, "Vendors"], "location_dest_id": [8, "Stock"], "quantity": 5.0, "picking_id": [30, "WH/IN/1"]}],
    ]

    result = get_lot_traceability(mock_client, sender_id=7, lot_id=70)

    assert result["ok"] is True
    assert result["totals"]["on_hand_quantity"] == 4.0
    assert result["totals"]["available_quantity"] == 3.0
    assert result["move_lines"][0]["picking_id"][1] == "WH/IN/1"


def test_check_lot_requirements_flags_serial_quantity_over_one(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 40, "state": "assigned", "picking_type_code": "outgoing"}],
        [{"id": 2, "product_id": [10, "Serial"], "product_uom_qty": 2.0, "quantity": 2.0}],
        [{"id": 21, "move_id": [2, "Move"], "product_id": [10, "Serial"], "quantity": 2.0, "lot_id": [70, "SER-001"]}],
        [{"id": 10, "tracking": "serial"}],
    ]

    result = check_lot_requirements(mock_client, sender_id=7, picking_id=40)

    assert result["ok"] is True
    assert result["requirements_met"] is False
    assert any(item["type"] == "serial_quantity_exceeds_one" for item in result["issues"])


def test_find_reordering_rules_filters_low_stock_rules(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.return_value = [
        {
            "id": 80,
            "product_id": [10, "Cable"],
            "product_min_qty": 5.0,
            "product_max_qty": 12.0,
            "qty_forecast": 3.0,
            "qty_to_order": 9.0,
        }
    ]

    result = find_reordering_rules(
        mock_client, sender_id=7, product_id=10, low_stock_only=True
    )

    assert result["ok"] is True
    assert result["rules"][0]["id"] == 80
    domain = mock_client.call_kw.call_args.kwargs["args"][0]
    assert ["product_id", "=", 10] in domain
    assert ["qty_to_order", ">", 0] in domain


def test_find_reordering_rules_returns_unsupported_without_orderpoint_model(mock_client):
    mock_client.model_exists.return_value = False

    result = find_reordering_rules(mock_client, sender_id=7)

    assert result["ok"] is False
    assert result["status"] == "unsupported"
    assert result["missing"] == ["stock.warehouse.orderpoint"]


def test_get_replenishment_suggestions_calculates_fallback_and_risk(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.return_value = [
        {
            "id": 80,
            "product_id": [10, "Cable"],
            "location_id": [8, "Stock"],
            "product_min_qty": 5.0,
            "product_max_qty": 12.0,
            "qty_forecast": 3.0,
        },
        {
            "id": 81,
            "product_id": [11, "Adapter"],
            "location_id": [8, "Stock"],
            "product_min_qty": 0.0,
            "product_max_qty": 4.0,
            "qty_forecast": -2.0,
        },
    ]

    result = get_replenishment_suggestions(mock_client, sender_id=7)

    assert result["ok"] is True
    assert result["count"] == 2
    assert result["suggestions"][0]["suggested_quantity"] == 6.0
    assert result["suggestions"][0]["risk_level"] == "critical"
    assert result["suggestions"][1]["suggested_quantity"] == 9.0


def test_find_inventory_discrepancies_returns_only_counted_differences(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.return_value = [
        {
            "id": 90,
            "product_id": [10, "Cable"],
            "location_id": [8, "Stock"],
            "quantity": 5.0,
            "inventory_quantity": 3.0,
            "inventory_diff_quantity": -2.0,
            "inventory_quantity_set": True,
        }
    ]

    result = find_inventory_discrepancies(mock_client, sender_id=7, location_id=8)

    assert result["ok"] is True
    assert result["count"] == 1
    assert result["totals"]["absolute_difference"] == 2.0
    domain = mock_client.call_kw.call_args.kwargs["args"][0]
    assert ["inventory_quantity_set", "=", True] in domain
    assert ["inventory_diff_quantity", "!=", 0] in domain


def test_prepare_inventory_adjustment_builds_preview_without_writing(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.return_value = [
        {
            "id": 90,
            "product_id": [10, "Cable"],
            "location_id": [8, "Stock"],
            "quantity": 5.0,
            "inventory_quantity": 5.0,
            "inventory_diff_quantity": 0.0,
        }
    ]

    result = prepare_inventory_adjustment(
        mock_client, sender_id=7, quant_id=90, counted_quantity=3.0
    )

    assert result["ok"] is True
    assert result["can_apply"] is True
    assert result["preview"]["current_quantity"] == 5.0
    assert result["preview"]["counted_quantity"] == 3.0
    assert result["preview"]["difference_quantity"] == -2.0
    assert result["required_confirmation"] == {"confirm": True, "dry_run": False}
    assert mock_client.call_kw.call_count == 1


def test_prepare_inventory_adjustment_blocks_negative_count(mock_client):
    result = prepare_inventory_adjustment(
        mock_client, sender_id=7, quant_id=90, counted_quantity=-1.0
    )

    assert result["ok"] is True
    assert result["can_apply"] is False
    assert result["critical"][0]["type"] == "negative_counted_quantity"


def test_apply_inventory_adjustment_requires_confirmation(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.return_value = [
        {"id": 90, "quantity": 5.0, "inventory_quantity": 5.0}
    ]

    result = apply_inventory_adjustment(
        mock_client,
        sender_id=7,
        quant_id=90,
        counted_quantity=3.0,
        confirm=False,
        dry_run=False,
    )

    assert result["ok"] is False
    assert result["status"] == "confirmation_required"
    assert mock_client.call_kw.call_count == 1


def test_apply_inventory_adjustment_writes_and_applies_when_confirmed(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 90, "quantity": 5.0, "inventory_quantity": 5.0}],
        True,
        True,
    ]

    result = apply_inventory_adjustment(
        mock_client,
        sender_id=7,
        quant_id=90,
        counted_quantity=3.0,
        confirm=True,
        dry_run=False,
    )

    assert result["ok"] is True
    assert result["applied"] is True
    write_call = mock_client.call_kw.call_args_list[1]
    assert write_call.args[:2] == ("stock.quant", "write")
    apply_call = mock_client.call_kw.call_args_list[2]
    assert apply_call.args[:2] == ("stock.quant", "action_apply_inventory")


def _receipt_capabilities(mock_client):
    _configure_capabilities(
        mock_client,
        models={
            "stock.picking",
            "stock.move",
            "stock.move.line",
            "product.product",
            "purchase.order",
            "purchase.order.line",
            "sale.order",
            "sale.order.line",
            "stock.lot",
            "stock.quant",
            "stock.warehouse.orderpoint",
        },
        fields_by_model={
            "stock.picking": {
                "id",
                "name",
                "state",
                "partner_id",
                "origin",
                "picking_type_code",
                "purchase_id",
                "sale_id",
                "location_id",
                "location_dest_id",
                "scheduled_date",
            },
            "stock.move": {
                "id",
                "picking_id",
                "purchase_line_id",
                "sale_line_id",
                "product_id",
                "product_uom_qty",
                "quantity",
                "state",
            },
            "stock.move.line": {
                "id",
                "picking_id",
                "move_id",
                "product_id",
                "quantity",
                "lot_id",
                "lot_name",
            },
            "product.product": {"id", "tracking"},
            "purchase.order.line": {
                "id",
                "product_id",
                "product_qty",
                "qty_received",
            },
            "sale.order.line": {
                "id",
                "product_id",
                "product_uom_qty",
                "qty_delivered",
                "price_unit",
                "state",
            },
            "stock.lot": {"id", "name", "product_id", "company_id"},
            "stock.quant": {
                "id",
                "lot_id",
                "product_id",
                "location_id",
                "quantity",
                "reserved_quantity",
                "inventory_quantity",
                "inventory_diff_quantity",
                "inventory_quantity_set",
                "inventory_date",
                "user_id",
            },
            "stock.warehouse.orderpoint": {
                "id",
                "name",
                "product_id",
                "location_id",
                "warehouse_id",
                "product_min_qty",
                "product_max_qty",
                "qty_forecast",
                "qty_to_order",
                "trigger",
                "route_id",
                "company_id",
            },
        },
    )


def test_find_purchase_receipts_filters_incoming_and_purchase_order(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.return_value = [
        {"id": 30, "name": "WH/IN/0001", "state": "assigned", "picking_type_code": "incoming", "purchase_id": [20, "P00020"]}
    ]

    result = find_purchase_receipts(mock_client, sender_id=7, purchase_order_id=20)

    assert result["ok"] is True
    domain = mock_client.call_kw.call_args.kwargs["args"][0]
    assert ["picking_type_code", "=", "incoming"] in domain
    assert ["purchase_id", "=", 20] in domain


def test_get_receipt_summary_flags_missing_serial_and_over_receipt(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 30, "name": "WH/IN/0001", "state": "assigned", "picking_type_code": "incoming", "purchase_id": [20, "P00020"]}],
        [{"id": 1, "product_id": [10, "Tracked"], "purchase_line_id": [100, "Line"], "product_uom_qty": 1.0, "quantity": 2.0, "state": "assigned"}],
        [{"id": 11, "move_id": [1, "Move"], "product_id": [10, "Tracked"], "quantity": 2.0, "lot_id": False, "lot_name": False}],
        [{"id": 10, "tracking": "serial"}],
    ]

    result = get_receipt_summary(mock_client, sender_id=7, picking_id=30)

    assert result["ok"] is True
    types = {item["type"] for item in result["discrepancies"]}
    assert {"missing_lot_serial", "over_receipt"}.issubset(types)
    assert result["lines"][0]["missing_tracking"] is True


def test_match_receipt_to_purchase_order_matches_purchase_line(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 30, "name": "WH/IN/0001", "state": "assigned", "picking_type_code": "incoming", "purchase_id": [20, "P00020"]}],
        [{"id": 1, "product_id": [10, "Cable"], "purchase_line_id": [100, "Line"], "product_uom_qty": 5.0, "quantity": 5.0, "state": "assigned"}],
        [],
        [{"id": 10, "tracking": "none"}],
        [{"id": 100, "product_id": [10, "Cable"], "product_qty": 5.0, "qty_received": 5.0}],
    ]

    result = match_receipt_to_purchase_order(mock_client, sender_id=7, picking_id=30)

    assert result["ok"] is True
    assert result["purchase_order_id"] == 20
    assert result["risk_level"] == "low"
    assert result["matches"][0]["purchase_order_line"]["id"] == 100


def test_prepare_receipt_validation_blocks_done_receipt(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 30, "name": "WH/IN/0001", "state": "done", "picking_type_code": "incoming"}],
        [{"id": 1, "product_id": [10, "Cable"], "product_uom_qty": 5.0, "quantity": 5.0, "state": "done"}],
        [],
        [{"id": 10, "tracking": "none"}],
    ]

    result = prepare_receipt_validation(mock_client, sender_id=7, picking_id=30)

    assert result["ok"] is True
    assert result["can_validate"] is False
    assert any(item["type"] == "invalid_state" for item in result["critical"])


def test_validate_receipt_returns_action_required_for_backorder_wizard(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 30, "name": "WH/IN/0001", "state": "assigned", "picking_type_code": "incoming"}],
        [{"id": 1, "product_id": [10, "Cable"], "product_uom_qty": 5.0, "quantity": 3.0, "state": "assigned"}],
        [],
        [{"id": 10, "tracking": "none"}],
        {"type": "ir.actions.act_window", "res_model": "stock.backorder.confirmation"},
    ]

    result = validate_receipt(
        mock_client, sender_id=7, picking_id=30, confirm=True, dry_run=False
    )

    assert result["ok"] is False
    assert result["status"] == "action_required"
    assert result["action"]["res_model"] == "stock.backorder.confirmation"


def test_find_sale_deliveries_filters_outgoing_and_sale_order(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.return_value = [{"id": 40, "picking_type_code": "outgoing"}]

    result = find_sale_deliveries(mock_client, sender_id=7, sale_order_id=22)

    assert result["ok"] is True
    domain = mock_client.call_kw.call_args.kwargs["args"][0]
    assert ["picking_type_code", "=", "outgoing"] in domain
    assert ["sale_id", "=", 22] in domain


def test_get_delivery_summary_flags_over_delivery(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 40, "state": "assigned", "picking_type_code": "outgoing"}],
        [{"id": 2, "product_id": [10, "Cable"], "product_uom_qty": 2.0, "quantity": 3.0}],
        [],
        [{"id": 10, "tracking": "none"}],
    ]

    result = get_delivery_summary(mock_client, sender_id=7, picking_id=40)

    assert result["ok"] is True
    assert any(item["type"] == "over_delivery" for item in result["discrepancies"])


def test_match_delivery_to_sale_order_matches_sale_line_and_flags_backorder(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 40, "name": "WH/OUT/0001", "state": "assigned", "picking_type_code": "outgoing", "sale_id": [22, "S00022"]}],
        [{"id": 2, "product_id": [10, "Cable"], "sale_line_id": [200, "Line"], "product_uom_qty": 5.0, "quantity": 3.0, "state": "assigned"}],
        [],
        [{"id": 10, "tracking": "none"}],
        [{"id": 200, "product_id": [10, "Cable"], "product_uom_qty": 5.0, "qty_delivered": 3.0}],
    ]

    result = match_delivery_to_sale_order(mock_client, sender_id=7, picking_id=40)

    assert result["ok"] is True
    assert result["sale_order_id"] == 22
    assert result["risk_level"] == "medium"
    assert result["matches"][0]["sale_order_line"]["id"] == 200
    assert result["matches"][0]["delivery_remaining_quantity"] == 2.0
    assert any(item["type"] == "backorder_risk" for item in result["discrepancies"])


def test_match_delivery_to_sale_order_flags_product_not_in_order(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 40, "name": "WH/OUT/0001", "state": "assigned", "picking_type_code": "outgoing", "sale_id": [22, "S00022"]}],
        [{"id": 2, "product_id": [10, "Cable"], "product_uom_qty": 2.0, "quantity": 2.0, "state": "assigned"}],
        [],
        [{"id": 10, "tracking": "none"}],
        [{"id": 201, "product_id": [11, "Other"], "product_uom_qty": 2.0, "qty_delivered": 0.0}],
    ]

    result = match_delivery_to_sale_order(mock_client, sender_id=7, picking_id=40)

    assert result["ok"] is True
    assert result["risk_level"] == "high"
    assert result["matches"] == []
    assert any(item["type"] == "product_not_in_sale_order" for item in result["discrepancies"])


def test_match_delivery_to_sale_order_returns_unsupported_without_sale_lines(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.model_exists.side_effect = lambda model, sender_id=None: model != "sale.order.line"
    mock_client.call_kw.side_effect = [
        [{"id": 40, "name": "WH/OUT/0001", "state": "assigned", "picking_type_code": "outgoing", "sale_id": [22, "S00022"]}],
        [{"id": 2, "product_id": [10, "Cable"], "sale_line_id": [200, "Line"], "product_uom_qty": 5.0, "quantity": 3.0, "state": "assigned"}],
        [],
        [{"id": 10, "tracking": "none"}],
    ]

    result = match_delivery_to_sale_order(mock_client, sender_id=7, picking_id=40)

    assert result["ok"] is False
    assert result["status"] == "unsupported"
    assert result["missing"] == ["sale.order.line"]


def test_validate_delivery_returns_action_required_for_wizard(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 40, "state": "assigned", "picking_type_code": "outgoing"}],
        [{"id": 2, "product_id": [10, "Cable"], "product_uom_qty": 5.0, "quantity": 3.0}],
        [],
        [{"id": 10, "tracking": "none"}],
        {"type": "ir.actions.act_window", "res_model": "stock.backorder.confirmation"},
    ]

    result = validate_delivery(
        mock_client, sender_id=7, picking_id=40, confirm=True, dry_run=False
    )

    assert result["status"] == "action_required"


def test_find_internal_transfers_filters_internal(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.return_value = [{"id": 50, "picking_type_code": "internal"}]

    result = find_internal_transfers(mock_client, sender_id=7)

    assert result["ok"] is True
    domain = mock_client.call_kw.call_args.kwargs["args"][0]
    assert ["picking_type_code", "=", "internal"] in domain


def test_prepare_transfer_validation_blocks_same_location(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 50, "state": "assigned", "picking_type_code": "internal", "location_id": [8, "Stock"], "location_dest_id": [8, "Stock"]}],
        [{"id": 3, "product_id": [10, "Cable"], "product_uom_qty": 2.0, "quantity": 2.0}],
        [],
        [{"id": 10, "tracking": "none"}],
    ]

    result = prepare_transfer_validation(mock_client, sender_id=7, picking_id=50)

    assert result["can_validate"] is False
    assert any(item["type"] == "same_source_destination" for item in result["critical"])


def test_validate_transfer_requires_confirmation(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 50, "state": "assigned", "picking_type_code": "internal", "location_id": [8, "Stock"], "location_dest_id": [9, "Shelf"]}],
        [{"id": 3, "product_id": [10, "Cable"], "product_uom_qty": 2.0, "quantity": 2.0}],
        [],
        [{"id": 10, "tracking": "none"}],
    ]

    result = validate_transfer(
        mock_client, sender_id=7, picking_id=50, confirm=False, dry_run=False
    )

    assert result["status"] == "confirmation_required"


def test_prepare_internal_transfer_returns_atomic_preview(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 4, "name": "Internal Transfers", "code": "internal", "default_location_src_id": [8, "Stock"], "default_location_dest_id": [9, "Shelf"]}],
        [{"id": 8, "display_name": "WH/Stock", "usage": "internal"}, {"id": 9, "display_name": "WH/Shelf", "usage": "internal"}],
        [{"id": 10, "display_name": "Cable", "uom_id": [1, "Units"]}],
    ]

    result = prepare_internal_transfer(
        mock_client,
        sender_id=7,
        location_id=8,
        location_dest_id=9,
        lines=[{"product_id": 10, "quantity": 2.0}],
    )

    assert result["ok"] is True
    assert result["can_create"] is True
    assert result["preview"]["picking_vals"]["picking_type_id"] == 4
    assert result["preview"]["picking_vals"]["move_ids"][0][2]["product_uom_qty"] == 2.0


def test_prepare_internal_transfer_blocks_same_location(mock_client):
    result = prepare_internal_transfer(
        mock_client,
        sender_id=7,
        location_id=8,
        location_dest_id=8,
        lines=[{"product_id": 10, "quantity": 2.0}],
    )

    assert result["can_create"] is False
    assert any(item["type"] == "same_source_destination" for item in result["critical"])


def test_create_internal_transfer_requires_confirmation(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 4, "code": "internal"}],
        [{"id": 8, "usage": "internal"}, {"id": 9, "usage": "internal"}],
        [{"id": 10, "display_name": "Cable", "uom_id": [1, "Units"]}],
    ]

    result = create_internal_transfer(
        mock_client,
        sender_id=7,
        location_id=8,
        location_dest_id=9,
        lines=[{"product_id": 10, "quantity": 2.0}],
        confirm=False,
        dry_run=False,
    )

    assert result["status"] == "confirmation_required"


def test_create_internal_transfer_creates_picking_atomically(mock_client):
    _receipt_capabilities(mock_client)
    mock_client.call_kw.side_effect = [
        [{"id": 4, "code": "internal"}],
        [{"id": 8, "usage": "internal"}, {"id": 9, "usage": "internal"}],
        [{"id": 10, "display_name": "Cable", "uom_id": [1, "Units"]}],
        55,
    ]

    result = create_internal_transfer(
        mock_client,
        sender_id=7,
        location_id=8,
        location_dest_id=9,
        lines=[{"product_id": 10, "quantity": 2.0}],
        confirm=True,
        dry_run=False,
    )

    assert result["ok"] is True
    assert result["picking_id"] == 55
    create_call = mock_client.call_kw.call_args_list[-1]
    assert create_call.args[:2] == ("stock.picking", "create")
    assert create_call.kwargs["args"][0]["move_ids"][0][0] == 0
