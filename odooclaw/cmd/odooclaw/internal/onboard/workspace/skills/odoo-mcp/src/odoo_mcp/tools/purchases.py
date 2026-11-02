from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.purchase_service import create_purchase_order
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access


def odoo_create_purchase_order(
    client: OdooClient, user_id: int, partner_id: int, lines: list
) -> int:
    guard_model_access("purchase.order")
    audit_action(
        "CREATE_PO",
        user_id,
        "purchase.order",
        [],
        {"partner_id": partner_id, "lines_count": len(lines)},
    )
    return create_purchase_order(client, user_id, partner_id, lines)
