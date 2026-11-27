from odoo_mcp.core.client import OdooClient
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access
from odoo_mcp.services.sales_service import (
    create_invoice_from_sale_order,
    find_sale_order,
    get_sale_order_summary,
)


def odoo_find_sale_order(
    client: OdooClient,
    user_id: int,
    name: str | None = None,
    partner_id: int | None = None,
    state: str | None = None,
    limit: int = 10,
) -> list:
    guard_model_access("sale.order")
    return find_sale_order(client, user_id, name, partner_id, state, limit)


def odoo_get_sale_order_summary(client: OdooClient, user_id: int, order_id: int) -> dict:
    guard_model_access("sale.order")
    audit_action("GET_SO_SUMMARY", user_id, "sale.order", [order_id], {})
    return get_sale_order_summary(client, user_id, order_id)


def odoo_create_invoice_from_sale_order(
    client: OdooClient,
    user_id: int,
    order_id: int,
    invoice_date: str | None = None,
) -> dict:
    """Invoices a confirmed sale order, copying its lines into an out_invoice."""
    guard_model_access("sale.order")
    guard_model_access("account.move")
    audit_action(
        "CREATE_INVOICE_FROM_SO",
        user_id,
        "sale.order",
        [order_id],
        {"invoice_date": invoice_date},
    )
    return create_invoice_from_sale_order(client, user_id, order_id, invoice_date)
