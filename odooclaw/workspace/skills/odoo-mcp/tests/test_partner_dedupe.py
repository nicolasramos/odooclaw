import pytest
from unittest.mock import MagicMock, call

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.partner_service import find_partner, find_or_create_partner
from odoo_mcp.tools.records import odoo_create
from odoo_mcp.tools.partners import odoo_find_partner


@pytest.fixture
def mock_client():
    return MagicMock(spec=OdooClient)


def test_find_partner_returns_existing_id_without_create(mock_client):
    mock_client.call_kw.return_value = [{"id": 179, "name": "Julio Iglesias"}]

    partner_id = find_partner(mock_client, 7, "Julio Iglesias")

    assert partner_id == 179
    mock_client.call_kw.assert_called_once_with(
        "res.partner",
        "search_read",
        args=[[("name", "=", "Julio Iglesias")]],
        kwargs={"fields": ["id", "name", "email", "vat"], "limit": 1},
        sender_id=7,
    )


def test_find_partner_falls_back_to_fuzzy_name(mock_client):
    mock_client.call_kw.side_effect = [[], [{"id": 181, "name": "Julio Iglesias SA"}]]

    partner_id = find_partner(mock_client, 7, " Julio   Iglesias ")

    assert partner_id == 181
    mock_client.call_kw.assert_has_calls(
        [
            call(
                "res.partner",
                "search_read",
                args=[[("name", "=", "Julio Iglesias")]],
                kwargs={"fields": ["id", "name", "email", "vat"], "limit": 1},
                sender_id=7,
            ),
            call(
                "res.partner",
                "search_read",
                args=[[("name", "ilike", "Julio Iglesias")]],
                kwargs={"fields": ["id", "name", "email", "vat"], "limit": 1},
                sender_id=7,
            ),
        ]
    )


def test_odoo_find_partner_raises_when_missing(mock_client):
    mock_client.call_kw.side_effect = [[], []]

    with pytest.raises(ValueError, match="Partner not found"):
        odoo_find_partner(mock_client, 5, "Julio Iglesias")


def test_find_or_create_partner_reuses_exact_match(mock_client):
    mock_client.call_kw.return_value = [{"id": 179, "name": "Julio Iglesias"}]

    partner_id = find_or_create_partner(mock_client, 5, "Julio Iglesias")

    assert partner_id == 179
    mock_client.call_kw.assert_called_once()


def test_odoo_create_partner_reuses_existing_exact_match(mock_client):
    mock_client.call_kw.return_value = [{"id": 179, "name": "Julio Iglesias"}]

    partner_id = odoo_create(
        mock_client,
        5,
        "res.partner",
        {"name": " Julio Iglesias "},
    )

    assert partner_id == 179
    mock_client.call_kw.assert_called_once_with(
        "res.partner",
        "search_read",
        args=[[("name", "=", "Julio Iglesias")]],
        kwargs={"fields": ["id", "name", "email", "vat"], "limit": 1},
        sender_id=5,
    )


def test_odoo_create_partner_creates_when_no_match(mock_client):
    mock_client.call_kw.side_effect = [[], 180]

    partner_id = odoo_create(
        mock_client,
        5,
        "res.partner",
        {"name": "Julio Iglesias"},
    )

    assert partner_id == 180
    mock_client.call_kw.assert_has_calls(
        [
            call(
                "res.partner",
                "search_read",
                args=[[("name", "=", "Julio Iglesias")]],
                kwargs={"fields": ["id", "name", "email", "vat"], "limit": 1},
                sender_id=5,
            ),
            call(
                "res.partner",
                "create",
                args=[{"name": "Julio Iglesias"}],
                sender_id=5,
            ),
        ]
    )
