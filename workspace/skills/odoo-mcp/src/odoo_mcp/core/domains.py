from typing import Any, List
from odoo_mcp.core.exceptions import OdooSecurityError

SUPPORTED_OPERATORS = {
    "=", "!=", "<", "<=", ">", ">=", "=?", "=like", "=ilike",
    "like", "not like", "ilike", "not ilike", "in", "not in",
    "child_of", "parent_of"
}

def validate_domain(domain: List[Any]) -> None:
    """
    Validates standard Odoo domain syntax to prevent injection or malicious deeply nested queries.
    """
    if not isinstance(domain, list):
        raise OdooSecurityError("Domain must be a list.")
        
    depth = 0
    for term in domain:
        if isinstance(term, str):
            if term in ("|", "!", "&"):
                continue
            else:
                raise OdooSecurityError(f"Invalid logical operator: {term}")
        elif isinstance(term, (list, tuple)):
            if len(term) != 3:
                raise OdooSecurityError(f"Domain leaf must have exactly 3 elements: {term}")
            _, op, _ = term
            if op not in SUPPORTED_OPERATORS:
                raise OdooSecurityError(f"Unsupported domain operator: {op}")
        else:
            raise OdooSecurityError(f"Invalid domain term format: {term}")
