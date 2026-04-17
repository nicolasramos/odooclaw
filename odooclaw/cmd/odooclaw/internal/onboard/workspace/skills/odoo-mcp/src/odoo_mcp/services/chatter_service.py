from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("chatter_service")

def create_activity(client: OdooClient, user_id: int, model: str, res_id: int, summary: str, note: str = None, assign_to: int = None) -> int:
    values = {
        "res_model": model,
        "res_id": res_id,
        "summary": summary,
        "note": note,
    }
    
    # Resolving res_model_id which is required by mail.activity
    model_ids = client.call_kw("ir.model", "search", args=[[("model", "=", model)]], kwargs={"limit": 1}, sender_id=user_id)
    if model_ids:
        values["res_model_id"] = model_ids[0]
        
    if assign_to:
        values["user_id"] = assign_to
        
    _logger.info(f"Creating activity for {model} id {res_id}")
    return client.call_kw("mail.activity", "create", args=[values], sender_id=user_id)

def list_pending_activities(client: OdooClient, user_id: int, model: str = None, assign_to: int = None) -> list:
    domain = []
    if model:
        domain.append(("res_model", "=", model))
    if assign_to:
        domain.append(("user_id", "=", assign_to))
        
    _logger.info(f"Listing pending activities with domain: {domain}")
    return client.call_kw("mail.activity", "search_read", args=[domain], kwargs={"fields": ["summary", "note", "date_deadline", "res_model", "res_name", "user_id", "state"]}, sender_id=user_id)

def mark_activity_done(client: OdooClient, user_id: int, activity_id: int, feedback: str = None) -> bool:
    _logger.info(f"Marking activity {activity_id} as done")
    kwargs = {}
    if feedback:
        kwargs["feedback"] = feedback
    # Using action_feedback or action_done
    client.call_kw("mail.activity", "action_feedback", args=[[activity_id]], kwargs=kwargs, sender_id=user_id)
    return True

def post_chatter_message(client: OdooClient, user_id: int, model: str, res_id: int, body: str) -> int:
    _logger.info(f"Posting chatter message on {model} id {res_id}")
    return client.call_kw(model, "message_post", args=[[res_id]], kwargs={"body": body, "message_type": "comment"}, sender_id=user_id)
