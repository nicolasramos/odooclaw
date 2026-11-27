from unittest.mock import MagicMock

import pytest

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.project_service import update_task_status
from odoo_mcp.services.workforce_service import (
    check_in,
    check_out,
    create_expense_report,
    find_missing_timesheets,
    suggest_timesheet_from_attendance,
)


@pytest.fixture
def mock_client():
    return MagicMock(spec=OdooClient)


def test_check_in_creates_attendance_when_none_open(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.side_effect = [[{"id": 12}], [], 101]

    result = check_in(mock_client, sender_id=7)

    assert result["status"] == "checked_in"
    assert result["attendance_id"] == 101


def test_check_out_returns_not_checked_in_when_no_open_attendance(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.side_effect = [[{"id": 12}], []]

    result = check_out(mock_client, sender_id=7)

    assert result["status"] == "not_checked_in"


def test_find_missing_timesheets_returns_day_gaps(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.side_effect = [
        [{"id": 12}],
        [{"id": 1, "check_in": "2026-04-14 09:00:00", "worked_hours": 8.0}],
        [{"id": 10, "date": "2026-04-14", "unit_amount": 6.5}],
    ]

    result = find_missing_timesheets(
        mock_client,
        sender_id=7,
        date_from="2026-04-14",
        date_to="2026-04-14",
        tolerance_hours=0.25,
    )

    assert len(result) == 1
    assert result[0]["missing_hours"] == 1.5


def test_suggest_timesheet_uses_recent_open_task(mock_client):
    mock_client.model_exists.side_effect = [True, True, True]
    mock_client.call_kw.side_effect = [
        [{"id": 12}],
        [{"id": 1, "check_in": "2026-04-14 09:00:00", "worked_hours": 8.0}],
        [],
        [{"id": 77, "name": "Implement API"}],
    ]

    result = suggest_timesheet_from_attendance(
        mock_client,
        sender_id=7,
        date_from="2026-04-14",
        date_to="2026-04-14",
    )

    assert result["missing_days"] == 1
    assert result["suggestions"][0]["task_id"] == 77


def test_create_expense_report_uses_existing_draft_expenses(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.side_effect = [
        [{"id": 12}],
        [{"id": 88}, {"id": 89}],
        900,
        True,
    ]

    result = create_expense_report(
        mock_client,
        sender_id=7,
        date_from="2026-04-01",
        date_to="2026-04-30",
    )

    assert result["ok"] is True
    assert result["sheet_id"] == 900
    assert result["expense_count"] == 2


def test_update_task_status_resolves_stage_name_and_posts_comment(mock_client):
    mock_client.call_kw.side_effect = [
        [{"id": 44, "project_id": [9, "P"], "name": "Task"}],
        [{"id": 5, "name": "Done"}],
        True,
        1001,
        [{"id": 44, "name": "Task", "stage_id": [5, "Done"]}],
    ]

    result = update_task_status(
        mock_client,
        user_id=7,
        task_id=44,
        stage_name="Done",
        comment="Completed",
    )

    assert result["ok"] is True
    assert result["stage_id"] == 5
    assert result["comment_posted"] is True
