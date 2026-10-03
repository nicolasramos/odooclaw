from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("generic_service")

# A mapping of model to summary fields
SUMMARY_FIELDS = {
    "res.partner": ["name", "email", "phone", "category_id"],
    "project.task": ["name", "project_id", "stage_id", "user_ids", "date_deadline"],
    "sale.order": ["name", "partner_id", "state", "amount_total", "invoice_status"],
    "purchase.order": ["name", "partner_id", "state", "amount_total", "receipt_status"],
    "crm.lead": ["name", "partner_id", "stage_id", "user_id", "expected_revenue", "probability"]
}

def get_record_summary(client: OdooClient, user_id: int, model: str, res_id: int) -> dict:
    fields = SUMMARY_FIELDS.get(model, ["display_name"])
    
    _logger.info(f"Getting generic summary for {model} id {res_id}")
    records = client.call_kw(model, "read", args=[[res_id]], kwargs={"fields": fields}, sender_id=user_id)
    if not records:
        return {"error": f"Record {res_id} not found in {model}"}
        
    return records[0]

def get_chatter_summary(client: OdooClient, user_id: int, model: str, res_id: int) -> dict:
    """Gets the latest messages and activities for a record's chatter."""
    _logger.info(f"Getting chatter summary for {model} id {res_id}")
    
    # Get messages
    messages = client.call_kw("mail.message", "search_read", args=[[("model", "=", model), ("res_id", "=", res_id)]], kwargs={"fields": ["body", "author_id", "date", "message_type"], "limit": 5, "order": "date desc"}, sender_id=user_id)
    
    # Get pending activities
    activities = client.call_kw("mail.activity", "search_read", args=[[("res_model", "=", model), ("res_id", "=", res_id)]], kwargs={"fields": ["summary", "user_id", "date_deadline", "state"]}, sender_id=user_id)
    
    return {
        "latest_messages": [{"author": m.get("author_id")[1] if m.get("author_id") else "System", "date": m.get("date"), "type": m.get("message_type"), "body_preview": m.get("body", "")[:200]} for m in messages],
        "pending_activities": [{"summary": a.get("summary"), "user": a.get("user_id")[1] if a.get("user_id") else None, "deadline": a.get("date_deadline")} for a in activities]
    }
