from __future__ import annotations

from typing import Any, Optional

from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger
from odoo_mcp.services.capability_service import (
    build_success_response,
    build_unsupported_response,
)

_logger = get_logger("purchase_service")


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


def _m2o_id(value: Any) -> Optional[int]:
    return _safe_int(value)


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


def _oca_purchase_capabilities(client: OdooClient, sender_id: int) -> dict[str, bool]:
    return {
        "purchase_reception_status": _field_available(
            client, "purchase.order", "reception_status", sender_id
        )
        or _field_available(client, "purchase.order", "receipt_status", sender_id),
        "purchase_invoice_status_line": _field_available(
            client, "purchase.order.line", "invoice_status", sender_id
        )
        or _field_available(client, "purchase.order.line", "qty_to_invoice", sender_id),
        "purchase_stock_picking_invoice_link": _field_available(
            client, "stock.picking", "invoice_ids", sender_id
        )
        if _model_available(client, "stock.picking", sender_id)
        else False,
        "purchase_order_uninvoiced_amount": _field_available(
            client, "purchase.order", "uninvoiced_amount", sender_id
        )
        or _field_available(client, "purchase.order", "amount_uninvoiced", sender_id),
        "purchase_request": _model_available(client, "purchase.request", sender_id),
        "purchase_blanket_order": _model_available(
            client, "purchase.blanket.order", sender_id
        ),
        "purchase_invoice_plan": _model_available(
            client, "purchase.invoice.plan", sender_id
        ),
        "purchase_last_price_info": _field_available(
            client, "product.supplierinfo", "last_price", sender_id
        )
        if _model_available(client, "product.supplierinfo", sender_id)
        else False,
        "purchase_order_product_recommendation": _model_available(
            client, "purchase.order.product.recommendation", sender_id
        ),
    }


def create_purchase_order(
    client: OdooClient, user_id: int, partner_id: int, lines: list
) -> int:
    """
    Creates a purchase order with multiple lines.
    lines format: [{"product_id": 1, "product_qty": 2.0, "price_unit": 100.0}]
    """
    order_vals = {"partner_id": partner_id, "order_line": []}

    for line in lines:
        order_vals["order_line"].append(
            (
                0,
                0,
                {
                    "product_id": line["product_id"],
                    "product_qty": line.get("product_qty", 1.0),
                    "price_unit": line.get("price_unit", 0.0),
                },
            )
        )

    _logger.info(f"Creating PO for partner {partner_id} with {len(lines)} lines")
    return client.call_kw("purchase.order", "create", args=[order_vals], sender_id=user_id)


def find_purchase_order(
    client: OdooClient,
    sender_id: int,
    name: Optional[str] = None,
    partner_id: Optional[int] = None,
    state: Optional[str] = None,
    limit: int = 10,
) -> dict:
    if not _model_available(client, "purchase.order", sender_id):
        return build_unsupported_response(
            "purchase.find_purchase_order",
            "purchase.order model is not available in this Odoo instance.",
            ["purchase.order"],
        )

    domain: list[list[Any]] = []
    if name:
        domain.append(["name", "ilike", name])
    if partner_id:
        domain.append(["partner_id", "=", partner_id])
    if state:
        domain.append(["state", "=", state])

    fields = [
        "id",
        "name",
        "state",
        "partner_id",
        "date_order",
        "amount_total",
        "currency_id",
        "invoice_status",
        "receipt_status",
        "reception_status",
        "company_id",
        "uninvoiced_amount",
        "amount_uninvoiced",
    ]
    rows = client.call_kw(
        "purchase.order",
        "search_read",
        args=[domain],
        kwargs={
            "fields": _available_fields(client, "purchase.order", sender_id, fields),
            "limit": limit,
            "order": "date_order desc, id desc",
        },
        sender_id=sender_id,
    )
    return build_success_response(
        "purchase.find_purchase_order",
        count=len(rows),
        purchase_orders=rows,
        oca_capabilities=_oca_purchase_capabilities(client, sender_id),
    )


def _read_purchase_order(client: OdooClient, sender_id: int, order_id: int) -> dict:
    fields = _available_fields(
        client,
        "purchase.order",
        sender_id,
        [
            "id",
            "name",
            "state",
            "partner_id",
            "date_order",
            "amount_total",
            "amount_untaxed",
            "currency_id",
            "invoice_status",
            "receipt_status",
            "reception_status",
            "order_line",
            "picking_ids",
            "invoice_ids",
            "company_id",
            "uninvoiced_amount",
            "amount_uninvoiced",
        ],
    )
    rows = client.call_kw(
        "purchase.order",
        "read",
        args=[[order_id]],
        kwargs={"fields": fields},
        sender_id=sender_id,
    )
    return rows[0] if rows else {}


def _read_purchase_order_lines(
    client: OdooClient, sender_id: int, order_id: int
) -> list[dict[str, Any]]:
    if not _model_available(client, "purchase.order.line", sender_id):
        return []
    fields = _available_fields(
        client,
        "purchase.order.line",
        sender_id,
        [
            "id",
            "order_id",
            "product_id",
            "name",
            "product_qty",
            "qty_received",
            "qty_invoiced",
            "qty_to_invoice",
            "price_unit",
            "price_subtotal",
            "taxes_id",
            "invoice_status",
            "date_planned",
        ],
    )
    return client.call_kw(
        "purchase.order.line",
        "search_read",
        args=[[["order_id", "=", order_id]]],
        kwargs={"fields": fields, "order": "id asc"},
        sender_id=sender_id,
    )


def get_purchase_order_summary(
    client: OdooClient, sender_id: int, order_id: int
) -> dict:
    if not _model_available(client, "purchase.order", sender_id):
        return build_unsupported_response(
            "purchase.get_purchase_order_summary",
            "purchase.order model is not available in this Odoo instance.",
            ["purchase.order"],
        )
    order = _read_purchase_order(client, sender_id, order_id)
    if not order:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "purchase.get_purchase_order_summary",
            "message": f"Purchase order {order_id} was not found.",
        }
    lines = _read_purchase_order_lines(client, sender_id, order_id)
    return build_success_response(
        "purchase.get_purchase_order_summary",
        purchase_order=order,
        lines=lines,
        oca_capabilities=_oca_purchase_capabilities(client, sender_id),
    )


def get_purchase_receipt_status(
    client: OdooClient, sender_id: int, purchase_order_id: int
) -> dict:
    summary = get_purchase_order_summary(client, sender_id, purchase_order_id)
    if not summary.get("ok"):
        summary["capability"] = "purchase.get_purchase_receipt_status"
        return summary

    order = summary["purchase_order"]
    lines = summary["lines"]
    receipts: list[dict[str, Any]] = []
    picking_ids = order.get("picking_ids") or []
    if picking_ids and _model_available(client, "stock.picking", sender_id):
        fields = _available_fields(
            client,
            "stock.picking",
            sender_id,
            ["id", "name", "state", "scheduled_date", "date_done", "origin"],
        )
        receipts = client.call_kw(
            "stock.picking",
            "read",
            args=[picking_ids],
            kwargs={"fields": fields},
            sender_id=sender_id,
        )

    receipt_lines = []
    for line in lines:
        ordered = _safe_float(line.get("product_qty"))
        received = _safe_float(line.get("qty_received"))
        receipt_lines.append(
            {
                "line_id": line.get("id"),
                "product_id": line.get("product_id"),
                "name": line.get("name"),
                "ordered_qty": ordered,
                "received_qty": received,
                "remaining_to_receive": round(max(ordered - received, 0.0), 4),
            }
        )

    return build_success_response(
        "purchase.get_purchase_receipt_status",
        purchase_order_id=purchase_order_id,
        receipt_status=order.get("receipt_status") or order.get("reception_status"),
        receipts=receipts,
        lines=receipt_lines,
        oca_capabilities=summary.get("oca_capabilities", {}),
    )


def get_purchase_invoice_status(
    client: OdooClient, sender_id: int, purchase_order_id: int
) -> dict:
    summary = get_purchase_order_summary(client, sender_id, purchase_order_id)
    if not summary.get("ok"):
        summary["capability"] = "purchase.get_purchase_invoice_status"
        return summary

    order = summary["purchase_order"]
    invoice_lines = []
    for line in summary["lines"]:
        ordered = _safe_float(line.get("product_qty"))
        invoiced = _safe_float(line.get("qty_invoiced"))
        qty_to_invoice = line.get("qty_to_invoice")
        if qty_to_invoice in (None, False, ""):
            qty_to_invoice = max(ordered - invoiced, 0.0)
        invoice_lines.append(
            {
                "line_id": line.get("id"),
                "product_id": line.get("product_id"),
                "name": line.get("name"),
                "ordered_qty": ordered,
                "invoiced_qty": invoiced,
                "qty_to_invoice": round(_safe_float(qty_to_invoice), 4),
                "price_unit": _safe_float(line.get("price_unit")),
                "line_invoice_status": line.get("invoice_status"),
            }
        )

    return build_success_response(
        "purchase.get_purchase_invoice_status",
        purchase_order_id=purchase_order_id,
        invoice_status=order.get("invoice_status"),
        invoice_ids=order.get("invoice_ids") or [],
        uninvoiced_amount=order.get("uninvoiced_amount")
        or order.get("amount_uninvoiced"),
        lines=invoice_lines,
        oca_capabilities=summary.get("oca_capabilities", {}),
    )


def suggest_vendor_products(
    client: OdooClient,
    sender_id: int,
    partner_id: int,
    query: Optional[str] = None,
    limit: int = 10,
) -> dict:
    if not _model_available(client, "product.supplierinfo", sender_id):
        return build_unsupported_response(
            "purchase.suggest_vendor_products",
            "product.supplierinfo model is not available in this Odoo instance.",
            ["product.supplierinfo"],
        )

    domain: list[list[Any]] = [["partner_id", "=", partner_id]]
    if query:
        domain.append(["product_name", "ilike", query])
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
            "last_price",
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
        "purchase.suggest_vendor_products",
        partner_id=partner_id,
        query=query,
        count=len(rows),
        suggestions=rows,
        oca_capabilities=_oca_purchase_capabilities(client, sender_id),
    )


def _normalize_ocr_lines(ocr_payload: Optional[dict[str, Any]]) -> list[dict[str, Any]]:
    if not ocr_payload:
        return []
    raw_lines = ocr_payload.get("lines") or ocr_payload.get("invoice_lines") or []
    lines: list[dict[str, Any]] = []
    for raw in raw_lines:
        lines.append(
            {
                "product_id": _safe_int(raw.get("product_id")),
                "name": str(raw.get("name") or raw.get("description") or ""),
                "quantity": _safe_float(raw.get("quantity") or 1.0),
                "price_unit": _safe_float(raw.get("price_unit") or raw.get("unit_price")),
                "tax_ids": raw.get("tax_ids") or [],
            }
        )
    return lines


def _score_line_match(
    ocr_line: dict[str, Any], po_line: dict[str, Any], tolerance: float
) -> tuple[float, list[str], list[dict[str, Any]]]:
    score = 0.0
    reasons: list[str] = []
    discrepancies: list[dict[str, Any]] = []

    ocr_product = _safe_int(ocr_line.get("product_id"))
    po_product = _m2o_id(po_line.get("product_id"))
    if ocr_product and po_product and ocr_product == po_product:
        score += 55
        reasons.append("product_id")

    ocr_name = (ocr_line.get("name") or "").strip().lower()
    po_name = (po_line.get("name") or "").strip().lower()
    if ocr_name and po_name and (ocr_name in po_name or po_name in ocr_name):
        score += 20
        reasons.append("description")

    ocr_price = _safe_float(ocr_line.get("price_unit"))
    po_price = _safe_float(po_line.get("price_unit"))
    price_diff = round(ocr_price - po_price, 4)
    if abs(price_diff) <= tolerance:
        score += 15
        reasons.append("price")
    else:
        discrepancies.append(
            {"type": "price", "expected": po_price, "actual": ocr_price, "difference": price_diff}
        )

    qty = _safe_float(ocr_line.get("quantity"))
    ordered = _safe_float(po_line.get("product_qty"))
    qty_to_invoice = po_line.get("qty_to_invoice")
    if qty_to_invoice in (None, False, ""):
        qty_to_invoice = max(ordered - _safe_float(po_line.get("qty_invoiced")), 0.0)
    qty_to_invoice = _safe_float(qty_to_invoice)
    if qty <= qty_to_invoice + tolerance or qty <= ordered + tolerance:
        score += 10
        reasons.append("quantity")
    else:
        discrepancies.append(
            {"type": "quantity", "expected_max": qty_to_invoice or ordered, "actual": qty}
        )

    po_taxes = {int(t) for t in (po_line.get("taxes_id") or [])}
    ocr_taxes = {int(t) for t in (ocr_line.get("tax_ids") or []) if t}
    if ocr_taxes and po_taxes and ocr_taxes != po_taxes:
        discrepancies.append(
            {"type": "tax", "expected": sorted(po_taxes), "actual": sorted(ocr_taxes)}
        )

    return score, reasons, discrepancies


def match_vendor_bill_to_purchase_order(
    client: OdooClient,
    sender_id: int,
    partner_id: int,
    vendor_bill_number: Optional[str] = None,
    purchase_order_id: Optional[int] = None,
    ocr_payload: Optional[dict[str, Any]] = None,
    tolerance: float = 0.01,
) -> dict:
    if not _model_available(client, "purchase.order", sender_id):
        return build_unsupported_response(
            "purchase.match_vendor_bill_to_purchase_order",
            "purchase.order model is not available in this Odoo instance.",
            ["purchase.order"],
        )

    if purchase_order_id:
        candidate_orders = [_read_purchase_order(client, sender_id, purchase_order_id)]
        candidate_orders = [order for order in candidate_orders if order]
    else:
        domain: list[list[Any]] = [["partner_id", "=", partner_id], ["state", "in", ["purchase", "done"]]]
        candidate_orders = client.call_kw(
            "purchase.order",
            "search_read",
            args=[domain],
            kwargs={
                "fields": _available_fields(
                    client,
                    "purchase.order",
                    sender_id,
                    ["id", "name", "state", "partner_id", "date_order", "amount_total", "invoice_status", "receipt_status", "reception_status"],
                ),
                "limit": 5,
                "order": "date_order desc, id desc",
            },
            sender_id=sender_id,
        )

    ocr_lines = _normalize_ocr_lines(ocr_payload)
    order_matches: list[dict[str, Any]] = []
    all_discrepancies: list[dict[str, Any]] = []
    for order in candidate_orders:
        order_id = _safe_int(order.get("id"))
        if not order_id:
            continue
        po_lines = _read_purchase_order_lines(client, sender_id, order_id)
        matched_po_line_ids: set[int] = set()
        line_matches = []
        for index, ocr_line in enumerate(ocr_lines):
            best: Optional[dict[str, Any]] = None
            for po_line in po_lines:
                po_line_id = _safe_int(po_line.get("id"))
                if po_line_id in matched_po_line_ids:
                    continue
                score, reasons, discrepancies = _score_line_match(
                    ocr_line, po_line, tolerance
                )
                if best is None or score > best["score"]:
                    best = {
                        "ocr_line_index": index,
                        "ocr_line": ocr_line,
                        "purchase_order_line": po_line,
                        "score": round(score, 2),
                        "matched_by": reasons,
                        "discrepancies": discrepancies,
                    }
            if best and best["score"] >= 50:
                po_line_id = _safe_int(best["purchase_order_line"].get("id"))
                if po_line_id:
                    matched_po_line_ids.add(po_line_id)
                line_matches.append(best)
                all_discrepancies.extend(
                    {**d, "ocr_line_index": index, "purchase_order_line_id": po_line_id}
                    for d in best["discrepancies"]
                )
            else:
                all_discrepancies.append(
                    {"type": "unmatched_ocr_line", "ocr_line_index": index, "ocr_line": ocr_line}
                )

        unmatched_po_lines = [
            line for line in po_lines if _safe_int(line.get("id")) not in matched_po_line_ids
        ]
        order_score = sum(match["score"] for match in line_matches)
        if ocr_lines:
            order_score = round(order_score / max(len(ocr_lines), 1), 2)
        order_matches.append(
            {
                "purchase_order": order,
                "score": order_score,
                "line_matches": line_matches,
                "unmatched_purchase_order_lines": unmatched_po_lines,
            }
        )

    order_matches.sort(key=lambda item: item["score"], reverse=True)
    candidate = order_matches[0] if order_matches else None
    risk_level = "low"
    if not candidate or candidate["score"] < 50:
        risk_level = "high"
    elif all_discrepancies or candidate["score"] < 80:
        risk_level = "medium"

    receipt_status = None
    invoice_status = None
    if candidate:
        po = candidate["purchase_order"]
        receipt_status = po.get("receipt_status") or po.get("reception_status")
        invoice_status = po.get("invoice_status")

    return build_success_response(
        "purchase.match_vendor_bill_to_purchase_order",
        partner_id=partner_id,
        vendor_bill_number=vendor_bill_number,
        purchase_order_id=purchase_order_id,
        candidate=candidate,
        candidates=order_matches,
        receipt_status=receipt_status,
        invoice_status=invoice_status,
        discrepancies=all_discrepancies,
        risk_level=risk_level,
        oca_capabilities=_oca_purchase_capabilities(client, sender_id),
    )
