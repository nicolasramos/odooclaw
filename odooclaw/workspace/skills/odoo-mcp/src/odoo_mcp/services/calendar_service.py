import logging
from typing import cast

from odoo_mcp.core.client import OdooClient

_logger = logging.getLogger(__name__)


def create_calendar_event(
    client: OdooClient,
    sender_id: int,
    name: str,
    start: str,
    stop: str,
    partner_ids: list[int] | None = None,
    allday: bool = False,
    description: str | None = None,
) -> int:
    """Create a new calendar event (appointment) in Odoo."""
    vals = {
        "name": name,
        "start": start,
        "stop": stop,
        "allday": allday,
    }

    if description:
        vals["description"] = description

    if partner_ids:
        # Use the (6, 0, [IDs]) pattern for many2many fields
        vals["partner_ids"] = [(6, 0, partner_ids)]

    try:
        event_id = client.call_kw("calendar.event", "create", sender_id=sender_id, args=[vals])
        return cast(int, event_id)
    except Exception as e:
        _logger.error(f"Error creating calendar event: {e}")
        raise
