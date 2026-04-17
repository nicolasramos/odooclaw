from typing import Any, Dict
from odoo_mcp.core.client import OdooClient
from odoo_mcp.core.serializers import serialize_schema
import logging

_logger = logging.getLogger(__name__)

def odoo_model_schema(client: OdooClient, user_id: int, model: str) -> str:
    """Retrieve and serialize fields schema for a given model."""
    try:
        fields_info = client.call_kw(model, "fields_get", sender_id=user_id)
        summary = {}
        for fname, fprops in fields_info.items():
            summary[fname] = {
                "type": fprops.get("type"),
                "string": fprops.get("string"),
                "required": fprops.get("required", False),
                "readonly": fprops.get("readonly", False),
            }
            if fprops.get("type") in ["many2one", "one2many", "many2many"]:
                summary[fname]["relation"] = fprops.get("relation")
            if fprops.get("type") == "selection":
                summary[fname]["selection"] = fprops.get("selection")
                
        return serialize_schema({"model": model, "fields": summary})
    except Exception as e:
        _logger.error(f"Error getting schema for {model}: {e}")
        return serialize_schema({"error": str(e), "model": model})
