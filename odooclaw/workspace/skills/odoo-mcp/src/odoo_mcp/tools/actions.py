from typing import Any, List
from odoo_mcp.core.client import OdooClient
from odoo_mcp.security.guards import guard_model_access, guard_action_name
from odoo_mcp.security.audit import audit_action

def odoo_invoke_action(client: OdooClient, user_id: int, model: str, method: str, ids: List[int]) -> Any:
    """Invoke workflow actions securely."""
    guard_model_access(model)
    guard_action_name(method)
    audit_action("INVOKE_ACTION", user_id, model, ids, {"method": method})
    return client.call_kw(model, method, args=[ids], sender_id=user_id)
