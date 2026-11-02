from typing import Any, Dict
from odoo_mcp.core.client import OdooClient
from odoo_mcp.core.serializers import serialize_schema
from odoo_mcp.services.capability_service import get_capabilities
from odoo_mcp.security.guards import guard_model_access
import logging

_logger = logging.getLogger(__name__)


def odoo_model_schema(client: OdooClient, user_id: int, model: str) -> str:
    guard_model_access(model)
    try:
        fields_info = client.call_kw(model, "fields_get")
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


def odoo_get_capabilities(client: OdooClient, user_id: int) -> Dict[str, Any]:
    return get_capabilities(client, user_id)
