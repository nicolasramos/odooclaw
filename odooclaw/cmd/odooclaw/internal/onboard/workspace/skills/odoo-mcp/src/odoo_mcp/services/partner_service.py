from typing import Optional
from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("partner_service")

def find_or_create_partner(client: OdooClient, user_id: int, name: str, vat: Optional[str] = None, email: Optional[str] = None) -> int:
    """Intelligently find or create a partner."""
    domain = []
    if vat:
        domain = [("vat", "=", vat)]
    elif email:
        domain = [("email", "=", email)]
    else:
        domain = [("name", "ilike", name)]
        
    partners = client.call_kw("res.partner", "search_read", args=[domain], kwargs={"fields": ["id", "name"], "limit": 1}, sender_id=user_id)
    if partners:
        _logger.info(f"Found existing partner: {partners[0]['id']}")
        return partners[0]["id"]
        
    # Not found, create
    values = {"name": name}
    if vat: values["vat"] = vat
    if email: values["email"] = email
    
    _logger.info(f"Creating new partner: {name}")
    return client.call_kw("res.partner", "create", args=[values], sender_id=user_id)

def get_partner_summary(client: OdooClient, user_id: int, partner_id: int) -> dict:
    """Gets a clean summary including basics, commercial, open documents count."""
    partner = client.call_kw("res.partner", "read", args=[[partner_id]], kwargs={"fields": ["name", "email", "phone", "user_id", "credit", "debit"]}, sender_id=user_id)
    if not partner:
        return {"error": "Partner not found"}
        
    p = partner[0]
    # Check open sale orders roughly
    so_count = client.call_kw("sale.order", "search_count", args=[[("partner_id", "=", partner_id), ("state", "not in", ["cancel", "done"])]], sender_id=user_id)
    inv_count = client.call_kw("account.move", "search_count", args=[[("partner_id", "=", partner_id), ("state", "=", "posted"), ("payment_state", "in", ["not_paid", "partial"])]], sender_id=user_id)
    
    return {
        "id": p["id"],
        "name": p["name"],
        "email": p.get("email"),
        "phone": p.get("phone"),
        "salesperson": p.get("user_id")[1] if p.get("user_id") else None,
        "financial_balance": p.get("credit", 0) - p.get("debit", 0),
        "open_sale_orders": so_count,
        "open_invoices": inv_count
    }
