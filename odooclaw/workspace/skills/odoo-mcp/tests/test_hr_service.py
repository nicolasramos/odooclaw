from unittest.mock import MagicMock

import pytest

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.hr_service import find_attendance, log_task_timesheet


@pytest.fixture
def mock_client():
    return MagicMock(spec=OdooClient)


def test_find_attendance_resolves_employee_and_queries_records(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.side_effect = [
        [{"id": 12}],
        [{"id": 1, "worked_hours": 8.0}],
    ]

    result = find_attendance(
        mock_client,
        sender_id=7,
        date_from="2026-04-01",
        date_to="2026-04-02",
        limit=10,
    )

    assert len(result) == 1
    assert result[0]["worked_hours"] == 8.0
    assert mock_client.call_kw.call_args_list[1].kwargs["sender_id"] == 7


def test_find_attendance_raises_when_employee_cannot_be_resolved(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.return_value = []

    with pytest.raises(ValueError, match="Could not resolve employee"):
        find_attendance(mock_client, sender_id=7)


def test_log_task_timesheet_reads_project_from_task(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.side_effect = [
        [{"id": 44, "project_id": [9, "Project X"]}],
        101,
    ]

    result = log_task_timesheet(
        mock_client,
        sender_id=3,
        task_id=44,
        name="Development work",
        unit_amount=2.5,
        employee_id=17,
        date="2026-04-15",
    )

    assert result == 101
    create_call = mock_client.call_kw.call_args_list[1]
    assert create_call.args[0] == "account.analytic.line"
    assert create_call.args[1] == "create"
    vals = create_call.kwargs["args"][0]
    assert vals["project_id"] == 9
    assert vals["task_id"] == 44
    assert vals["employee_id"] == 17


def test_log_task_timesheet_raises_when_task_has_no_project(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.return_value = [{"id": 44, "project_id": False}]

    with pytest.raises(ValueError, match="has no project_id"):
        log_task_timesheet(
            mock_client,
            sender_id=3,
            task_id=44,
            name="Development work",
            unit_amount=1.0,
        )
