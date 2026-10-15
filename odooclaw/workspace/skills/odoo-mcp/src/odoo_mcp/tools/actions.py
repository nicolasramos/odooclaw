from typing import Any

from odoo_mcp.core.client import OdooClient
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_action_name, guard_model_access


def odoo_invoke_action(
    client: OdooClient, user_id: int, model: str, method: str, ids: list[int]
) -> Any:
    """Invoke workflow actions securely."""
    guard_model_access(model, client, sender_id=user_id)
    guard_action_name(method)
    audit_action("INVOKE_ACTION", user_id, model, ids, {"method": method})
    return client.call_kw(model, method, args=[ids], sender_id=user_id)
