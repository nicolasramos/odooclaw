import pytest
from unittest.mock import MagicMock
from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.project_service import find_task, create_task, update_task
from odoo_mcp.services.sales_service import find_sale_order, get_sale_order_summary
from odoo_mcp.services.generic_service import get_record_summary

@pytest.fixture
def mock_client():
    client = MagicMock(spec=OdooClient)
    return client

def test_find_task(mock_client):
    mock_client.call_kw.return_value = [{"id": 1, "name": "Task 1"}]
    res = find_task(mock_client, 1, "Design MCP")
    assert len(res) == 1
    assert res[0]["name"] == "Task 1"
    
def test_create_task(mock_client):
    mock_client.call_kw.return_value = 10
    task_id = create_task(mock_client, 1, "Develop feature", project_id=5)
    assert task_id == 10

def test_get_sale_order_summary(mock_client):
    mock_client.call_kw.side_effect = [
        [{"id": 1, "name": "SO001", "state": "sale", "amount_total": 500, "partner_id": [2, "ACME"]}],
        [{"id": 1, "name": "Product A", "price_unit": 100}] # dummy lines
    ]
    summary = get_sale_order_summary(mock_client, 1, 1)
    assert summary["name"] == "SO001"
    assert summary["total"] == 500
