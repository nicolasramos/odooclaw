from typing import Set
from odoo_mcp.config import DEFAULT_ALLOWED_MODELS, DEFAULT_DENIED_FIELDS

def get_allowed_models() -> Set[str]:
    """Returns the set of models the MCP is authorized to interact with in write mode."""
    return DEFAULT_ALLOWED_MODELS

def get_denied_write_fields() -> Set[str]:
    """Returns the set of fields that cannot be written directly by tools."""
    return DEFAULT_DENIED_FIELDS
