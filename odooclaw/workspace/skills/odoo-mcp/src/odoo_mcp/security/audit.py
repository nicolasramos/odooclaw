# The audit implementation logic is delegated to observability/audit.py
# This serves as a namespace export for security boundary checks.
from odoo_mcp.observability.audit import log_audit_event

def audit_action(action: str, user_id: int, model: str, ids: list, values: dict = None):
    """Facade for security-level audit logging."""
    details = {"ids": ids}
    if values:
        # Avoid logging the exact details of huge payloads or passwords
        from .redaction import redact_sensitive_values
        details["values"] = redact_sensitive_values(values)
        
    log_audit_event(action, user_id, model, details)
