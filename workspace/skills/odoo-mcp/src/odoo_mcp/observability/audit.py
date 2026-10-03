from odoo_mcp.observability.logging import get_logger

_audit_logger = get_logger("audit")

def log_audit_event(action: str, user_id: int, model: str, details: dict, status: str = "SUCCESS"):
    """
    Logs an audit event describing what tool was called, by whom, and what it touched.
    """
    _audit_logger.info(f"AUDIT | Status: {status} | Action: {action} | User {user_id} | Model {model} | Details: {details}")
