from typing import Dict, Any, List, Optional
from odoo_mcp.core.exceptions import OdooSecurityError
from .policy import get_allowed_models, get_denied_write_fields, DEFAULT_DENIED_MODELS

def guard_model_access(model_name: str, client=None, sender_id: Optional[int] = None) -> None:
    """Raises OdooSecurityError if the model is not authorized.
    
    Authorization check order:
    1. Blacklist check (DEFAULT_DENIED_MODELS) - ALWAYS blocks
    2. Allowlist check (get_allowed_models(client, sender_id)) - must be present
    
    Args:
        model_name: The Odoo model name to check
        client: Optional OdooClient for ir.config_parameter lookup
        sender_id: Odoo user id used to read the escape-hatch config parameter
    """
    # Blacklist always wins - even if model is in escape hatch
    if model_name in DEFAULT_DENIED_MODELS:
        raise OdooSecurityError(
            f"Model '{model_name}' is not authorized (denied by security policy)."
        )
    
    if model_name not in get_allowed_models(client, sender_id):
        raise OdooSecurityError(f"Model '{model_name}' is not in the ALLOWED_MODELS list.")

def guard_write_fields(values: Dict[str, Any]) -> None:
    """Raises OdooSecurityError if attempting to write to a restricted field."""
    denied = get_denied_write_fields()
    for field in values.keys():
        if field in denied:
            raise OdooSecurityError(f"Field '{field}' is restricted from direct write operations via MCP.")

def guard_unlink(model_name: str) -> None:
    """Denies completely all unlink operations."""
    raise OdooSecurityError(f"Delete (unlink) operations are strictly forbidden via MCP. Model: {model_name}")

def guard_action_name(method: str) -> None:
    """Ensures that invoked methods are safe workflow actions."""
    if not (method.startswith("action_") or method.startswith("button_")):
        raise OdooSecurityError("Only workflow actions (action_*, button_*) are permitted.")
