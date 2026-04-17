from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.purchase_service import create_purchase_order
from odoo_mcp.security.audit import audit_action

def odoo_create_purchase_order(client: OdooClient, user_id: int, partner_id: int, lines: list) -> int:
    """Wrapper for odoo_create_purchase_order tool."""
    audit_action("CREATE_PO", user_id, "purchase.order", [], {"partner_id": partner_id, "lines_count": len(lines)})
    return create_purchase_order(client, user_id, partner_id, lines)
