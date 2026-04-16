from datetime import date as date_cls
from datetime import datetime, timedelta
from typing import Any, Optional

from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("workforce_service")


def _resolve_employee_id(
    client: OdooClient, sender_id: int, employee_id: Optional[int] = None
) -> Optional[int]:
    if employee_id:
        return employee_id

    employees = client.call_kw(
        "hr.employee",
        "search_read",
        args=[[("user_id", "=", sender_id)]],
        kwargs={"fields": ["id"], "limit": 1},
        sender_id=sender_id,
    )
    if employees:
        return employees[0].get("id")
    return None


def _today_window() -> tuple[str, str, str]:
    today = date_cls.today().isoformat()
    return today, f"{today} 00:00:00", f"{today} 23:59:59"


def _attendance_hours_by_day(attendances: list[dict[str, Any]]) -> dict[str, float]:
    out: dict[str, float] = {}
    for row in attendances:
        check_in = str(row.get("check_in") or "")
        day = check_in[:10]
        if not day:
            continue
        out[day] = out.get(day, 0.0) + float(row.get("worked_hours") or 0.0)
    return out


def _timesheet_hours_by_day(timesheets: list[dict[str, Any]]) -> dict[str, float]:
    out: dict[str, float] = {}
    for row in timesheets:
        day = str(row.get("date") or "")
        if not day:
            continue
        out[day] = out.get(day, 0.0) + float(row.get("unit_amount") or 0.0)
    return out


def check_in(
    client: OdooClient,
    sender_id: int,
    employee_id: Optional[int] = None,
    check_in_at: Optional[str] = None,
) -> dict:
    if not client.model_exists("hr.attendance", sender_id=sender_id):
        raise ValueError("Model hr.attendance is not available in this Odoo instance")

    resolved_employee = _resolve_employee_id(client, sender_id, employee_id)
    if not resolved_employee:
        raise ValueError("Could not resolve employee for check-in")

    open_rows = client.call_kw(
        "hr.attendance",
        "search_read",
        args=[[("employee_id", "=", resolved_employee), ("check_out", "=", False)]],
        kwargs={"fields": ["id", "check_in"], "limit": 1, "order": "check_in desc"},
        sender_id=sender_id,
    )
    if open_rows:
        return {
            "ok": True,
            "status": "already_checked_in",
            "attendance_id": open_rows[0].get("id"),
            "employee_id": resolved_employee,
            "check_in": open_rows[0].get("check_in"),
        }

    vals = {
        "employee_id": resolved_employee,
        "check_in": check_in_at or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
    }
    attendance_id = client.call_kw(
        "hr.attendance", "create", args=[vals], sender_id=sender_id
    )
    return {
        "ok": True,
        "status": "checked_in",
        "attendance_id": attendance_id,
        "employee_id": resolved_employee,
    }


def check_out(
    client: OdooClient,
    sender_id: int,
    employee_id: Optional[int] = None,
    check_out_at: Optional[str] = None,
) -> dict:
    if not client.model_exists("hr.attendance", sender_id=sender_id):
        raise ValueError("Model hr.attendance is not available in this Odoo instance")

    resolved_employee = _resolve_employee_id(client, sender_id, employee_id)
    if not resolved_employee:
        raise ValueError("Could not resolve employee for check-out")

    open_rows = client.call_kw(
        "hr.attendance",
        "search_read",
        args=[[("employee_id", "=", resolved_employee), ("check_out", "=", False)]],
        kwargs={
            "fields": ["id", "check_in", "worked_hours"],
            "limit": 1,
            "order": "check_in desc",
        },
        sender_id=sender_id,
    )
    if not open_rows:
        return {
            "ok": True,
            "status": "not_checked_in",
            "employee_id": resolved_employee,
        }

    attendance_id = open_rows[0].get("id")
    client.call_kw(
        "hr.attendance",
        "write",
        args=[
            [attendance_id],
            {
                "check_out": check_out_at
                or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            },
        ],
        sender_id=sender_id,
    )

    updated = client.call_kw(
        "hr.attendance",
        "read",
        args=[[attendance_id]],
        kwargs={"fields": ["id", "check_in", "check_out", "worked_hours"]},
        sender_id=sender_id,
    )
    row = updated[0] if updated else {}
    return {
        "ok": True,
        "status": "checked_out",
        "attendance_id": attendance_id,
        "employee_id": resolved_employee,
        "worked_hours": float(row.get("worked_hours") or 0.0),
        "check_in": row.get("check_in"),
        "check_out": row.get("check_out"),
    }


def get_my_today_summary(
    client: OdooClient,
    sender_id: int,
    employee_id: Optional[int] = None,
) -> dict:
    today, start_ts, end_ts = _today_window()
    resolved_employee = _resolve_employee_id(client, sender_id, employee_id)

    attendance_rows: list[dict[str, Any]] = []
    if resolved_employee and client.model_exists("hr.attendance", sender_id=sender_id):
        attendance_rows = client.call_kw(
            "hr.attendance",
            "search_read",
            args=[
                [
                    ("employee_id", "=", resolved_employee),
                    ("check_in", ">=", start_ts),
                    ("check_in", "<=", end_ts),
                ]
            ],
            kwargs={
                "fields": ["id", "check_in", "check_out", "worked_hours"],
                "limit": 100,
            },
            sender_id=sender_id,
        )

    timesheet_rows: list[dict[str, Any]] = []
    if client.model_exists("account.analytic.line", sender_id=sender_id):
        ts_domain: list[tuple[str, str, Any]] = [("date", "=", today)]
        if resolved_employee:
            ts_domain.append(("employee_id", "=", resolved_employee))
        else:
            ts_domain.append(("user_id", "=", sender_id))
        timesheet_rows = client.call_kw(
            "account.analytic.line",
            "search_read",
            args=[ts_domain],
            kwargs={"fields": ["id", "unit_amount", "task_id", "name"], "limit": 500},
            sender_id=sender_id,
        )

    task_open_count = 0
    if client.model_exists("project.task", sender_id=sender_id):
        task_open_count = client.call_kw(
            "project.task",
            "search_count",
            args=[[("user_ids", "in", [sender_id]), ("stage_id.fold", "=", False)]],
            sender_id=sender_id,
        )

    pending_expense_count = 0
    if resolved_employee and client.model_exists("hr.expense", sender_id=sender_id):
        pending_expense_count = client.call_kw(
            "hr.expense",
            "search_count",
            args=[
                [
                    ("employee_id", "=", resolved_employee),
                    ("state", "not in", ["done", "refused"]),
                ]
            ],
            sender_id=sender_id,
        )

    return {
        "date": today,
        "employee_id": resolved_employee,
        "attendance_count": len(attendance_rows),
        "attendance_hours": round(
            sum(float(r.get("worked_hours") or 0.0) for r in attendance_rows), 2
        ),
        "timesheet_count": len(timesheet_rows),
        "timesheet_hours": round(
            sum(float(r.get("unit_amount") or 0.0) for r in timesheet_rows), 2
        ),
        "open_tasks_count": int(task_open_count or 0),
        "pending_expenses_count": int(pending_expense_count or 0),
    }


def find_missing_timesheets(
    client: OdooClient,
    sender_id: int,
    employee_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tolerance_hours: float = 0.25,
) -> list[dict[str, Any]]:
    if not client.model_exists("hr.attendance", sender_id=sender_id):
        raise ValueError("Model hr.attendance is not available in this Odoo instance")
    if not client.model_exists("account.analytic.line", sender_id=sender_id):
        raise ValueError(
            "Model account.analytic.line is not available in this Odoo instance"
        )

    resolved_employee = _resolve_employee_id(client, sender_id, employee_id)
    if not resolved_employee:
        raise ValueError("Could not resolve employee for missing timesheet analysis")

    start_day = date_from or (date_cls.today() - timedelta(days=7)).isoformat()
    end_day = date_to or date_cls.today().isoformat()

    attendance_rows = client.call_kw(
        "hr.attendance",
        "search_read",
        args=[
            [
                ("employee_id", "=", resolved_employee),
                ("check_in", ">=", f"{start_day} 00:00:00"),
                ("check_in", "<=", f"{end_day} 23:59:59"),
            ]
        ],
        kwargs={"fields": ["id", "check_in", "worked_hours"], "limit": 1000},
        sender_id=sender_id,
    )
    timesheet_rows = client.call_kw(
        "account.analytic.line",
        "search_read",
        args=[
            [
                ("employee_id", "=", resolved_employee),
                ("date", ">=", start_day),
                ("date", "<=", end_day),
            ]
        ],
        kwargs={"fields": ["id", "date", "unit_amount"], "limit": 2000},
        sender_id=sender_id,
    )

    attendance_by_day = _attendance_hours_by_day(attendance_rows)
    timesheet_by_day = _timesheet_hours_by_day(timesheet_rows)

    missing_days: list[dict[str, Any]] = []
    for day in sorted(attendance_by_day.keys()):
        attended = round(float(attendance_by_day.get(day) or 0.0), 2)
        logged = round(float(timesheet_by_day.get(day) or 0.0), 2)
        missing = round(attended - logged, 2)
        if missing > tolerance_hours:
            missing_days.append(
                {
                    "date": day,
                    "attendance_hours": attended,
                    "timesheet_hours": logged,
                    "missing_hours": missing,
                }
            )

    return missing_days


def suggest_timesheet_from_attendance(
    client: OdooClient,
    sender_id: int,
    employee_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    tolerance_hours: float = 0.25,
) -> dict:
    missing = find_missing_timesheets(
        client,
        sender_id,
        employee_id=employee_id,
        date_from=date_from,
        date_to=date_to,
        tolerance_hours=tolerance_hours,
    )

    suggested_task = None
    if client.model_exists("project.task", sender_id=sender_id):
        rows = client.call_kw(
            "project.task",
            "search_read",
            args=[[("user_ids", "in", [sender_id]), ("stage_id.fold", "=", False)]],
            kwargs={"fields": ["id", "name"], "limit": 1, "order": "write_date desc"},
            sender_id=sender_id,
        )
        if rows:
            suggested_task = rows[0]

    suggestions = []
    for row in missing:
        suggestion = {
            "date": row["date"],
            "unit_amount": row["missing_hours"],
            "name": f"Auto-suggested from attendance {row['date']}",
        }
        if suggested_task:
            suggestion["task_id"] = suggested_task.get("id")
            suggestion["task_name"] = suggested_task.get("name")
        suggestions.append(suggestion)

    return {
        "missing_days": len(missing),
        "suggestions": suggestions,
        "suggested_task": suggested_task,
    }


def create_expense_report(
    client: OdooClient,
    sender_id: int,
    name: Optional[str] = None,
    expense_ids: Optional[list[int]] = None,
    employee_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> dict:
    if not client.model_exists("hr.expense.sheet", sender_id=sender_id):
        raise ValueError(
            "Model hr.expense.sheet is not available in this Odoo instance"
        )
    if not client.model_exists("hr.expense", sender_id=sender_id):
        raise ValueError("Model hr.expense is not available in this Odoo instance")

    resolved_employee = _resolve_employee_id(client, sender_id, employee_id)
    if not resolved_employee:
        raise ValueError("Could not resolve employee for expense report")

    selected_expense_ids = expense_ids or []
    if not selected_expense_ids:
        domain: list[tuple[str, str, Any]] = [
            ("employee_id", "=", resolved_employee),
            ("state", "=", "draft"),
            ("sheet_id", "=", False),
        ]
        if date_from:
            domain.append(("date", ">=", date_from))
        if date_to:
            domain.append(("date", "<=", date_to))

        expenses = client.call_kw(
            "hr.expense",
            "search_read",
            args=[domain],
            kwargs={"fields": ["id"], "limit": 500},
            sender_id=sender_id,
        )
        selected_expense_ids = [int(row["id"]) for row in expenses if row.get("id")]

    if not selected_expense_ids:
        raise ValueError("No draft expenses available to include in report")

    sheet_name = name or f"Expense report {date_cls.today().isoformat()}"
    sheet_id = client.call_kw(
        "hr.expense.sheet",
        "create",
        args=[{"name": sheet_name, "employee_id": resolved_employee}],
        sender_id=sender_id,
    )
    client.call_kw(
        "hr.expense",
        "write",
        args=[selected_expense_ids, {"sheet_id": sheet_id}],
        sender_id=sender_id,
    )

    return {
        "ok": True,
        "sheet_id": sheet_id,
        "employee_id": resolved_employee,
        "expense_ids": selected_expense_ids,
        "expense_count": len(selected_expense_ids),
    }


def submit_expense_report(client: OdooClient, sender_id: int, sheet_id: int) -> dict:
    if not client.model_exists("hr.expense.sheet", sender_id=sender_id):
        raise ValueError(
            "Model hr.expense.sheet is not available in this Odoo instance"
        )

    methods = ["action_submit_sheet", "action_submit_expenses", "action_submit"]
    last_error = None
    for method in methods:
        try:
            client.call_kw(
                "hr.expense.sheet", method, args=[[sheet_id]], sender_id=sender_id
            )
            state_row = client.call_kw(
                "hr.expense.sheet",
                "read",
                args=[[sheet_id]],
                kwargs={"fields": ["id", "state"]},
                sender_id=sender_id,
            )
            state = state_row[0].get("state") if state_row else None
            return {
                "ok": True,
                "sheet_id": sheet_id,
                "state": state,
                "method": method,
            }
        except Exception as exc:
            last_error = str(exc)
            continue

    raise ValueError(
        f"Could not submit expense report {sheet_id}. Tried methods: {methods}. Last error: {last_error}"
    )


def approve_expense(
    client: OdooClient,
    sender_id: int,
    sheet_id: int,
    approve: bool = True,
    reason: Optional[str] = None,
) -> dict:
    if not client.model_exists("hr.expense.sheet", sender_id=sender_id):
        raise ValueError(
            "Model hr.expense.sheet is not available in this Odoo instance"
        )

    if approve:
        methods = [
            "action_approve_expense_sheets",
            "approve_expense_sheets",
            "action_approve_sheet",
            "action_approve",
        ]
        kwargs = {}
    else:
        methods = [
            "action_refuse_sheet",
            "action_refuse_expense_sheets",
            "action_refuse",
        ]
        kwargs = {"reason": reason} if reason else {}

    last_error = None
    for method in methods:
        try:
            client.call_kw(
                "hr.expense.sheet",
                method,
                args=[[sheet_id]],
                kwargs=kwargs,
                sender_id=sender_id,
            )
            state_row = client.call_kw(
                "hr.expense.sheet",
                "read",
                args=[[sheet_id]],
                kwargs={"fields": ["id", "state"]},
                sender_id=sender_id,
            )
            state = state_row[0].get("state") if state_row else None
            return {
                "ok": True,
                "sheet_id": sheet_id,
                "approved": approve,
                "state": state,
                "method": method,
                "reason": reason,
            }
        except Exception as exc:
            last_error = str(exc)

    action = "approve" if approve else "reject"
    raise ValueError(
        f"Could not {action} expense report {sheet_id}. Tried methods: {methods}. Last error: {last_error}"
    )


def notify_pending_actions(
    client: OdooClient,
    sender_id: int,
    employee_id: Optional[int] = None,
    days_back: int = 7,
) -> dict:
    resolved_employee = _resolve_employee_id(client, sender_id, employee_id)
    today = date_cls.today().isoformat()
    start_day = (date_cls.today() - timedelta(days=max(1, days_back))).isoformat()

    alerts: list[dict[str, Any]] = []

    if client.model_exists("hr.attendance", sender_id=sender_id) and resolved_employee:
        open_att = client.call_kw(
            "hr.attendance",
            "search_read",
            args=[[("employee_id", "=", resolved_employee), ("check_out", "=", False)]],
            kwargs={"fields": ["id", "check_in"], "limit": 1, "order": "check_in desc"},
            sender_id=sender_id,
        )
        if open_att:
            alerts.append(
                {
                    "type": "attendance_open",
                    "severity": "high",
                    "message": "You are checked in but not checked out.",
                    "attendance_id": open_att[0].get("id"),
                }
            )

    if resolved_employee and client.model_exists(
        "account.analytic.line", sender_id=sender_id
    ):
        missing = find_missing_timesheets(
            client,
            sender_id,
            employee_id=resolved_employee,
            date_from=start_day,
            date_to=today,
            tolerance_hours=0.25,
        )
        if missing:
            total_missing = round(
                sum(float(row["missing_hours"]) for row in missing), 2
            )
            alerts.append(
                {
                    "type": "missing_timesheets",
                    "severity": "medium",
                    "message": f"You have {len(missing)} day(s) with missing timesheets.",
                    "missing_days": len(missing),
                    "missing_hours": total_missing,
                }
            )

    if resolved_employee and client.model_exists("hr.expense", sender_id=sender_id):
        draft_expenses = client.call_kw(
            "hr.expense",
            "search_count",
            args=[[("employee_id", "=", resolved_employee), ("state", "=", "draft")]],
            sender_id=sender_id,
        )
        if draft_expenses:
            alerts.append(
                {
                    "type": "draft_expenses",
                    "severity": "low",
                    "message": f"You have {draft_expenses} draft expense(s) pending report submission.",
                    "count": int(draft_expenses),
                }
            )

    if client.model_exists("hr.expense.sheet", sender_id=sender_id):
        pending_approval = client.call_kw(
            "hr.expense.sheet",
            "search_count",
            args=[[("state", "in", ["submit", "reported"])]],
            sender_id=sender_id,
        )
        if pending_approval:
            alerts.append(
                {
                    "type": "expense_approvals",
                    "severity": "low",
                    "message": f"There are {pending_approval} expense report(s) pending approval.",
                    "count": int(pending_approval),
                }
            )

    _logger.info("Generated %s pending action alerts", len(alerts))
    return {"ok": True, "days_back": days_back, "alerts": alerts}
