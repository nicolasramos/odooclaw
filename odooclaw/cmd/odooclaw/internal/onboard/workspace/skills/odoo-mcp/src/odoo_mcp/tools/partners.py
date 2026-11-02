from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.partner_service import find_partner, get_partner_summary
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access


def odoo_find_partner(
    client: OdooClient, user_id: int, name: str, vat: str = None, email: str = None
) -> int:
    guard_model_access("res.partner")
    audit_action("FIND_PARTNER", user_id, "res.partner", [], {"name": name, "vat": vat})
    partner_id = find_partner(client, user_id, name, vat, email)
    if partner_id is None:
        raise ValueError("Partner not found")
    return partner_id


def odoo_get_partner_summary(client: OdooClient, user_id: int, partner_id: int) -> dict:
    guard_model_access("res.partner")
    audit_action("GET_PARTNER_SUMMARY", user_id, "res.partner", [partner_id], {})
    return get_partner_summary(client, user_id, partner_id)
