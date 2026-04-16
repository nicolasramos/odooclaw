# Odoo Workforce Tools

This document describes the new workforce-oriented MCP tools added to OdooClaw.

## Attendance and timesheet tools

### `odoo_check_in`

Registers check-in in `hr.attendance` for the current user employee.

```json
{
  "sender_id": 7,
  "employee_id": 12,
  "check_in_at": "2026-04-15 08:55:00"
}
```

- `employee_id` and `check_in_at` are optional.
- If an open attendance already exists, it returns `already_checked_in`.

### `odoo_check_out`

Closes the latest open attendance in `hr.attendance`.

```json
{
  "sender_id": 7,
  "employee_id": 12,
  "check_out_at": "2026-04-15 18:05:00"
}
```

- If no open attendance exists, it returns `not_checked_in`.

### `odoo_get_my_today_summary`

Returns daily operational summary for the user.

```json
{
  "sender_id": 7,
  "employee_id": 12
}
```

Response includes:

- `attendance_hours`
- `timesheet_hours`
- `open_tasks_count`
- `pending_expenses_count`

### `odoo_find_missing_timesheets`

Detects daily gaps between attendance and timesheet logs.

```json
{
  "sender_id": 7,
  "employee_id": 12,
  "date_from": "2026-04-01",
  "date_to": "2026-04-15",
  "tolerance_hours": 0.25
}
```

Each result row includes `date`, `attendance_hours`, `timesheet_hours`, and `missing_hours`.

### `odoo_suggest_timesheet_from_attendance`

Builds timesheet suggestions from missing-hour analysis.

```json
{
  "sender_id": 7,
  "employee_id": 12,
  "date_from": "2026-04-01",
  "date_to": "2026-04-15",
  "tolerance_hours": 0.25
}
```

Response includes suggested `task_id` (when available), `unit_amount`, and default `name` per day.

## Task operation tools

### `odoo_find_my_tasks`

Lists tasks assigned to the current user.

```json
{
  "sender_id": 7,
  "project_id": 9,
  "state": "open",
  "date_deadline_from": "2026-04-01",
  "date_deadline_to": "2026-04-30",
  "limit": 20
}
```

- `state` supports `open` and `closed` via stage fold status.

### `odoo_update_task_status`

Moves a task stage and can post optional progress comment.

```json
{
  "sender_id": 7,
  "task_id": 44,
  "stage_name": "Done",
  "comment": "Development completed and ready for QA"
}
```

- You can use `stage_id` directly or `stage_name` for automatic stage lookup.

## Expense report tools

### `odoo_create_expense_report`

Creates an expense sheet (`hr.expense.sheet`) and links draft expenses.

```json
{
  "sender_id": 7,
  "name": "Expenses April 2026",
  "employee_id": 12,
  "date_from": "2026-04-01",
  "date_to": "2026-04-30"
}
```

Alternative payload with explicit expenses:

```json
{
  "sender_id": 7,
  "expense_ids": [88, 89, 90]
}
```

### `odoo_submit_expense_report`

Submits an expense sheet for approval.

```json
{
  "sender_id": 7,
  "sheet_id": 900
}
```

### `odoo_approve_expense`

Approves or rejects an expense sheet (manager flow).

```json
{
  "sender_id": 5,
  "sheet_id": 900,
  "approve": true
}
```

Reject example:

```json
{
  "sender_id": 5,
  "sheet_id": 900,
  "approve": false,
  "reason": "Missing receipt for one line"
}
```

## Proactive reminder tool

### `odoo_notify_pending_actions`

Aggregates pending workforce actions for reminders.

```json
{
  "sender_id": 7,
  "employee_id": 12,
  "days_back": 7
}
```

Potential alerts:

- Open attendance without checkout
- Missing timesheets
- Draft expenses pending submission
- Expense sheets pending approval
