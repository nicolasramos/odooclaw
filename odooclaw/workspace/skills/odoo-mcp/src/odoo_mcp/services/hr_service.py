from typing import Any, Dict, Optional
from odoo_mcp.core.client import OdooClient
import logging

_logger = logging.getLogger(__name__)

def log_timesheet(
    client: OdooClient,
    sender_id: int,
    project_id: int,
    name: str,
    unit_amount: float,
    date: str,
    task_id: Optional[int] = None,
    employee_id: Optional[int] = None
) -> int:
    """Log a new timesheet entry."""
    vals = {
        "project_id": project_id,
        "name": name,
        "unit_amount": unit_amount,
        "date": date
    }
    
    if task_id:
        vals["task_id"] = task_id
    if employee_id:
        vals["employee_id"] = employee_id
        
    try:
        timesheet_id = client.call_kw(
            "account.analytic.line",
            "create",
            sender_id=sender_id,
            args=[vals]
        )
        return timesheet_id
    except Exception as e:
        _logger.error(f"Error logging timesheet: {e}")
        raise
