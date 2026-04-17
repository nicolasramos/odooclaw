from datetime import date as date_cls
from typing import Optional
from odoo_mcp.core.client import OdooClient
import logging

_logger = logging.getLogger(__name__)


def _resolve_employee_id(
    client: OdooClient,
    sender_id: int,
    employee_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Optional[int]:
    if employee_id:
        return employee_id

    target_user_id = user_id or sender_id
    employees = client.call_kw(
        "hr.employee",
        "search_read",
        args=[[[("user_id", "=", target_user_id)]]],
        kwargs={"fields": ["id"], "limit": 1},
        sender_id=sender_id,
    )
    if employees:
        return employees[0].get("id")
    return None


def find_attendance(
    client: OdooClient,
    sender_id: int,
    user_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
) -> list:
    if not client.model_exists("hr.attendance", sender_id=sender_id):
        raise ValueError("Model hr.attendance is not available in this Odoo instance")

    resolved_employee_id = _resolve_employee_id(
        client,
        sender_id,
        employee_id=employee_id,
        user_id=user_id,
    )
    if not resolved_employee_id:
        raise ValueError(
            "Could not resolve employee for attendance query. Provide employee_id explicitly."
        )

    effective_from = date_from or date_cls.today().isoformat()
    effective_to = date_to or effective_from

    domain = [
        ("employee_id", "=", resolved_employee_id),
        ("check_in", ">=", f"{effective_from} 00:00:00"),
        ("check_in", "<=", f"{effective_to} 23:59:59"),
    ]

    _logger.info("Finding attendances with domain: %s", domain)
    return client.call_kw(
        "hr.attendance",
        "search_read",
        args=[domain],
        kwargs={
            "fields": ["id", "employee_id", "check_in", "check_out", "worked_hours"],
            "limit": limit,
            "order": "check_in desc",
        },
        sender_id=sender_id,
    )


def log_timesheet(
    client: OdooClient,
    sender_id: int,
    project_id: int,
    name: str,
    unit_amount: float,
    date: str,
    task_id: Optional[int] = None,
    employee_id: Optional[int] = None,
) -> int:
    """Log a new timesheet entry."""
    vals = {
        "project_id": project_id,
        "name": name,
        "unit_amount": unit_amount,
        "date": date,
    }

    if task_id:
        vals["task_id"] = task_id
    if employee_id:
        vals["employee_id"] = employee_id

    try:
        timesheet_id = client.call_kw(
            "account.analytic.line", "create", sender_id=sender_id, args=[vals]
        )
        return timesheet_id
    except Exception as e:
        _logger.error(f"Error logging timesheet: {e}")
        raise


def log_task_timesheet(
    client: OdooClient,
    sender_id: int,
    task_id: int,
    name: str,
    unit_amount: float,
    date: Optional[str] = None,
    employee_id: Optional[int] = None,
) -> int:
    if not client.model_exists("project.task", sender_id=sender_id):
        raise ValueError("Model project.task is not available in this Odoo instance")
    if not client.model_exists("account.analytic.line", sender_id=sender_id):
        raise ValueError(
            "Model account.analytic.line is not available in this Odoo instance"
        )

    tasks = client.call_kw(
        "project.task",
        "read",
        args=[[task_id]],
        kwargs={"fields": ["id", "project_id"]},
        sender_id=sender_id,
    )
    if not tasks:
        raise ValueError(f"Task {task_id} not found or not accessible")

    project_ref = tasks[0].get("project_id")
    if not project_ref:
        raise ValueError(f"Task {task_id} has no project_id linked")
    project_id = project_ref[0] if isinstance(project_ref, list) else project_ref

    vals = {
        "project_id": project_id,
        "task_id": task_id,
        "name": name,
        "unit_amount": unit_amount,
        "date": date or date_cls.today().isoformat(),
    }

    resolved_employee_id = _resolve_employee_id(
        client, sender_id, employee_id=employee_id
    )
    if resolved_employee_id:
        vals["employee_id"] = resolved_employee_id

    _logger.info("Logging task timesheet for task %s", task_id)
    return client.call_kw(
        "account.analytic.line",
        "create",
        sender_id=sender_id,
        args=[vals],
    )
