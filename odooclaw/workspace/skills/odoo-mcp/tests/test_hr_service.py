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





# ---------------------------------------------------------------------------
# Domain-shape regression, measured against a live Odoo 17 (stock.picking,
# account.move and hr.employee all behave identically).
#
# ``OdooClient.call_kw`` forwards ``args`` as the method's positional
# arguments, so ``search_read`` receives the domain as its FIRST positional
# argument and the value handed to ``call_kw`` must be ``[DOMAIN]``, DOMAIN
# being a non-empty list of leaves.
#
#     [[(x, y, z)]]            leaf at the right depth          -> 200
#     [[x, y, z]]              leaf at the right depth          -> 200
#     [[[x, y, z]]]            domain one level down            -> 200
#     [[[(x, y, z)]]]          domain one level down            -> 500  <-- bug
#     [["id", "=", 777]]       bare leaf instead of a domain    -> 500
#
# A tuple leaf is fine at the correct depth; what breaks Odoo is a DOMAIN that
# is not a flat list of leaves -- the parser then meets a nested token and
# raises ``IndexError: tuple index out of range``
# (``odoo/osv/expression.py:265``), which ``call_kw_as_user`` masks as HTTP
# 500. The agent reports "internal error in the Odoo server" and loses the
# data silently.
# ---------------------------------------------------------------------------

def _is_leaf(item):
    """A leaf is a non-empty sequence of scalars, e.g. ``["user_id", "=", 7]``."""
    return (
        isinstance(item, (list, tuple))
        and len(item) > 0
        and not any(isinstance(e, (list, tuple)) for e in item)
    )


def _is_domain(items):
    return (
        isinstance(items, (list, tuple))
        and len(items) > 0
        and all(_is_leaf(e) for e in items)
    )


def _domain_nested_one_level_too_deep(value):
    """True when a well-formed domain sits one level below where it is expected.

    This is exactly the ``[[[(...)]]]`` shape: ``value[0]`` is itself a domain
    instead of a leaf, so Odoo receives a nested token as a domain leaf.
    """
    if not isinstance(value, (list, tuple)):
        return False
    for elem in value:
        if isinstance(elem, (list, tuple)) and not _is_leaf(elem):
            if _is_domain(elem):
                return True
            if _domain_nested_one_level_too_deep(elem):
                return True
    return False


def test_find_attendance_employee_domain_is_a_well_formed_domain(mock_client):
    """Regression for ``[[[(...)]]]`` in ``_resolve_employee_id``.

    The old code wrapped the tuple leaf in one list too many, so
    ``odoo_find_attendance`` returned a 500 whenever the caller omitted
    ``employee_id`` (the global-search path). With an explicit ``employee_id``
    the helper is never reached, which is why the failure looked intermittent.
    """
    mock_client.model_exists.return_value = True
    mock_client.call_kw.side_effect = [[{"id": 12}], []]

    find_attendance(mock_client, sender_id=7)

    args = mock_client.call_kw.call_args_list[0].kwargs["args"]
    assert args == [[("user_id", "=", 7)]], (
        "hr.employee.search_read must receive exactly [[leaf, ...]]; got %r" % (args,)
    )
    assert _is_domain(args[0]), (
        "expected a flat list of leaves as the domain, got %r" % (args[0],)
    )
    assert not _domain_nested_one_level_too_deep(args[0]), (
        "domain is nested one level too deep (%r) -- Odoo raises IndexError and "
        "the ORM error surfaces as HTTP 500" % (args[0],)
    )
