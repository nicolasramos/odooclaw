from typing import Any, Dict, Optional
from odoo_mcp.core.client import OdooClient
import logging

_logger = logging.getLogger(__name__)

def create_lead(
    client: OdooClient,
    sender_id: int,
    name: str,
    partner_id: Optional[int] = None,
    expected_revenue: Optional[float] = None,
    probability: Optional[float] = None,
    description: Optional[str] = None
) -> int:
    """Create a new CRM lead/opportunity."""
    vals = {
        "name": name,
        "type": "opportunity"  # Typically we want to create opportunities straight away
    }
    
    if partner_id:
        vals["partner_id"] = partner_id
    if expected_revenue is not None:
        vals["expected_revenue"] = expected_revenue
    if probability is not None:
        vals["probability"] = probability
    if description:
        vals["description"] = description
        
    try:
        lead_id = client.call_kw("crm.lead", "create", sender_id=sender_id, args=[vals])
        return lead_id
    except Exception as e:
        _logger.error(f"Error creating lead: {e}")
        raise
