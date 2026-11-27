import logging
from typing import Any, cast

from odoo_mcp.core.client import OdooClient

_logger = logging.getLogger(__name__)


def create_lead(
    client: OdooClient,
    sender_id: int,
    name: str,
    partner_id: int | None = None,
    expected_revenue: float | None = None,
    probability: float | None = None,
    description: str | None = None,
) -> int:
    """Create a new CRM lead/opportunity."""
    vals: dict[str, Any] = {
        "name": name,
        "type": "opportunity",  # Typically we want to create opportunities straight away
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
        return cast(int, lead_id)
    except Exception as e:
        _logger.error(f"Error creating lead: {e}")
        raise
