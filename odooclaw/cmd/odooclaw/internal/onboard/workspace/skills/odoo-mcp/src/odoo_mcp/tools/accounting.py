from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.invoice_service import create_vendor_invoice
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access


def odoo_create_vendor_invoice(
    client: OdooClient, user_id: int, partner_id: int, lines: list, ref: str = ""
) -> int:
    guard_model_access("account.move")
    audit_action(
        "CREATE_INVOICE", user_id, "account.move", [], {"partner_id": partner_id, "ref": ref}
    )
    return create_vendor_invoice(client, user_id, partner_id, lines, ref)
