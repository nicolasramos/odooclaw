from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.chatter_service import create_activity, list_pending_activities, mark_activity_done, post_chatter_message
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access

def odoo_create_activity(client: OdooClient, user_id: int, model: str, res_id: int, summary: str, note: str = None, assign_to: int = None) -> int:
    guard_model_access(model)
    audit_action("CREATE_ACTIVITY", user_id, model, [res_id], {"summary": summary})
    return create_activity(client, user_id, model, res_id, summary, note, assign_to)

def odoo_list_pending_activities(client: OdooClient, user_id: int, model: str = None, assign_to: int = None) -> list:
    if model: guard_model_access(model)
    return list_pending_activities(client, user_id, model, assign_to)

def odoo_mark_activity_done(client: OdooClient, user_id: int, activity_id: int, feedback: str = None) -> bool:
    audit_action("MARK_ACTIVITY_DONE", user_id, "mail.activity", [activity_id], {"feedback": feedback})
    return mark_activity_done(client, user_id, activity_id, feedback)

def odoo_post_chatter_message(client: OdooClient, user_id: int, model: str, res_id: int, body: str) -> int:
    guard_model_access(model)
    audit_action("POST_CHATTER", user_id, model, [res_id], {"body_length": len(body)})
    return post_chatter_message(client, user_id, model, res_id, body)
