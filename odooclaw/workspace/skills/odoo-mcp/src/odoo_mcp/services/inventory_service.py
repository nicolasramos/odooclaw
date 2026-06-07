from __future__ import annotations

from typing import Any, Optional

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.capability_service import (
    build_success_response,
    build_unsupported_response,
)
import logging

_logger = logging.getLogger(__name__)


def _safe_float(value: Any) -> float:
    if value in (None, False, ""):
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _safe_int(value: Any) -> Optional[int]:
    if value in (None, False, ""):
        return None
    if isinstance(value, (list, tuple)) and value:
        value = value[0]
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _model_available(client: OdooClient, model: str, sender_id: int) -> bool:
    try:
        return bool(client.model_exists(model, sender_id=sender_id))
    except Exception:
        return False


def _field_available(client: OdooClient, model: str, field: str, sender_id: int) -> bool:
    try:
        return bool(client.field_exists(model, field, sender_id=sender_id))
    except Exception:
        return False


def _available_fields(
    client: OdooClient, model: str, sender_id: int, fields: list[str]
) -> list[str]:
    return [field for field in fields if _field_available(client, model, field, sender_id)]


def _stock_capabilities(client: OdooClient, sender_id: int) -> dict[str, bool]:
    return {
        "product_product": _model_available(client, "product.product", sender_id),
        "product_template": _model_available(client, "product.template", sender_id),
        "product_supplierinfo": _model_available(client, "product.supplierinfo", sender_id),
        "stock_quant": _model_available(client, "stock.quant", sender_id),
        "stock_location": _model_available(client, "stock.location", sender_id),
        "stock_warehouse": _model_available(client, "stock.warehouse", sender_id),
        "stock_move": _model_available(client, "stock.move", sender_id),
        "stock_picking": _model_available(client, "stock.picking", sender_id),
        "lot_model": _model_available(client, "stock.lot", sender_id)
        or _model_available(client, "stock.production.lot", sender_id),
        "free_qty": _field_available(client, "product.product", "free_qty", sender_id),
        "virtual_available": _field_available(
            client, "product.product", "virtual_available", sender_id
        ),
        "reserved_quantity": _field_available(
            client, "stock.quant", "reserved_quantity", sender_id
        ),
    }


def get_logistics_capabilities(client: OdooClient, sender_id: int) -> dict:
    def optional_capability(
        repository: str,
        module: str,
        signals: list[tuple[str, str]],
    ) -> dict[str, Any]:
        detected = [
            {"model": model, "field": field}
            for model, field in signals
            if _field_available(client, model, field, sender_id)
        ]
        return {
            "available": bool(detected),
            "repository": repository,
            "module": module,
            "detected_signals": detected,
        }

    return build_success_response(
        "inventory.get_logistics_capabilities",
        core={
            "stock_picking": _model_available(client, "stock.picking", sender_id),
            "stock_move": _model_available(client, "stock.move", sender_id),
            "stock_move_line": _model_available(client, "stock.move.line", sender_id),
            "stock_quant": _model_available(client, "stock.quant", sender_id),
            "stock_lot": bool(_lot_model(client, sender_id)),
            "stock_orderpoint": _model_available(
                client, "stock.warehouse.orderpoint", sender_id
            ),
        },
        oca={
            "purchase_reception_status": optional_capability(
                "OCA/purchase-workflow",
                "purchase_reception_status",
                [("purchase.order", "reception_status")],
            ),
            "purchase_reception_status_line": optional_capability(
                "OCA/purchase-workflow",
                "purchase_reception_status_line",
                [("purchase.order.line", "reception_status")],
            ),
            "purchase_invoice_status_line": optional_capability(
                "OCA/purchase-workflow",
                "purchase_invoice_status_line",
                [("purchase.order.line", "invoice_status")],
            ),
            "purchase_stock_picking_invoice_link": optional_capability(
                "OCA/stock-logistics-workflow",
                "purchase_stock_picking_invoice_link",
                [("stock.picking", "invoice_ids"), ("account.move", "picking_ids")],
            ),
            "sale_stock_delivery_state": optional_capability(
                "OCA/sale-workflow",
                "sale_stock_delivery_state",
                [("sale.order", "delivery_state")],
            ),
            "stock_picking_backorder_strategy": optional_capability(
                "OCA/stock-logistics-workflow",
                "stock_picking_backorder_strategy",
                [
                    ("stock.picking", "backorder_strategy"),
                    ("stock.picking.type", "backorder_strategy"),
                ],
            ),
            "stock_picking_auto_create_lot": optional_capability(
                "OCA/stock-logistics-workflow",
                "stock_picking_auto_create_lot",
                [
                    ("stock.picking.type", "auto_create_lot"),
                    ("stock.picking.type", "auto_create_lots"),
                ],
            ),
        },
        behavior="Optional OCA capabilities are detected by model/field signals; no module is required.",
    )


def _product_fields(client: OdooClient, sender_id: int) -> list[str]:
    return _available_fields(
        client,
        "product.product",
        sender_id,
        [
            "id",
            "display_name",
            "name",
            "default_code",
            "barcode",
            "product_tmpl_id",
            "categ_id",
            "type",
            "detailed_type",
            "uom_id",
            "uom_po_id",
            "lst_price",
            "standard_price",
            "currency_id",
            "sale_ok",
            "purchase_ok",
            "active",
            "qty_available",
            "virtual_available",
            "incoming_qty",
            "outgoing_qty",
            "free_qty",
            "tracking",
            "taxes_id",
            "supplier_taxes_id",
        ],
    )


def _product_domain(
    client: OdooClient,
    sender_id: int,
    name: Optional[str] = None,
    default_code: Optional[str] = None,
    barcode: Optional[str] = None,
    category_id: Optional[int] = None,
    vendor_id: Optional[int] = None,
) -> list[Any]:
    domain: list[Any] = []
    if name:
        domain.append(["name", "ilike", name])
    if default_code:
        domain.append(["default_code", "ilike", default_code])
    if barcode:
        domain.append(["barcode", "=", barcode])
    if category_id:
        domain.append(["categ_id", "=", category_id])

    if vendor_id and _model_available(client, "product.supplierinfo", sender_id):
        supplier_fields = _available_fields(
            client,
            "product.supplierinfo",
            sender_id,
            ["product_id", "product_tmpl_id"],
        )
        supplier_rows = client.call_kw(
            "product.supplierinfo",
            "search_read",
            args=[[["partner_id", "=", vendor_id]]],
            kwargs={"fields": supplier_fields, "limit": 500},
            sender_id=sender_id,
        )
        product_ids = [
            int(row["product_id"][0])
            for row in supplier_rows
            if row.get("product_id")
        ]
        tmpl_ids = [
            int(row["product_tmpl_id"][0])
            for row in supplier_rows
            if row.get("product_tmpl_id")
        ]
        if product_ids and tmpl_ids:
            domain.extend(["|", ["id", "in", product_ids], ["product_tmpl_id", "in", tmpl_ids]])
        elif product_ids:
            domain.append(["id", "in", product_ids])
        elif tmpl_ids:
            domain.append(["product_tmpl_id", "in", tmpl_ids])
        else:
            domain.append(["id", "=", 0])

    return domain


def find_product(
    client: OdooClient,
    sender_id: int,
    name: Optional[str] = None,
    default_code: Optional[str] = None,
    barcode: Optional[str] = None,
    category_id: Optional[int] = None,
    vendor_id: Optional[int] = None,
    limit: int = 10,
) -> dict:
    if not _model_available(client, "product.product", sender_id):
        return build_unsupported_response(
            "inventory.find_product",
            "product.product model is not available in this Odoo instance.",
            ["product.product"],
        )

    domain = _product_domain(
        client, sender_id, name, default_code, barcode, category_id, vendor_id
    )
    rows = client.call_kw(
        "product.product",
        "search_read",
        args=[domain],
        kwargs={"fields": _product_fields(client, sender_id), "limit": limit, "order": "id desc"},
        sender_id=sender_id,
    )
    return build_success_response(
        "inventory.find_product",
        count=len(rows),
        products=rows,
        stock_capabilities=_stock_capabilities(client, sender_id),
    )


def get_product_supplier_info(
    client: OdooClient,
    sender_id: int,
    product_id: int,
    partner_id: Optional[int] = None,
    limit: int = 20,
) -> dict:
    if not _model_available(client, "product.supplierinfo", sender_id):
        return build_unsupported_response(
            "inventory.get_product_supplier_info",
            "product.supplierinfo model is not available in this Odoo instance.",
            ["product.supplierinfo"],
        )

    product_rows = client.call_kw(
        "product.product",
        "read",
        args=[[product_id]],
        kwargs={"fields": _available_fields(client, "product.product", sender_id, ["id", "product_tmpl_id"])},
        sender_id=sender_id,
    )
    if not product_rows:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "inventory.get_product_supplier_info",
            "message": f"Product {product_id} was not found.",
        }

    tmpl_ref = product_rows[0].get("product_tmpl_id")
    tmpl_id = int(tmpl_ref[0]) if tmpl_ref else None
    domain: list[Any] = []
    if tmpl_id:
        domain.extend(["|", ["product_id", "=", product_id], ["product_tmpl_id", "=", tmpl_id]])
    else:
        domain.append(["product_id", "=", product_id])
    if partner_id:
        domain.append(["partner_id", "=", partner_id])

    fields = _available_fields(
        client,
        "product.supplierinfo",
        sender_id,
        [
            "id",
            "partner_id",
            "product_id",
            "product_tmpl_id",
            "product_name",
            "product_code",
            "min_qty",
            "price",
            "currency_id",
            "delay",
            "sequence",
            "company_id",
        ],
    )
    rows = client.call_kw(
        "product.supplierinfo",
        "search_read",
        args=[domain],
        kwargs={"fields": fields, "limit": limit, "order": "sequence asc, min_qty asc"},
        sender_id=sender_id,
    )
    return build_success_response(
        "inventory.get_product_supplier_info",
        product_id=product_id,
        partner_id=partner_id,
        count=len(rows),
        suppliers=rows,
    )


def get_product_stock_context(
    client: OdooClient,
    sender_id: int,
    product_id: int,
    location_id: Optional[int] = None,
) -> dict:
    if not _model_available(client, "product.product", sender_id):
        return build_unsupported_response(
            "inventory.get_product_stock_context",
            "product.product model is not available in this Odoo instance.",
            ["product.product"],
        )

    product_fields = _available_fields(
        client,
        "product.product",
        sender_id,
        [
            "id",
            "display_name",
            "default_code",
            "qty_available",
            "virtual_available",
            "incoming_qty",
            "outgoing_qty",
            "free_qty",
        ],
    )
    products = client.call_kw(
        "product.product",
        "read",
        args=[[product_id]],
        kwargs={"fields": product_fields},
        sender_id=sender_id,
    )
    if not products:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "inventory.get_product_stock_context",
            "message": f"Product {product_id} was not found.",
        }

    quants = []
    if _model_available(client, "stock.quant", sender_id):
        domain: list[Any] = [["product_id", "=", product_id]]
        if location_id:
            domain.append(["location_id", "=", location_id])
        quant_fields = _available_fields(
            client,
            "stock.quant",
            sender_id,
            ["id", "product_id", "location_id", "quantity", "reserved_quantity", "available_quantity", "lot_id", "company_id"],
        )
        quants = client.call_kw(
            "stock.quant",
            "search_read",
            args=[domain],
            kwargs={"fields": quant_fields, "limit": 500},
            sender_id=sender_id,
        )

    total_on_hand = round(sum(_safe_float(q.get("quantity")) for q in quants), 4)
    total_reserved = round(sum(_safe_float(q.get("reserved_quantity")) for q in quants), 4)
    return build_success_response(
        "inventory.get_product_stock_context",
        product=products[0],
        location_id=location_id,
        quants=quants,
        totals={
            "quant_on_hand": total_on_hand,
            "quant_reserved": total_reserved,
            "quant_available": round(total_on_hand - total_reserved, 4),
            "product_qty_available": _safe_float(products[0].get("qty_available")),
            "product_virtual_available": _safe_float(products[0].get("virtual_available")),
            "product_incoming_qty": _safe_float(products[0].get("incoming_qty")),
            "product_outgoing_qty": _safe_float(products[0].get("outgoing_qty")),
            "product_free_qty": _safe_float(products[0].get("free_qty")),
        },
        stock_capabilities=_stock_capabilities(client, sender_id),
    )


def get_product_summary(client: OdooClient, sender_id: int, product_id: int) -> dict:
    if not _model_available(client, "product.product", sender_id):
        return build_unsupported_response(
            "inventory.get_product_summary",
            "product.product model is not available in this Odoo instance.",
            ["product.product"],
        )
    rows = client.call_kw(
        "product.product",
        "read",
        args=[[product_id]],
        kwargs={"fields": _product_fields(client, sender_id)},
        sender_id=sender_id,
    )
    if not rows:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "inventory.get_product_summary",
            "message": f"Product {product_id} was not found.",
        }
    supplier_info = get_product_supplier_info(client, sender_id, product_id)
    if not supplier_info.get("ok"):
        supplier_info = {"suppliers": [], "status": supplier_info.get("status")}
    stock_context = get_product_stock_context(client, sender_id, product_id)
    return build_success_response(
        "inventory.get_product_summary",
        product=rows[0],
        supplier_info=supplier_info.get("suppliers", []),
        stock_context=stock_context if stock_context.get("ok") else None,
        stock_capabilities=_stock_capabilities(client, sender_id),
    )


def get_stock_availability(
    client: OdooClient,
    sender_id: int,
    product_ids: list[int],
    location_id: Optional[int] = None,
) -> dict:
    if not product_ids:
        raise ValueError("product_ids must include at least one product ID.")
    availability = [
        get_product_stock_context(client, sender_id, product_id, location_id)
        for product_id in product_ids
    ]
    return build_success_response(
        "inventory.get_stock_availability",
        product_ids=product_ids,
        location_id=location_id,
        availability=availability,
        stock_capabilities=_stock_capabilities(client, sender_id),
    )


def _orderpoint_fields(client: OdooClient, sender_id: int) -> list[str]:
    return _available_fields(
        client,
        "stock.warehouse.orderpoint",
        sender_id,
        [
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
        ],
    )


def find_reordering_rules(
    client: OdooClient,
    sender_id: int,
    product_id: Optional[int] = None,
    location_id: Optional[int] = None,
    company_id: Optional[int] = None,
    low_stock_only: bool = False,
    limit: int = 50,
) -> dict:
    model = "stock.warehouse.orderpoint"
    if not _model_available(client, model, sender_id):
        return build_unsupported_response(
            "inventory.find_reordering_rules",
            "stock.warehouse.orderpoint model is not available in this Odoo instance.",
            [model],
        )
    domain: list[Any] = []
    if product_id:
        domain.append(["product_id", "=", product_id])
    if location_id:
        domain.append(["location_id", "=", location_id])
    if company_id and _field_available(client, model, "company_id", sender_id):
        domain.append(["company_id", "=", company_id])
    if low_stock_only and _field_available(client, model, "qty_to_order", sender_id):
        domain.append(["qty_to_order", ">", 0])
    rules = client.call_kw(
        model,
        "search_read",
        args=[domain],
        kwargs={"fields": _orderpoint_fields(client, sender_id), "limit": limit, "order": "id asc"},
        sender_id=sender_id,
    )
    return build_success_response(
        "inventory.find_reordering_rules",
        count=len(rules),
        rules=rules,
        low_stock_only=low_stock_only,
    )


def get_replenishment_suggestions(
    client: OdooClient,
    sender_id: int,
    product_id: Optional[int] = None,
    location_id: Optional[int] = None,
    company_id: Optional[int] = None,
    limit: int = 50,
) -> dict:
    rules_result = find_reordering_rules(
        client,
        sender_id,
        product_id=product_id,
        location_id=location_id,
        company_id=company_id,
        low_stock_only=False,
        limit=limit,
    )
    if not rules_result.get("ok"):
        rules_result["capability"] = "inventory.get_replenishment_suggestions"
        return rules_result

    suggestions: list[dict[str, Any]] = []
    for rule in rules_result["rules"]:
        forecast = _safe_float(rule.get("qty_forecast"))
        minimum = _safe_float(rule.get("product_min_qty"))
        maximum = _safe_float(rule.get("product_max_qty"))
        if rule.get("qty_to_order") not in (None, False, ""):
            suggested = max(_safe_float(rule.get("qty_to_order")), 0.0)
        else:
            suggested = max(maximum - forecast, 0.0)
        if suggested <= 0 and forecast >= minimum:
            continue
        risk_level = "critical" if forecast < 0 else "warning" if forecast < minimum else "low"
        suggestions.append(
            {
                "rule_id": rule["id"],
                "product_id": rule.get("product_id"),
                "location_id": rule.get("location_id"),
                "warehouse_id": rule.get("warehouse_id"),
                "forecast_quantity": forecast,
                "minimum_quantity": minimum,
                "maximum_quantity": maximum,
                "suggested_quantity": round(suggested, 4),
                "risk_level": risk_level,
                "trigger": rule.get("trigger"),
                "route_id": rule.get("route_id"),
                "company_id": rule.get("company_id"),
            }
        )
    suggestions.sort(
        key=lambda item: (
            {"critical": 0, "warning": 1, "low": 2}[item["risk_level"]],
            -item["suggested_quantity"],
        )
    )
    return build_success_response(
        "inventory.get_replenishment_suggestions",
        count=len(suggestions),
        suggestions=suggestions,
        advisory_only=True,
    )


def _inventory_adjustment_fields(client: OdooClient, sender_id: int) -> list[str]:
    return _available_fields(
        client,
        "stock.quant",
        sender_id,
        [
            "id",
            "product_id",
            "location_id",
            "lot_id",
            "company_id",
            "quantity",
            "reserved_quantity",
            "inventory_quantity",
            "inventory_diff_quantity",
            "inventory_quantity_set",
            "inventory_date",
            "user_id",
        ],
    )


def find_inventory_discrepancies(
    client: OdooClient,
    sender_id: int,
    product_id: Optional[int] = None,
    location_id: Optional[int] = None,
    company_id: Optional[int] = None,
    limit: int = 100,
) -> dict:
    model = "stock.quant"
    required_fields = ("inventory_quantity_set", "inventory_diff_quantity")
    if not _model_available(client, model, sender_id) or not all(
        _field_available(client, model, field, sender_id) for field in required_fields
    ):
        return build_unsupported_response(
            "inventory.find_inventory_discrepancies",
            "Inventory adjustment fields are not available in this Odoo instance.",
            [model, *required_fields],
        )
    domain: list[Any] = [
        ["inventory_quantity_set", "=", True],
        ["inventory_diff_quantity", "!=", 0],
    ]
    if product_id:
        domain.append(["product_id", "=", product_id])
    if location_id:
        domain.append(["location_id", "=", location_id])
    if company_id and _field_available(client, model, "company_id", sender_id):
        domain.append(["company_id", "=", company_id])
    discrepancies = client.call_kw(
        model,
        "search_read",
        args=[domain],
        kwargs={
            "fields": _inventory_adjustment_fields(client, sender_id),
            "limit": limit,
            "order": "id asc",
        },
        sender_id=sender_id,
    )
    differences = [_safe_float(row.get("inventory_diff_quantity")) for row in discrepancies]
    return build_success_response(
        "inventory.find_inventory_discrepancies",
        count=len(discrepancies),
        discrepancies=discrepancies,
        totals={
            "difference_quantity": round(sum(differences), 4),
            "absolute_difference": round(sum(abs(value) for value in differences), 4),
        },
    )


def prepare_inventory_adjustment(
    client: OdooClient,
    sender_id: int,
    quant_id: int,
    counted_quantity: float,
) -> dict:
    critical: list[dict[str, Any]] = []
    if counted_quantity < 0:
        critical.append(
            {
                "type": "negative_counted_quantity",
                "severity": "critical",
                "counted_quantity": counted_quantity,
            }
        )
        return build_success_response(
            "inventory.prepare_inventory_adjustment",
            quant_id=quant_id,
            can_apply=False,
            critical=critical,
            warnings=[],
            preview=None,
            required_confirmation={"confirm": True, "dry_run": False},
        )
    model = "stock.quant"
    if not _model_available(client, model, sender_id) or not _field_available(
        client, model, "inventory_quantity", sender_id
    ):
        return build_unsupported_response(
            "inventory.prepare_inventory_adjustment",
            "Inventory counted quantity is not available in this Odoo instance.",
            [model, "inventory_quantity"],
        )
    rows = client.call_kw(
        model,
        "read",
        args=[[quant_id]],
        kwargs={"fields": _inventory_adjustment_fields(client, sender_id)},
        sender_id=sender_id,
    )
    if not rows:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "inventory.prepare_inventory_adjustment",
            "message": f"Stock quant {quant_id} was not found.",
        }
    quant = rows[0]
    current = _safe_float(quant.get("quantity"))
    difference = round(counted_quantity - current, 4)
    warnings: list[dict[str, Any]] = []
    if difference == 0:
        warnings.append({"type": "no_quantity_change", "severity": "warning"})
    if _safe_float(quant.get("reserved_quantity")) > 0:
        warnings.append(
            {
                "type": "reserved_quantity_present",
                "severity": "warning",
                "reserved_quantity": _safe_float(quant.get("reserved_quantity")),
            }
        )
    return build_success_response(
        "inventory.prepare_inventory_adjustment",
        quant_id=quant_id,
        can_apply=not critical,
        critical=critical,
        warnings=warnings,
        preview={
            "quant": quant,
            "current_quantity": current,
            "counted_quantity": counted_quantity,
            "difference_quantity": difference,
            "write_values": {
                "inventory_quantity": counted_quantity,
                "inventory_quantity_set": True,
            },
        },
        required_confirmation={"confirm": True, "dry_run": False},
    )


def apply_inventory_adjustment(
    client: OdooClient,
    sender_id: int,
    quant_id: int,
    counted_quantity: float,
    confirm: bool = False,
    dry_run: bool = True,
) -> dict:
    plan = prepare_inventory_adjustment(client, sender_id, quant_id, counted_quantity)
    if not plan.get("ok"):
        plan["capability"] = "inventory.apply_inventory_adjustment"
        return plan
    if dry_run:
        return build_success_response(
            "inventory.apply_inventory_adjustment",
            dry_run=True,
            adjustment_plan=plan,
        )
    if not confirm:
        return {
            "ok": False,
            "status": "confirmation_required",
            "capability": "inventory.apply_inventory_adjustment",
            "message": "Set confirm=true and dry_run=false to apply this inventory adjustment.",
            "adjustment_plan": plan,
        }
    if not plan.get("can_apply"):
        return {
            "ok": False,
            "status": "adjustment_blocked",
            "capability": "inventory.apply_inventory_adjustment",
            "adjustment_plan": plan,
        }
    values = plan["preview"]["write_values"]
    client.call_kw("stock.quant", "write", args=[[quant_id], values], sender_id=sender_id)
    result = client.call_kw(
        "stock.quant", "action_apply_inventory", args=[[quant_id]], sender_id=sender_id
    )
    return build_success_response(
        "inventory.apply_inventory_adjustment",
        applied=True,
        quant_id=quant_id,
        counted_quantity=counted_quantity,
        result=result,
        adjustment_plan=plan,
    )


def find_stock_locations(
    client: OdooClient,
    sender_id: int,
    name: Optional[str] = None,
    usage: Optional[str] = None,
    limit: int = 20,
) -> dict:
    if not _model_available(client, "stock.location", sender_id):
        return build_unsupported_response(
            "inventory.find_stock_locations",
            "stock.location model is not available in this Odoo instance.",
            ["stock.location"],
        )
    domain: list[Any] = []
    if name:
        domain.append(["name", "ilike", name])
    if usage:
        domain.append(["usage", "=", usage])
    fields = _available_fields(
        client,
        "stock.location",
        sender_id,
        ["id", "name", "complete_name", "usage", "location_id", "company_id", "active"],
    )
    rows = client.call_kw(
        "stock.location",
        "search_read",
        args=[domain],
        kwargs={"fields": fields, "limit": limit, "order": "complete_name asc"},
        sender_id=sender_id,
    )
    return build_success_response(
        "inventory.find_stock_locations", count=len(rows), locations=rows
    )


def get_location_stock_summary(
    client: OdooClient,
    sender_id: int,
    location_id: int,
    product_id: Optional[int] = None,
    limit: int = 100,
) -> dict:
    if not _model_available(client, "stock.quant", sender_id):
        return build_unsupported_response(
            "inventory.get_location_stock_summary",
            "stock.quant model is not available in this Odoo instance.",
            ["stock.quant"],
        )
    domain: list[Any] = [["location_id", "=", location_id]]
    if product_id:
        domain.append(["product_id", "=", product_id])
    fields = _available_fields(
        client,
        "stock.quant",
        sender_id,
        ["id", "product_id", "location_id", "quantity", "reserved_quantity", "available_quantity", "lot_id"],
    )
    quants = client.call_kw(
        "stock.quant",
        "search_read",
        args=[domain],
        kwargs={"fields": fields, "limit": limit},
        sender_id=sender_id,
    )
    by_product: dict[int, dict[str, Any]] = {}
    for quant in quants:
        product_ref = quant.get("product_id")
        if not product_ref:
            continue
        pid = int(product_ref[0])
        current = by_product.setdefault(
            pid,
            {
                "product_id": product_ref,
                "quantity": 0.0,
                "reserved_quantity": 0.0,
                "available_quantity": 0.0,
                "quant_count": 0,
            },
        )
        current["quantity"] += _safe_float(quant.get("quantity"))
        current["reserved_quantity"] += _safe_float(quant.get("reserved_quantity"))
        if quant.get("available_quantity") not in (None, False, ""):
            current["available_quantity"] += _safe_float(quant.get("available_quantity"))
        else:
            current["available_quantity"] += _safe_float(quant.get("quantity")) - _safe_float(
                quant.get("reserved_quantity")
            )
        current["quant_count"] += 1

    products = [
        {
            **values,
            "quantity": round(values["quantity"], 4),
            "reserved_quantity": round(values["reserved_quantity"], 4),
            "available_quantity": round(values["available_quantity"], 4),
        }
        for values in by_product.values()
    ]
    products.sort(key=lambda item: abs(item["quantity"]), reverse=True)
    return build_success_response(
        "inventory.get_location_stock_summary",
        location_id=location_id,
        product_id=product_id,
        quant_count=len(quants),
        products=products,
        totals={
            "quantity": round(sum(item["quantity"] for item in products), 4),
            "reserved_quantity": round(sum(item["reserved_quantity"] for item in products), 4),
            "available_quantity": round(sum(item["available_quantity"] for item in products), 4),
        },
    )


def get_stock_moves(
    client: OdooClient,
    sender_id: int,
    product_id: Optional[int] = None,
    picking_id: Optional[int] = None,
    state: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
) -> dict:
    if not _model_available(client, "stock.move", sender_id):
        return build_unsupported_response(
            "inventory.get_stock_moves",
            "stock.move model is not available in this Odoo instance.",
            ["stock.move"],
        )
    domain: list[Any] = []
    if product_id:
        domain.append(["product_id", "=", product_id])
    if picking_id:
        domain.append(["picking_id", "=", picking_id])
    if state:
        domain.append(["state", "=", state])
    if date_from:
        domain.append(["date", ">=", date_from])
    if date_to:
        domain.append(["date", "<=", date_to])
    fields = _available_fields(
        client,
        "stock.move",
        sender_id,
        [
            "id",
            "name",
            "product_id",
            "product_uom_qty",
            "quantity",
            "reserved_availability",
            "product_uom",
            "location_id",
            "location_dest_id",
            "picking_id",
            "origin",
            "state",
            "date",
            "company_id",
        ],
    )
    moves = client.call_kw(
        "stock.move",
        "search_read",
        args=[domain],
        kwargs={"fields": fields, "limit": limit, "order": "date desc, id desc"},
        sender_id=sender_id,
    )
    return build_success_response(
        "inventory.get_stock_moves",
        count=len(moves),
        moves=moves,
    )


def explain_stock_forecast(
    client: OdooClient,
    sender_id: int,
    product_id: int,
    limit: int = 20,
) -> dict:
    stock_context = get_product_stock_context(client, sender_id, product_id)
    if not stock_context.get("ok"):
        stock_context["capability"] = "inventory.explain_stock_forecast"
        return stock_context
    incoming = get_stock_moves(
        client, sender_id, product_id=product_id, state="assigned", limit=limit
    )
    outgoing = get_stock_moves(
        client, sender_id, product_id=product_id, state="confirmed", limit=limit
    )
    totals = stock_context.get("totals", {})
    warnings: list[str] = []
    if totals.get("product_virtual_available", 0.0) < 0:
        warnings.append("Forecast quantity is negative.")
    if totals.get("product_free_qty", totals.get("quant_available", 0.0)) < 0:
        warnings.append("Free/available quantity is negative.")
    return build_success_response(
        "inventory.explain_stock_forecast",
        product_id=product_id,
        stock_context=stock_context,
        incoming_moves=incoming.get("moves", []) if incoming.get("ok") else [],
        outgoing_moves=outgoing.get("moves", []) if outgoing.get("ok") else [],
        warnings=warnings,
        stock_capabilities=_stock_capabilities(client, sender_id),
    )


# Backward-compatible wrapper kept for the existing public tool.
def get_product_stock(
    client: OdooClient,
    sender_id: int,
    product_id: int,
    location_id: Optional[int] = None,
) -> list[dict[str, Any]]:
    result = get_product_stock_context(client, sender_id, product_id, location_id)
    if not result.get("ok"):
        raise ValueError(result.get("message", "Could not fetch product stock."))
    return result.get("quants", [])


def _receipt_picking_fields(client: OdooClient, sender_id: int) -> list[str]:
    return _available_fields(
        client,
        "stock.picking",
        sender_id,
        [
            "id",
            "name",
            "state",
            "partner_id",
            "origin",
            "picking_type_id",
            "picking_type_code",
            "location_id",
            "location_dest_id",
            "scheduled_date",
            "date_done",
            "purchase_id",
            "sale_id",
            "backorder_id",
            "backorder_ids",
            "move_ids",
            "move_ids_without_package",
            "company_id",
        ],
    )


def _read_receipt(client: OdooClient, sender_id: int, picking_id: int) -> dict[str, Any]:
    rows = client.call_kw(
        "stock.picking",
        "read",
        args=[[picking_id]],
        kwargs={"fields": _receipt_picking_fields(client, sender_id)},
        sender_id=sender_id,
    )
    return rows[0] if rows else {}


def _read_receipt_moves(
    client: OdooClient, sender_id: int, picking_id: int
) -> list[dict[str, Any]]:
    if not _model_available(client, "stock.move", sender_id):
        return []
    fields = _available_fields(
        client,
        "stock.move",
        sender_id,
        [
            "id",
            "name",
            "picking_id",
            "purchase_line_id",
            "sale_line_id",
            "product_id",
            "product_uom_qty",
            "quantity",
            "quantity_done",
            "reserved_availability",
            "product_uom",
            "location_id",
            "location_dest_id",
            "state",
            "move_line_ids",
        ],
    )
    return client.call_kw(
        "stock.move",
        "search_read",
        args=[[["picking_id", "=", picking_id]]],
        kwargs={"fields": fields, "order": "id asc"},
        sender_id=sender_id,
    )


def _read_receipt_move_lines(
    client: OdooClient, sender_id: int, picking_id: int
) -> list[dict[str, Any]]:
    if not _model_available(client, "stock.move.line", sender_id):
        return []
    fields = _available_fields(
        client,
        "stock.move.line",
        sender_id,
        [
            "id",
            "picking_id",
            "move_id",
            "product_id",
            "quantity",
            "qty_done",
            "product_uom_id",
            "lot_id",
            "lot_name",
            "location_id",
            "location_dest_id",
        ],
    )
    return client.call_kw(
        "stock.move.line",
        "search_read",
        args=[[["picking_id", "=", picking_id]]],
        kwargs={"fields": fields, "order": "id asc"},
        sender_id=sender_id,
    )


def _move_done_quantity(move: dict[str, Any]) -> float:
    if move.get("quantity") not in (None, False, ""):
        return _safe_float(move.get("quantity"))
    return _safe_float(move.get("quantity_done"))


def _move_line_done_quantity(line: dict[str, Any]) -> float:
    if line.get("quantity") not in (None, False, ""):
        return _safe_float(line.get("quantity"))
    return _safe_float(line.get("qty_done"))


def _product_tracking_map(
    client: OdooClient, sender_id: int, product_ids: list[int]
) -> dict[int, str]:
    if not product_ids or not _model_available(client, "product.product", sender_id):
        return {}
    if not _field_available(client, "product.product", "tracking", sender_id):
        return {}
    rows = client.call_kw(
        "product.product",
        "read",
        args=[product_ids],
        kwargs={"fields": ["id", "tracking"]},
        sender_id=sender_id,
    )
    return {int(row["id"]): str(row.get("tracking") or "none") for row in rows}


def _lot_model(client: OdooClient, sender_id: int) -> Optional[str]:
    for model in ("stock.lot", "stock.production.lot"):
        if _model_available(client, model, sender_id):
            return model
    return None


def find_lot_serial(
    client: OdooClient,
    sender_id: int,
    name: Optional[str] = None,
    product_id: Optional[int] = None,
    company_id: Optional[int] = None,
    limit: int = 20,
) -> dict:
    model = _lot_model(client, sender_id)
    if not model:
        return build_unsupported_response(
            "inventory.find_lot_serial",
            "No lot/serial model is available in this Odoo instance.",
            ["stock.lot"],
        )
    domain: list[Any] = []
    if name:
        domain.append(["name", "ilike", name])
    if product_id:
        domain.append(["product_id", "=", product_id])
    if company_id and _field_available(client, model, "company_id", sender_id):
        domain.append(["company_id", "=", company_id])
    lots = client.call_kw(
        model,
        "search_read",
        args=[domain],
        kwargs={
            "fields": _available_fields(
                client, model, sender_id, ["id", "name", "product_id", "company_id", "create_date"]
            ),
            "limit": limit,
            "order": "id desc",
        },
        sender_id=sender_id,
    )
    return build_success_response(
        "inventory.find_lot_serial", count=len(lots), lots=lots, lot_model=model
    )


def get_lot_traceability(client: OdooClient, sender_id: int, lot_id: int) -> dict:
    model = _lot_model(client, sender_id)
    if not model:
        return build_unsupported_response(
            "inventory.get_lot_traceability",
            "No lot/serial model is available in this Odoo instance.",
            ["stock.lot"],
        )
    lots = client.call_kw(
        model,
        "read",
        args=[[lot_id]],
        kwargs={"fields": _available_fields(client, model, sender_id, ["id", "name", "product_id", "company_id"])},
        sender_id=sender_id,
    )
    if not lots:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "inventory.get_lot_traceability",
            "message": f"Lot/serial {lot_id} was not found.",
        }
    quants = []
    if _model_available(client, "stock.quant", sender_id):
        quants = client.call_kw(
            "stock.quant",
            "search_read",
            args=[[["lot_id", "=", lot_id]]],
            kwargs={"fields": _available_fields(client, "stock.quant", sender_id, ["id", "lot_id", "product_id", "location_id", "quantity", "reserved_quantity"])},
            sender_id=sender_id,
        )
    move_lines = client.call_kw(
        "stock.move.line",
        "search_read",
        args=[[["lot_id", "=", lot_id]]],
        kwargs={
            "fields": _available_fields(client, "stock.move.line", sender_id, ["id", "lot_id", "product_id", "location_id", "location_dest_id", "quantity", "qty_done", "picking_id", "move_id", "date"]),
            "order": "id asc",
        },
        sender_id=sender_id,
    )
    on_hand = sum(_safe_float(row.get("quantity")) for row in quants)
    reserved = sum(_safe_float(row.get("reserved_quantity")) for row in quants)
    return build_success_response(
        "inventory.get_lot_traceability",
        lot=lots[0],
        quants=quants,
        move_lines=move_lines,
        totals={
            "on_hand_quantity": round(on_hand, 4),
            "reserved_quantity": round(reserved, 4),
            "available_quantity": round(on_hand - reserved, 4),
        },
        lot_model=model,
    )


def check_lot_requirements(client: OdooClient, sender_id: int, picking_id: int) -> dict:
    if not _model_available(client, "stock.picking", sender_id):
        return build_unsupported_response(
            "inventory.check_lot_requirements",
            "stock.picking model is not available in this Odoo instance.",
            ["stock.picking"],
        )
    picking = _read_receipt(client, sender_id, picking_id)
    if not picking:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "inventory.check_lot_requirements",
            "message": f"Picking {picking_id} was not found.",
        }
    moves = _read_receipt_moves(client, sender_id, picking_id)
    move_lines = _read_receipt_move_lines(client, sender_id, picking_id)
    tracking = _product_tracking_map(
        client,
        sender_id,
        [product_id for product_id in (_safe_int(move.get("product_id")) for move in moves) if product_id],
    )
    lines_by_move: dict[int, list[dict[str, Any]]] = {}
    for line in move_lines:
        move_id = _safe_int(line.get("move_id"))
        if move_id:
            lines_by_move.setdefault(move_id, []).append(line)
    issues: list[dict[str, Any]] = []
    for move in moves:
        move_id = int(move["id"])
        product_id = _safe_int(move.get("product_id"))
        tracking_type = tracking.get(product_id or 0, "none")
        done = _move_done_quantity(move)
        related = lines_by_move.get(move_id, [])
        tracked = sum(_move_line_done_quantity(line) for line in related if line.get("lot_id") or line.get("lot_name"))
        if tracking_type in {"lot", "serial"} and done > tracked + 0.0001:
            issues.append({"type": "missing_lot_serial", "severity": "critical", "move_id": move_id, "product_id": product_id, "missing_quantity": round(done - tracked, 4)})
        if tracking_type == "serial":
            for line in related:
                if (line.get("lot_id") or line.get("lot_name")) and _move_line_done_quantity(line) > 1.0001:
                    issues.append({"type": "serial_quantity_exceeds_one", "severity": "critical", "move_id": move_id, "move_line_id": line["id"], "quantity": _move_line_done_quantity(line)})
    return build_success_response(
        "inventory.check_lot_requirements",
        picking=picking,
        requirements_met=not issues,
        issues=issues,
    )


def find_purchase_receipts(
    client: OdooClient,
    sender_id: int,
    purchase_order_id: Optional[int] = None,
    partner_id: Optional[int] = None,
    state: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 20,
) -> dict:
    if not _model_available(client, "stock.picking", sender_id):
        return build_unsupported_response(
            "inventory.find_purchase_receipts",
            "stock.picking model is not available in this Odoo instance.",
            ["stock.picking"],
        )

    domain: list[Any] = []
    if _field_available(client, "stock.picking", "picking_type_code", sender_id):
        domain.append(["picking_type_code", "=", "incoming"])
    if purchase_order_id:
        if _field_available(client, "stock.picking", "purchase_id", sender_id):
            domain.append(["purchase_id", "=", purchase_order_id])
        elif _model_available(client, "purchase.order", sender_id):
            po_rows = client.call_kw(
                "purchase.order",
                "read",
                args=[[purchase_order_id]],
                kwargs={"fields": ["name"]},
                sender_id=sender_id,
            )
            if po_rows and po_rows[0].get("name"):
                domain.append(["origin", "=", po_rows[0]["name"]])
    if partner_id:
        domain.append(["partner_id", "=", partner_id])
    if state:
        domain.append(["state", "=", state])
    if date_from:
        domain.append(["scheduled_date", ">=", date_from])
    if date_to:
        domain.append(["scheduled_date", "<=", date_to])

    rows = client.call_kw(
        "stock.picking",
        "search_read",
        args=[domain],
        kwargs={
            "fields": _receipt_picking_fields(client, sender_id),
            "limit": limit,
            "order": "scheduled_date desc, id desc",
        },
        sender_id=sender_id,
    )
    return build_success_response(
        "inventory.find_purchase_receipts",
        count=len(rows),
        receipts=rows,
        stock_capabilities=_stock_capabilities(client, sender_id),
    )


def get_receipt_summary(
    client: OdooClient, sender_id: int, picking_id: int
) -> dict:
    if not _model_available(client, "stock.picking", sender_id):
        return build_unsupported_response(
            "inventory.get_receipt_summary",
            "stock.picking model is not available in this Odoo instance.",
            ["stock.picking"],
        )
    receipt = _read_receipt(client, sender_id, picking_id)
    if not receipt:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "inventory.get_receipt_summary",
            "message": f"Receipt {picking_id} was not found.",
        }
    if receipt.get("picking_type_code") and receipt.get("picking_type_code") != "incoming":
        return {
            "ok": False,
            "status": "invalid_type",
            "capability": "inventory.get_receipt_summary",
            "message": f"Picking {picking_id} is not an incoming receipt.",
            "picking": receipt,
        }

    moves = _read_receipt_moves(client, sender_id, picking_id)
    move_lines = _read_receipt_move_lines(client, sender_id, picking_id)
    product_ids = sorted(
        {
            product_id
            for product_id in (_safe_int(move.get("product_id")) for move in moves)
            if product_id
        }
    )
    tracking = _product_tracking_map(client, sender_id, product_ids)
    move_lines_by_move: dict[int, list[dict[str, Any]]] = {}
    for line in move_lines:
        move_id = _safe_int(line.get("move_id"))
        if move_id:
            move_lines_by_move.setdefault(move_id, []).append(line)

    lines: list[dict[str, Any]] = []
    discrepancies: list[dict[str, Any]] = []
    for move in moves:
        move_id = int(move["id"])
        product_id = _safe_int(move.get("product_id"))
        demanded = _safe_float(move.get("product_uom_qty"))
        done = _move_done_quantity(move)
        remaining = round(max(demanded - done, 0.0), 4)
        related_move_lines = move_lines_by_move.get(move_id, [])
        tracking_type = tracking.get(product_id or 0, "none")
        missing_tracking = False
        if tracking_type in {"lot", "serial"} and done > 0:
            done_with_tracking = sum(
                _move_line_done_quantity(line)
                for line in related_move_lines
                if line.get("lot_id") or line.get("lot_name")
            )
            missing_tracking = done_with_tracking + 0.0001 < done
            if missing_tracking:
                discrepancies.append(
                    {
                        "type": "missing_lot_serial",
                        "severity": "critical",
                        "move_id": move_id,
                        "product_id": product_id,
                        "tracking": tracking_type,
                        "done_quantity": done,
                        "tracked_quantity": round(done_with_tracking, 4),
                    }
                )
        if done > demanded + 0.0001:
            discrepancies.append(
                {
                    "type": "over_receipt",
                    "severity": "critical",
                    "move_id": move_id,
                    "product_id": product_id,
                    "demanded_quantity": demanded,
                    "done_quantity": done,
                }
            )
        lines.append(
            {
                "move_id": move_id,
                "purchase_line_id": move.get("purchase_line_id"),
                "product_id": move.get("product_id"),
                "demanded_quantity": demanded,
                "done_quantity": done,
                "remaining_quantity": remaining,
                "reserved_quantity": _safe_float(move.get("reserved_availability")),
                "tracking": tracking_type,
                "missing_tracking": missing_tracking,
                "move_lines": related_move_lines,
                "state": move.get("state"),
            }
        )

    return build_success_response(
        "inventory.get_receipt_summary",
        receipt=receipt,
        lines=lines,
        discrepancies=discrepancies,
        totals={
            "demanded_quantity": round(sum(line["demanded_quantity"] for line in lines), 4),
            "done_quantity": round(sum(line["done_quantity"] for line in lines), 4),
            "remaining_quantity": round(sum(line["remaining_quantity"] for line in lines), 4),
        },
        stock_capabilities=_stock_capabilities(client, sender_id),
    )


def match_receipt_to_purchase_order(
    client: OdooClient,
    sender_id: int,
    picking_id: int,
    purchase_order_id: Optional[int] = None,
) -> dict:
    summary = get_receipt_summary(client, sender_id, picking_id)
    if not summary.get("ok"):
        summary["capability"] = "inventory.match_receipt_to_purchase_order"
        return summary

    receipt = summary["receipt"]
    resolved_po_id = purchase_order_id or _safe_int(receipt.get("purchase_id"))
    if not resolved_po_id and receipt.get("origin") and _model_available(
        client, "purchase.order", sender_id
    ):
        po_rows = client.call_kw(
            "purchase.order",
            "search_read",
            args=[[['name', '=', receipt["origin"]]]],
            kwargs={"fields": ["id", "name"], "limit": 2},
            sender_id=sender_id,
        )
        if len(po_rows) == 1:
            resolved_po_id = int(po_rows[0]["id"])

    if not resolved_po_id:
        return {
            "ok": False,
            "status": "purchase_order_not_resolved",
            "capability": "inventory.match_receipt_to_purchase_order",
            "message": "Could not resolve a unique purchase order for this receipt.",
            "receipt_summary": summary,
        }

    po_line_fields = _available_fields(
        client,
        "purchase.order.line",
        sender_id,
        ["id", "product_id", "product_qty", "qty_received", "price_unit", "state"],
    )
    po_lines = client.call_kw(
        "purchase.order.line",
        "search_read",
        args=[[["order_id", "=", resolved_po_id]]],
        kwargs={"fields": po_line_fields, "order": "id asc"},
        sender_id=sender_id,
    )
    po_by_product: dict[int, list[dict[str, Any]]] = {}
    for po_line in po_lines:
        product_id = _safe_int(po_line.get("product_id"))
        if product_id:
            po_by_product.setdefault(product_id, []).append(po_line)

    discrepancies = list(summary.get("discrepancies", []))
    matches: list[dict[str, Any]] = []
    for receipt_line in summary["lines"]:
        product_id = _safe_int(receipt_line.get("product_id"))
        candidates = po_by_product.get(product_id or 0, [])
        purchase_line_id = _safe_int(receipt_line.get("purchase_line_id"))
        matched = next(
            (line for line in candidates if int(line["id"]) == purchase_line_id),
            candidates[0] if len(candidates) == 1 else None,
        )
        if not matched:
            discrepancies.append(
                {
                    "type": "product_not_in_purchase_order",
                    "severity": "critical",
                    "move_id": receipt_line["move_id"],
                    "product_id": product_id,
                }
            )
            continue
        matches.append(
            {
                "receipt_line": receipt_line,
                "purchase_order_line": matched,
                "quantity_difference": round(
                    receipt_line["done_quantity"] - _safe_float(matched.get("product_qty")), 4
                ),
            }
        )

    risk_level = "high" if any(d.get("severity") == "critical" for d in discrepancies) else "low"
    return build_success_response(
        "inventory.match_receipt_to_purchase_order",
        picking_id=picking_id,
        purchase_order_id=resolved_po_id,
        matches=matches,
        discrepancies=discrepancies,
        risk_level=risk_level,
        receipt_summary=summary,
    )


def prepare_receipt_validation(
    client: OdooClient, sender_id: int, picking_id: int
) -> dict:
    summary = get_receipt_summary(client, sender_id, picking_id)
    if not summary.get("ok"):
        summary["capability"] = "inventory.prepare_receipt_validation"
        return summary

    receipt = summary["receipt"]
    critical: list[dict[str, Any]] = list(summary.get("discrepancies", []))
    warnings: list[dict[str, Any]] = []
    state = receipt.get("state")
    if state in {"done", "cancel"}:
        critical.append(
            {
                "type": "invalid_state",
                "severity": "critical",
                "state": state,
                "message": f"Receipt cannot be validated from state {state}.",
            }
        )
    if not any(line["done_quantity"] > 0 for line in summary["lines"]):
        warnings.append(
            {
                "type": "no_done_quantities",
                "severity": "warning",
                "message": "No received quantities are currently set.",
            }
        )
    if any(line["remaining_quantity"] > 0 for line in summary["lines"]):
        warnings.append(
            {
                "type": "backorder_may_be_required",
                "severity": "warning",
                "message": "Some quantities remain and Odoo may require a backorder decision.",
            }
        )

    return build_success_response(
        "inventory.prepare_receipt_validation",
        picking_id=picking_id,
        can_validate=not critical,
        critical=critical,
        warnings=warnings,
        preview={
            "receipt": receipt,
            "lines": summary["lines"],
            "totals": summary["totals"],
        },
        required_confirmation={"confirm": True, "dry_run": False},
    )


def validate_receipt(
    client: OdooClient,
    sender_id: int,
    picking_id: int,
    confirm: bool = False,
    dry_run: bool = True,
) -> dict:
    plan = prepare_receipt_validation(client, sender_id, picking_id)
    if not plan.get("ok"):
        plan["capability"] = "inventory.validate_receipt"
        return plan
    if dry_run:
        return build_success_response(
            "inventory.validate_receipt",
            dry_run=True,
            validation_plan=plan,
        )
    if not confirm:
        return {
            "ok": False,
            "status": "confirmation_required",
            "capability": "inventory.validate_receipt",
            "message": "Set confirm=true and dry_run=false to validate the receipt.",
            "validation_plan": plan,
        }
    if not plan.get("can_validate"):
        return {
            "ok": False,
            "status": "validation_blocked",
            "capability": "inventory.validate_receipt",
            "message": "Receipt validation is blocked by critical discrepancies.",
            "validation_plan": plan,
        }

    result = client.call_kw(
        "stock.picking",
        "button_validate",
        args=[[picking_id]],
        sender_id=sender_id,
    )
    if isinstance(result, dict):
        return {
            "ok": False,
            "status": "action_required",
            "capability": "inventory.validate_receipt",
            "message": "Odoo requires an additional wizard/action before validation can finish.",
            "picking_id": picking_id,
            "action": result,
            "validation_plan": plan,
        }
    return build_success_response(
        "inventory.validate_receipt",
        picking_id=picking_id,
        validated=True,
        result=result,
        validation_plan=plan,
    )


def _find_pickings_by_type(
    client: OdooClient,
    sender_id: int,
    picking_type_code: str,
    capability: str,
    state: Optional[str] = None,
    partner_id: Optional[int] = None,
    relation_field: Optional[str] = None,
    relation_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 20,
) -> dict:
    if not _model_available(client, "stock.picking", sender_id):
        return build_unsupported_response(
            capability,
            "stock.picking model is not available in this Odoo instance.",
            ["stock.picking"],
        )
    domain: list[Any] = []
    if _field_available(client, "stock.picking", "picking_type_code", sender_id):
        domain.append(["picking_type_code", "=", picking_type_code])
    if state:
        domain.append(["state", "=", state])
    if partner_id:
        domain.append(["partner_id", "=", partner_id])
    if relation_field and relation_id and _field_available(
        client, "stock.picking", relation_field, sender_id
    ):
        domain.append([relation_field, "=", relation_id])
    if date_from:
        domain.append(["scheduled_date", ">=", date_from])
    if date_to:
        domain.append(["scheduled_date", "<=", date_to])
    rows = client.call_kw(
        "stock.picking",
        "search_read",
        args=[domain],
        kwargs={
            "fields": _receipt_picking_fields(client, sender_id),
            "limit": limit,
            "order": "scheduled_date desc, id desc",
        },
        sender_id=sender_id,
    )
    return build_success_response(
        capability,
        count=len(rows),
        pickings=rows,
        stock_capabilities=_stock_capabilities(client, sender_id),
    )


def find_sale_deliveries(
    client: OdooClient,
    sender_id: int,
    sale_order_id: Optional[int] = None,
    partner_id: Optional[int] = None,
    state: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 20,
) -> dict:
    result = _find_pickings_by_type(
        client,
        sender_id,
        "outgoing",
        "inventory.find_sale_deliveries",
        state=state,
        partner_id=partner_id,
        relation_field="sale_id",
        relation_id=sale_order_id,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    if result.get("ok"):
        result["deliveries"] = result.pop("pickings")
    return result


def find_internal_transfers(
    client: OdooClient,
    sender_id: int,
    state: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 20,
) -> dict:
    result = _find_pickings_by_type(
        client,
        sender_id,
        "internal",
        "inventory.find_internal_transfers",
        state=state,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    if result.get("ok"):
        result["transfers"] = result.pop("pickings")
    return result


def _get_picking_summary(
    client: OdooClient,
    sender_id: int,
    picking_id: int,
    expected_type: str,
    capability: str,
    overage_type: str,
) -> dict:
    if not _model_available(client, "stock.picking", sender_id):
        return build_unsupported_response(
            capability,
            "stock.picking model is not available in this Odoo instance.",
            ["stock.picking"],
        )
    picking = _read_receipt(client, sender_id, picking_id)
    if not picking:
        return {
            "ok": False,
            "status": "not_found",
            "capability": capability,
            "message": f"Picking {picking_id} was not found.",
        }
    if picking.get("picking_type_code") and picking.get("picking_type_code") != expected_type:
        return {
            "ok": False,
            "status": "invalid_type",
            "capability": capability,
            "message": f"Picking {picking_id} is not a {expected_type} operation.",
            "picking": picking,
        }
    moves = _read_receipt_moves(client, sender_id, picking_id)
    move_lines = _read_receipt_move_lines(client, sender_id, picking_id)
    product_ids = sorted(
        {
            product_id
            for product_id in (_safe_int(move.get("product_id")) for move in moves)
            if product_id
        }
    )
    tracking = _product_tracking_map(client, sender_id, product_ids)
    move_lines_by_move: dict[int, list[dict[str, Any]]] = {}
    for line in move_lines:
        move_id = _safe_int(line.get("move_id"))
        if move_id:
            move_lines_by_move.setdefault(move_id, []).append(line)
    lines: list[dict[str, Any]] = []
    discrepancies: list[dict[str, Any]] = []
    for move in moves:
        move_id = int(move["id"])
        product_id = _safe_int(move.get("product_id"))
        demanded = _safe_float(move.get("product_uom_qty"))
        done = _move_done_quantity(move)
        related = move_lines_by_move.get(move_id, [])
        tracking_type = tracking.get(product_id or 0, "none")
        tracked_done = sum(
            _move_line_done_quantity(line)
            for line in related
            if line.get("lot_id") or line.get("lot_name")
        )
        missing_tracking = (
            tracking_type in {"lot", "serial"} and done > 0 and tracked_done + 0.0001 < done
        )
        if missing_tracking:
            discrepancies.append(
                {
                    "type": "missing_lot_serial",
                    "severity": "critical",
                    "move_id": move_id,
                    "product_id": product_id,
                }
            )
        if done > demanded + 0.0001:
            discrepancies.append(
                {
                    "type": overage_type,
                    "severity": "critical",
                    "move_id": move_id,
                    "product_id": product_id,
                    "demanded_quantity": demanded,
                    "done_quantity": done,
                }
            )
        lines.append(
            {
                "move_id": move_id,
                "sale_line_id": move.get("sale_line_id"),
                "product_id": move.get("product_id"),
                "demanded_quantity": demanded,
                "done_quantity": done,
                "remaining_quantity": round(max(demanded - done, 0.0), 4),
                "tracking": tracking_type,
                "missing_tracking": missing_tracking,
                "move_lines": related,
                "state": move.get("state"),
            }
        )
    return build_success_response(
        capability,
        picking=picking,
        lines=lines,
        discrepancies=discrepancies,
        totals={
            "demanded_quantity": round(sum(line["demanded_quantity"] for line in lines), 4),
            "done_quantity": round(sum(line["done_quantity"] for line in lines), 4),
            "remaining_quantity": round(sum(line["remaining_quantity"] for line in lines), 4),
        },
    )


def get_delivery_summary(client: OdooClient, sender_id: int, picking_id: int) -> dict:
    return _get_picking_summary(
        client, sender_id, picking_id, "outgoing", "inventory.get_delivery_summary", "over_delivery"
    )


def match_delivery_to_sale_order(
    client: OdooClient,
    sender_id: int,
    picking_id: int,
    sale_order_id: Optional[int] = None,
) -> dict:
    summary = get_delivery_summary(client, sender_id, picking_id)
    if not summary.get("ok"):
        summary["capability"] = "inventory.match_delivery_to_sale_order"
        return summary

    delivery = summary["picking"]
    resolved_so_id = sale_order_id or _safe_int(delivery.get("sale_id"))
    if not resolved_so_id and delivery.get("origin") and _model_available(
        client, "sale.order", sender_id
    ):
        order_rows = client.call_kw(
            "sale.order",
            "search_read",
            args=[[["name", "=", delivery["origin"]]]],
            kwargs={"fields": ["id", "name"], "limit": 2},
            sender_id=sender_id,
        )
        if len(order_rows) == 1:
            resolved_so_id = int(order_rows[0]["id"])

    if not resolved_so_id:
        return {
            "ok": False,
            "status": "sale_order_not_resolved",
            "capability": "inventory.match_delivery_to_sale_order",
            "message": "Could not resolve a unique sale order for this delivery.",
            "delivery_summary": summary,
        }

    if not _model_available(client, "sale.order.line", sender_id):
        return build_unsupported_response(
            "inventory.match_delivery_to_sale_order",
            "sale.order.line model is not available in this Odoo instance.",
            ["sale.order.line"],
        )

    order_line_fields = _available_fields(
        client,
        "sale.order.line",
        sender_id,
        ["id", "product_id", "product_uom_qty", "qty_delivered", "price_unit", "state"],
    )
    order_lines = client.call_kw(
        "sale.order.line",
        "search_read",
        args=[[["order_id", "=", resolved_so_id]]],
        kwargs={"fields": order_line_fields, "order": "id asc"},
        sender_id=sender_id,
    )
    order_lines_by_product: dict[int, list[dict[str, Any]]] = {}
    for order_line in order_lines:
        product_id = _safe_int(order_line.get("product_id"))
        if product_id:
            order_lines_by_product.setdefault(product_id, []).append(order_line)

    discrepancies = list(summary.get("discrepancies", []))
    matches: list[dict[str, Any]] = []
    for delivery_line in summary["lines"]:
        product_id = _safe_int(delivery_line.get("product_id"))
        candidates = order_lines_by_product.get(product_id or 0, [])
        sale_line_id = _safe_int(delivery_line.get("sale_line_id"))
        matched = next(
            (line for line in candidates if int(line["id"]) == sale_line_id),
            candidates[0] if len(candidates) == 1 else None,
        )
        if not matched:
            discrepancies.append(
                {
                    "type": "product_not_in_sale_order",
                    "severity": "critical",
                    "move_id": delivery_line["move_id"],
                    "product_id": product_id,
                }
            )
            continue

        remaining = delivery_line["remaining_quantity"]
        if remaining > 0:
            discrepancies.append(
                {
                    "type": "backorder_risk",
                    "severity": "warning",
                    "move_id": delivery_line["move_id"],
                    "sale_order_line_id": matched["id"],
                    "product_id": product_id,
                    "remaining_quantity": remaining,
                }
            )
        matches.append(
            {
                "delivery_line": delivery_line,
                "sale_order_line": matched,
                "delivery_remaining_quantity": remaining,
                "ordered_quantity": _safe_float(matched.get("product_uom_qty")),
                "order_delivered_quantity": _safe_float(matched.get("qty_delivered")),
            }
        )

    risk_level = "low"
    if any(item.get("severity") == "critical" for item in discrepancies):
        risk_level = "high"
    elif discrepancies:
        risk_level = "medium"
    return build_success_response(
        "inventory.match_delivery_to_sale_order",
        picking_id=picking_id,
        sale_order_id=resolved_so_id,
        matches=matches,
        discrepancies=discrepancies,
        risk_level=risk_level,
        delivery_summary=summary,
    )


def get_transfer_summary(client: OdooClient, sender_id: int, picking_id: int) -> dict:
    return _get_picking_summary(
        client, sender_id, picking_id, "internal", "inventory.get_transfer_summary", "over_transfer"
    )


def _prepare_picking_validation(
    summary: dict, capability: str, operation_name: str
) -> dict:
    if not summary.get("ok"):
        summary["capability"] = capability
        return summary
    picking = summary["picking"]
    critical = list(summary.get("discrepancies", []))
    warnings: list[dict[str, Any]] = []
    if picking.get("state") in {"done", "cancel"}:
        critical.append({"type": "invalid_state", "severity": "critical", "state": picking["state"]})
    if not any(line["done_quantity"] > 0 for line in summary["lines"]):
        warnings.append({"type": "no_done_quantities", "severity": "warning"})
    if any(line["remaining_quantity"] > 0 for line in summary["lines"]):
        warnings.append({"type": "backorder_may_be_required", "severity": "warning"})
    return build_success_response(
        capability,
        picking_id=picking["id"],
        operation=operation_name,
        can_validate=not critical,
        critical=critical,
        warnings=warnings,
        preview={"picking": picking, "lines": summary["lines"], "totals": summary["totals"]},
        required_confirmation={"confirm": True, "dry_run": False},
    )


def prepare_delivery_validation(client: OdooClient, sender_id: int, picking_id: int) -> dict:
    return _prepare_picking_validation(
        get_delivery_summary(client, sender_id, picking_id),
        "inventory.prepare_delivery_validation",
        "delivery",
    )


def prepare_transfer_validation(client: OdooClient, sender_id: int, picking_id: int) -> dict:
    plan = _prepare_picking_validation(
        get_transfer_summary(client, sender_id, picking_id),
        "inventory.prepare_transfer_validation",
        "internal_transfer",
    )
    if plan.get("ok") and plan["preview"]["picking"].get("location_id") == plan["preview"]["picking"].get("location_dest_id"):
        plan["critical"].append({"type": "same_source_destination", "severity": "critical"})
        plan["can_validate"] = False
    return plan


def _validate_picking(
    client: OdooClient,
    sender_id: int,
    picking_id: int,
    confirm: bool,
    dry_run: bool,
    capability: str,
    prepare,
) -> dict:
    plan = prepare(client, sender_id, picking_id)
    if not plan.get("ok"):
        plan["capability"] = capability
        return plan
    if dry_run:
        return build_success_response(capability, dry_run=True, validation_plan=plan)
    if not confirm:
        return {
            "ok": False,
            "status": "confirmation_required",
            "capability": capability,
            "message": "Set confirm=true and dry_run=false to validate this stock operation.",
            "validation_plan": plan,
        }
    if not plan.get("can_validate"):
        return {
            "ok": False,
            "status": "validation_blocked",
            "capability": capability,
            "validation_plan": plan,
        }
    result = client.call_kw("stock.picking", "button_validate", args=[[picking_id]], sender_id=sender_id)
    if isinstance(result, dict):
        return {
            "ok": False,
            "status": "action_required",
            "capability": capability,
            "action": result,
            "validation_plan": plan,
        }
    return build_success_response(
        capability, picking_id=picking_id, validated=True, result=result, validation_plan=plan
    )


def validate_delivery(
    client: OdooClient,
    sender_id: int,
    picking_id: int,
    confirm: bool = False,
    dry_run: bool = True,
) -> dict:
    return _validate_picking(
        client, sender_id, picking_id, confirm, dry_run, "inventory.validate_delivery", prepare_delivery_validation
    )


def validate_transfer(
    client: OdooClient,
    sender_id: int,
    picking_id: int,
    confirm: bool = False,
    dry_run: bool = True,
) -> dict:
    return _validate_picking(
        client, sender_id, picking_id, confirm, dry_run, "inventory.validate_transfer", prepare_transfer_validation
    )


def prepare_internal_transfer(
    client: OdooClient,
    sender_id: int,
    location_id: int,
    location_dest_id: int,
    lines: list[dict[str, Any]],
    picking_type_id: Optional[int] = None,
    origin: Optional[str] = None,
) -> dict:
    critical: list[dict[str, Any]] = []
    if location_id == location_dest_id:
        critical.append({"type": "same_source_destination", "severity": "critical"})
    if not lines:
        critical.append({"type": "missing_lines", "severity": "critical"})
    normalized_lines: list[dict[str, Any]] = []
    product_ids: list[int] = []
    for index, line in enumerate(lines):
        product_id = _safe_int(line.get("product_id"))
        quantity = _safe_float(line.get("quantity"))
        if not product_id or quantity <= 0:
            critical.append(
                {"type": "invalid_line", "severity": "critical", "line_index": index}
            )
            continue
        product_ids.append(product_id)
        normalized_lines.append({"product_id": product_id, "quantity": quantity})
    if critical:
        return build_success_response(
            "inventory.prepare_internal_transfer",
            can_create=False,
            critical=critical,
            warnings=[],
            preview=None,
            required_confirmation={"confirm": True, "dry_run": False},
        )
    if not picking_type_id:
        picking_types = client.call_kw(
            "stock.picking.type",
            "search_read",
            args=[[["code", "=", "internal"]]],
            kwargs={
                "fields": _available_fields(
                    client,
                    "stock.picking.type",
                    sender_id,
                    [
                        "id",
                        "name",
                        "code",
                        "default_location_src_id",
                        "default_location_dest_id",
                    ],
                ),
                "limit": 2,
                "order": "id asc",
            },
            sender_id=sender_id,
        )
        if len(picking_types) != 1:
            return build_success_response(
                "inventory.prepare_internal_transfer",
                can_create=False,
                critical=[
                    {
                        "type": "internal_picking_type_not_resolved",
                        "severity": "critical",
                        "candidate_count": len(picking_types),
                    }
                ],
                warnings=[],
                preview=None,
                required_confirmation={"confirm": True, "dry_run": False},
            )
        picking_type_id = int(picking_types[0]["id"])
    locations = client.call_kw(
        "stock.location",
        "read",
        args=[[location_id, location_dest_id]],
        kwargs={"fields": _available_fields(client, "stock.location", sender_id, ["id", "display_name", "usage"])},
        sender_id=sender_id,
    )
    location_by_id = {int(location["id"]): location for location in locations}
    if location_id not in location_by_id or location_dest_id not in location_by_id:
        critical.append({"type": "location_not_found", "severity": "critical"})
    for location in locations:
        if location.get("usage") and location.get("usage") != "internal":
            critical.append(
                {
                    "type": "non_internal_location",
                    "severity": "critical",
                    "location_id": location["id"],
                    "usage": location["usage"],
                }
            )
    products = client.call_kw(
        "product.product",
        "read",
        args=[sorted(set(product_ids))],
        kwargs={"fields": _available_fields(client, "product.product", sender_id, ["id", "display_name", "uom_id"])},
        sender_id=sender_id,
    )
    product_by_id = {int(product["id"]): product for product in products}
    missing_products = sorted(set(product_ids) - set(product_by_id))
    if missing_products:
        critical.append(
            {"type": "product_not_found", "severity": "critical", "product_ids": missing_products}
        )
    move_commands = []
    for line in normalized_lines:
        product = product_by_id.get(line["product_id"])
        if not product:
            continue
        uom_id = _safe_int(product.get("uom_id"))
        move_commands.append(
            (
                0,
                0,
                {
                    "name": product.get("display_name") or f"Product {line['product_id']}",
                    "product_id": line["product_id"],
                    "product_uom_qty": line["quantity"],
                    "product_uom": uom_id,
                    "location_id": location_id,
                    "location_dest_id": location_dest_id,
                },
            )
        )
    picking_vals = {
        "picking_type_id": picking_type_id,
        "location_id": location_id,
        "location_dest_id": location_dest_id,
        "move_ids": move_commands,
    }
    if origin:
        picking_vals["origin"] = origin
    return build_success_response(
        "inventory.prepare_internal_transfer",
        can_create=not critical,
        critical=critical,
        warnings=[],
        preview={
            "picking_vals": picking_vals,
            "locations": locations,
            "products": products,
            "lines": normalized_lines,
        },
        required_confirmation={"confirm": True, "dry_run": False},
    )


def create_internal_transfer(
    client: OdooClient,
    sender_id: int,
    location_id: int,
    location_dest_id: int,
    lines: list[dict[str, Any]],
    picking_type_id: Optional[int] = None,
    origin: Optional[str] = None,
    confirm: bool = False,
    dry_run: bool = True,
) -> dict:
    plan = prepare_internal_transfer(
        client, sender_id, location_id, location_dest_id, lines, picking_type_id, origin
    )
    if dry_run:
        return build_success_response(
            "inventory.create_internal_transfer", dry_run=True, creation_plan=plan
        )
    if not confirm:
        return {
            "ok": False,
            "status": "confirmation_required",
            "capability": "inventory.create_internal_transfer",
            "message": "Set confirm=true and dry_run=false to create the internal transfer.",
            "creation_plan": plan,
        }
    if not plan.get("can_create"):
        return {
            "ok": False,
            "status": "creation_blocked",
            "capability": "inventory.create_internal_transfer",
            "creation_plan": plan,
        }
    picking_id = client.call_kw(
        "stock.picking",
        "create",
        args=[plan["preview"]["picking_vals"]],
        sender_id=sender_id,
    )
    return build_success_response(
        "inventory.create_internal_transfer",
        picking_id=picking_id,
        created=True,
        creation_plan=plan,
    )
