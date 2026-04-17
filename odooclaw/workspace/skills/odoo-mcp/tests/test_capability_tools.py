import pytest
from unittest.mock import MagicMock

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.capability_service import get_capabilities
from odoo_mcp.services.helpdesk_service import (
    create_helpdesk_ticket,
    draft_ticket_email,
)
from odoo_mcp.services.chatter_service import (
    create_activity_summary,
    close_activity_with_reason,
)
from odoo_mcp.services.contract_service import (
    create_contract_line,
    replace_contract_line,
    close_contract_line,
)


@pytest.fixture
def mock_client():
    return MagicMock(spec=OdooClient)


def test_get_capabilities_reports_optional_models(mock_client):
    mock_client.try_get_model_fields.side_effect = lambda model, sender_id=None: {
        "helpdesk.ticket": {"name": {}, "partner_id": {}},
        "mail.activity": {"summary": {}, "res_model": {}, "res_id": {}},
        "contract.contract": {"name": {}},
        "contract.line": {"contract_id": {}, "name": {}, "date_end": {}},
        "mail.compose.message": {"subject": {}, "body": {}},
    }.get(model)

    capabilities = get_capabilities(mock_client, 9)

    assert capabilities["helpdesk"]["available"] is True
    assert capabilities["contracts"]["available"] is True
    assert capabilities["ticket_email_draft"]["available"] is True


def test_create_helpdesk_ticket_returns_unsupported_when_missing_model(mock_client):
    mock_client.try_get_model_fields.return_value = None

    result = create_helpdesk_ticket(mock_client, 7, "Printer issue")

    assert result["ok"] is False
    assert result["status"] == "unsupported"


def test_draft_ticket_email_returns_structured_draft(mock_client):
    mock_client.try_get_model_fields.side_effect = lambda model, sender_id=None: {
        "name": {}
    }
    mock_client.call_kw.side_effect = [
        [{"id": 12, "name": "Ticket 12", "partner_id": [44, "ACME"]}],
        [{"id": 44, "email": "ops@acme.test"}],
    ]

    result = draft_ticket_email(mock_client, 5, 12, "Status update", "Body text")

    assert result["ok"] is True
    assert result["draft"]["email_to"] == "ops@acme.test"
    assert result["draft"]["ticket_id"] == 12


def test_create_activity_summary_reads_back_activity(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.side_effect = [
        [88],
        101,
        [{"id": 101, "summary": "Follow up"}],
    ]

    result = create_activity_summary(mock_client, 3, "res.partner", 88, "Follow up")

    assert result["ok"] is True
    assert result["activity_id"] == 101
    assert result["activity"]["summary"] == "Follow up"


def test_close_activity_with_reason_returns_context(mock_client):
    mock_client.model_exists.return_value = True
    mock_client.call_kw.side_effect = [
        [{"id": 22, "summary": "Call back"}],
        True,
    ]

    result = close_activity_with_reason(mock_client, 3, 22, "Resolved")

    assert result["ok"] is True
    assert result["activity_id"] == 22
    assert result["reason"] == "Resolved"


def test_create_contract_line_uses_available_fields(mock_client):
    mock_client.try_get_model_fields.side_effect = lambda model, sender_id=None: {
        "contract.line": {
            "contract_id": {},
            "name": {},
            "quantity": {},
            "price_unit": {},
            "date_start": {},
        },
        "contract.contract": {"name": {}},
    }.get(model)
    mock_client.call_kw.return_value = 77

    result = create_contract_line(
        mock_client,
        4,
        contract_id=9,
        name="Premium",
        quantity=2,
        price_unit=99,
        date_start="2026-04-01",
    )

    assert result["ok"] is True
    assert result["line_id"] == 77
    assert result["values"]["contract_id"] == 9


def test_replace_contract_line_closes_then_creates(mock_client):
    mock_client.try_get_model_fields.side_effect = lambda model, sender_id=None: {
        "contract.line": {
            "contract_id": {},
            "name": {},
            "date_end": {},
            "active": {},
            "product_id": {},
            "price_unit": {},
        },
        "contract.contract": {"name": {}},
    }.get(model)
    mock_client.call_kw.side_effect = [
        [
            {
                "id": 31,
                "contract_id": [9, "C-9"],
                "name": "Old",
                "product_id": [5, "Product"],
            }
        ],
        True,
        90,
    ]

    result = replace_contract_line(
        mock_client,
        6,
        31,
        name="New",
        price_unit=12.5,
        date_start="2026-05-01",
        close_reason="Superseded",
    )

    assert result["ok"] is True
    assert result["old_line_id"] == 31
    assert result["new_line"]["line_id"] == 90


def test_close_contract_line_returns_unsupported_without_close_fields(mock_client):
    mock_client.try_get_model_fields.side_effect = lambda model, sender_id=None: {
        "contract.line": {"contract_id": {}},
        "contract.contract": {"name": {}},
    }.get(model)

    result = close_contract_line(mock_client, 6, 31, reason="Done")

    assert result["ok"] is False
    assert result["status"] == "unsupported"
