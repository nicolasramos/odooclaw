import pytest
from unittest.mock import MagicMock
from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.partner_service import get_partner_summary
from odoo_mcp.services.chatter_service import create_activity, list_pending_activities, mark_activity_done, post_chatter_message

@pytest.fixture
def mock_client():
    client = MagicMock(spec=OdooClient)
    return client

def test_get_partner_summary(mock_client):
    mock_client.call_kw.side_effect = [
        [{"id": 1, "name": "Test Partner", "user_id": [2, "Salesperson"]}], # partner read
        1000.50,  # some hypothetical sales sum
        3         # total activities
    ]
    summary = get_partner_summary(mock_client, 1, 1)
    assert summary["name"] == "Test Partner"
    
def test_create_activity(mock_client):
    mock_client.call_kw.return_value = 42
    act_id = create_activity(mock_client, 1, "res.partner", 1, "Call", "Need to call them")
    assert act_id == 42
    mock_client.call_kw.assert_called_with("mail.activity", "create", args=([
        {"res_model": "res.partner", "res_id": 1, "summary": "Call", "note": "Need to call them"}
    ],), sender_id=1)

def test_list_pending_activities(mock_client):
    mock_client.call_kw.return_value = [{"id": 1, "summary": "Call"}]
    acts = list_pending_activities(mock_client, 1, user_id=1)
    assert len(acts) == 1
    assert acts[0]["summary"] == "Call"

def test_mark_activity_done(mock_client):
    mock_client.call_kw.return_value = True
    res = mark_activity_done(mock_client, 1, 42, "Done")
    assert res is True
    # Action mark as done usually goes to action_feedback
    mock_client.call_kw.assert_called_with("mail.activity", "action_feedback", args=([42],), kwargs={"feedback": "Done"}, sender_id=1)

def test_post_chatter_message(mock_client):
    mock_client.call_kw.return_value = 99
    msg_id = post_chatter_message(mock_client, 1, "res.partner", 1, "Hello from MCP")
    assert msg_id == 99
    mock_client.call_kw.assert_called_with("res.partner", "message_post", args=([1],), kwargs={"body": "Hello from MCP", "message_type": "comment"}, sender_id=1)
