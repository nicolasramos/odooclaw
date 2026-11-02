from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.generic_service import get_record_summary
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access

def odoo_get_record_summary(client: OdooClient, user_id: int, model: str, res_id: int) -> dict:
    guard_model_access(model)
    audit_action("GET_RECORD_SUMMARY", user_id, model, [res_id], {})
    return get_record_summary(client, user_id, model, res_id)
