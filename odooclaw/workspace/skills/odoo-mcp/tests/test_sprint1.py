from unittest.mock import MagicMock

import pytest

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.chatter_service import (
    create_activity,
    list_pending_activities,
    mark_activity_done,
    post_chatter_message,
)
from odoo_mcp.services.partner_service import get_partner_summary


@pytest.fixture
def mock_client():
    client = MagicMock(spec=OdooClient)
    return client


def test_get_partner_summary(mock_client):
    """The summary is built from the instance schema, not a fixed field list."""
    schema = {
        "name": {"type": "char"},
        "email": {"type": "char"},
        "mobile": {"type": "char"},
        "user_id": {"type": "many2one"},
        "credit": {"type": "monetary"},
        "debit": {"type": "monetary"},
    }

    def _call_kw(model, method, *args, **kwargs):
        if method == "fields_get":
            if model == "res.partner":
                return schema
            # no sale/account module on this instance
            raise ValueError(f"Model {model} doesn't exist")
        if method == "read":
            return [
                {
                    "id": 1,
                    "name": "Test Partner",
                    "mobile": "+34600000001",
                    "user_id": [2, "Salesperson"],
                    "credit": 0.0,
                    "debit": 0.0,
                }
            ]
        raise AssertionError(f"unexpected call_kw: {model}.{method}")

    mock_client.call_kw.side_effect = _call_kw

    summary = get_partner_summary(mock_client, 1, 1)

    assert summary["name"] == "Test Partner"
    assert summary["mobile"] == "+34600000001"
    assert summary["salesperson"] == "Salesperson"
    assert summary["financial_balance"] == 0.0
    assert summary["open_sale_orders"] is None
    assert summary["open_invoices"] is None


def test_create_activity(mock_client):
    mock_client.call_kw.side_effect = [[17], 42]
    act_id = create_activity(mock_client, 1, "res.partner", 1, "Call", "Need to call them")
    assert act_id == 42
    mock_client.call_kw.assert_called_with(
        "mail.activity",
        "create",
        args=[
            {
                "res_model": "res.partner",
                "res_id": 1,
                "summary": "Call",
                "note": "Need to call them",
                "res_model_id": 17,
            }
        ],
        sender_id=1,
    )


def test_create_activity_includes_deadline_when_provided(mock_client):
    mock_client.call_kw.side_effect = [[17], 42]

    create_activity(
        mock_client,
        1,
        "res.partner",
        1,
        "Call",
        "Need to call them",
        date_deadline="2026-06-30",
    )

    values = mock_client.call_kw.call_args.kwargs["args"][0]
    assert values["date_deadline"] == "2026-06-30"


def test_list_pending_activities(mock_client):
    mock_client.call_kw.return_value = [{"id": 1, "summary": "Call"}]
    acts = list_pending_activities(mock_client, 1, assign_to=1)
    assert len(acts) == 1
    assert acts[0]["summary"] == "Call"


def test_mark_activity_done(mock_client):
    mock_client.call_kw.return_value = True
    res = mark_activity_done(mock_client, 1, 42, "Done")
    assert res is True
    # Action mark as done usually goes to action_feedback
    mock_client.call_kw.assert_called_with(
        "mail.activity",
        "action_feedback",
        args=[[42]],
        kwargs={"feedback": "Done"},
        sender_id=1,
    )


def test_post_chatter_message(mock_client):
    mock_client.call_kw.return_value = 99
    msg_id = post_chatter_message(mock_client, 1, "res.partner", 1, "Hello from MCP")
    assert msg_id == 99
    mock_client.call_kw.assert_called_with(
        "res.partner",
        "message_post",
        args=[[1]],
        kwargs={"body": "Hello from MCP", "message_type": "comment"},
        sender_id=1,
    )
