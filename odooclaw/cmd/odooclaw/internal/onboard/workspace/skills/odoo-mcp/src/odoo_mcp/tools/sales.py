from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.sales_service import find_sale_order, get_sale_order_summary
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access

def odoo_find_sale_order(client: OdooClient, user_id: int, name: str = None, partner_id: int = None, state: str = None, limit: int = 10) -> list:
    guard_model_access("sale.order")
    return find_sale_order(client, user_id, name, partner_id, state, limit)

def odoo_get_sale_order_summary(client: OdooClient, user_id: int, order_id: int) -> dict:
    guard_model_access("sale.order")
    audit_action("GET_SO_SUMMARY", user_id, "sale.order", [order_id], {})
    return get_sale_order_summary(client, user_id, order_id)
