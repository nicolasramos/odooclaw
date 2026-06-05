from typing import Optional

from odoo_mcp.core.client import OdooClient
from odoo_mcp.security.audit import audit_action
from odoo_mcp.services.purchase_service import (
    create_purchase_order,
    find_purchase_order,
    get_purchase_invoice_status,
    get_purchase_order_summary,
    get_purchase_receipt_status,
    match_vendor_bill_to_purchase_order,
    suggest_vendor_products,
)


def odoo_create_purchase_order(
    client: OdooClient, user_id: int, partner_id: int, lines: list
) -> int:
    """Wrapper for odoo_create_purchase_order tool."""
    audit_action(
        "CREATE_PO",
        user_id,
        "purchase.order",
        [],
        {"partner_id": partner_id, "lines_count": len(lines)},
    )
    return create_purchase_order(client, user_id, partner_id, lines)


def odoo_find_purchase_order(
    client: OdooClient,
    user_id: int,
    name: Optional[str] = None,
    partner_id: Optional[int] = None,
    state: Optional[str] = None,
    limit: int = 10,
) -> dict:
    audit_action("FIND_PURCHASE_ORDER", user_id, "purchase.order", [], {})
    return find_purchase_order(client, user_id, name, partner_id, state, limit)


def odoo_get_purchase_order_summary(
    client: OdooClient, user_id: int, order_id: int
) -> dict:
    audit_action("GET_PURCHASE_ORDER_SUMMARY", user_id, "purchase.order", [order_id], {})
    return get_purchase_order_summary(client, user_id, order_id)


def odoo_get_purchase_receipt_status(
    client: OdooClient, user_id: int, purchase_order_id: int
) -> dict:
    audit_action(
        "GET_PURCHASE_RECEIPT_STATUS",
        user_id,
        "purchase.order",
        [purchase_order_id],
        {},
    )
    return get_purchase_receipt_status(client, user_id, purchase_order_id)


def odoo_get_purchase_invoice_status(
    client: OdooClient, user_id: int, purchase_order_id: int
) -> dict:
    audit_action(
        "GET_PURCHASE_INVOICE_STATUS",
        user_id,
        "purchase.order",
        [purchase_order_id],
        {},
    )
    return get_purchase_invoice_status(client, user_id, purchase_order_id)


def odoo_suggest_vendor_products(
    client: OdooClient,
    user_id: int,
    partner_id: int,
    query: Optional[str] = None,
    limit: int = 10,
) -> dict:
    audit_action(
        "SUGGEST_VENDOR_PRODUCTS",
        user_id,
        "product.supplierinfo",
        [],
        {"partner_id": partner_id, "query": query},
    )
    return suggest_vendor_products(client, user_id, partner_id, query, limit)


def odoo_match_vendor_bill_to_purchase_order(
    client: OdooClient,
    user_id: int,
    partner_id: int,
    vendor_bill_number: Optional[str] = None,
    purchase_order_id: Optional[int] = None,
    ocr_payload: Optional[dict] = None,
    tolerance: float = 0.01,
) -> dict:
    audit_action(
        "MATCH_VENDOR_BILL_TO_PURCHASE_ORDER",
        user_id,
        "purchase.order",
        [purchase_order_id] if purchase_order_id else [],
        {"partner_id": partner_id, "vendor_bill_number": vendor_bill_number},
    )
    return match_vendor_bill_to_purchase_order(
        client,
        user_id,
        partner_id,
        vendor_bill_number,
        purchase_order_id,
        ocr_payload,
        tolerance,
    )
