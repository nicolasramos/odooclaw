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
