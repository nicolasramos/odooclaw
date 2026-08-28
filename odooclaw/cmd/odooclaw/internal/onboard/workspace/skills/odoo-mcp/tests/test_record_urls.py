"""Unit tests for clickable record URLs (NRA-425/NRA-426).

Covers the record URL constructor (build_record_url) and the serializer
injection of ``__url`` into odoo_read / odoo_search_read results.
"""

from unittest.mock import MagicMock, call as mock_call

import pytest

from odoo_mcp.core.serializers import build_record_url, serialize_records
from odoo_mcp.tools.records import odoo_read, odoo_search_read


# --- build_record_url -------------------------------------------------------


def test_build_record_url_formats_web_hash():
    url = build_record_url("https://erp.example.com", "res.partner", 42)
    assert url == "https://erp.example.com/web#id=42&model=res.partner&view_type=form"


def test_build_record_url_strips_trailing_slash():
    url = build_record_url("https://erp.example.com/", "sale.order", 7)
    assert url == "https://erp.example.com/web#id=7&model=sale.order&view_type=form"


def test_build_record_url_allows_http_and_https():
    assert build_record_url("http://192.168.1.14:8069", "res.partner", 1).startswith(
        "http://192.168.1.14:8069/web#id=1"
    )
    assert build_record_url("https://odoo.example.com", "crm.lead", 2).startswith(
        "https://odoo.example.com/web#id=2"
    )


def test_build_record_url_rejects_non_http_scheme():
    assert build_record_url("javascript:alert(1)", "res.partner", 1) is None
    assert build_record_url("ftp://erp.example.com", "res.partner", 1) is None
    assert build_record_url("file:///etc/passwd", "res.partner", 1) is None


def test_build_record_url_rejects_url_without_scheme():
    assert build_record_url("erp.example.com", "res.partner", 1) is None


# --- serialize_records ------------------------------------------------------


def test_serialize_records_injects_url_when_model_and_base_url_given():
    records = [{"id": 42, "name": "Acme SL"}]
    res = serialize_records(
        records, model="res.partner", base_url="https://erp.example.com"
    )
    assert res[0]["__url"] == (
        "https://erp.example.com/web#id=42&model=res.partner&view_type=form"
    )
    assert res[0]["name"] == "Acme SL"


def test_serialize_records_injects_url_for_every_record():
    records = [{"id": 1, "name": "A"}, {"id": 2, "name": "B"}]
    res = serialize_records(records, model="res.partner", base_url="https://erp.example.com")
    assert [r["__url"] for r in res] == [
        "https://erp.example.com/web#id=1&model=res.partner&view_type=form",
        "https://erp.example.com/web#id=2&model=res.partner&view_type=form",
    ]


def test_serialize_records_does_not_add_url_without_model_or_base_url():
    res = serialize_records([{"id": 42, "name": "Acme SL"}])
    assert "__url" not in res[0]


def test_serialize_records_skips_url_when_base_url_has_invalid_scheme():
    records = [{"id": 42, "name": "Acme SL"}]
    res = serialize_records(records, model="res.partner", base_url="javascript:alert(1)")
    assert "__url" not in res[0]


def test_serialize_records_keeps_html_truncation_with_url_injection():
    records = [{"id": 1, "html_field": "<div>" + "x" * 3000 + "</div>"}]
    res = serialize_records(records, model="res.partner", base_url="https://erp.example.com")
    assert res[0]["html_field"] == (
        f"<{len(records[0]['html_field'])} bytes of HTML content omitted>"
    )
    assert res[0]["__url"].startswith("https://erp.example.com/web#id=1")


def test_serialize_records_does_not_clobber_existing_url_field():
    records = [{"id": 1, "url": "https://custom.example.com/thing"}]
    res = serialize_records(records, model="res.partner", base_url="https://erp.example.com")
    assert res[0]["url"] == "https://custom.example.com/thing"
    assert res[0]["__url"] == (
        "https://erp.example.com/web#id=1&model=res.partner&view_type=form"
    )


# --- records.py integration -------------------------------------------------


@pytest.fixture
def mock_client():
    """Minimal mock: odoo_session.url + call_kw that returns fields_get for
    validation and record data for read/search_read.

    Tests that need different return values can override
    ``client.call_kw.side_effect`` directly.
    """
    client = MagicMock()
    client.odoo_session.url = "https://erp.example.com"

    _default_fields_get = {
        "id": {"type": "integer"},
        "name": {"type": "char"},
        "is_public": {"type": "boolean"},
        "contact_count": {"type": "integer"},
        "active": {"type": "boolean"},
    }

    def _call_kw_side_effect(model, method, *args, **kwargs):
        if method == "fields_get":
            return _default_fields_get
        # read / search_read → return record list
        return [{"id": 42, "name": "Acme SL"}]

    client.call_kw.side_effect = _call_kw_side_effect
    return client


def test_odoo_read_includes_url_per_record(mock_client):
    res = odoo_read(mock_client, 1, "res.partner", [42], ["name"])
    assert res[0]["__url"] == (
        "https://erp.example.com/web#id=42&model=res.partner&view_type=form"
    )
    # Two calls: fields_get (index 0) + read (index 1)
    assert mock_client.call_kw.call_count == 2
    read_call = mock_client.call_kw.call_args_list[1]
    assert read_call == mock_call(
        "res.partner",
        "read",
        args=[[42]],
        kwargs={"fields": ["name"]},
        sender_id=1,
    )


def test_odoo_search_read_includes_url_per_record(mock_client):
    mock_client.call_kw.side_effect = lambda model, method, *args, **kwargs: (
        [
            {"id": 7, "name": "Acme SL"},
            {"id": 9, "name": "Acme GmbH"},
        ] if method != "fields_get" else {
            "id": {"type": "integer"},
            "name": {"type": "char"},
            "is_public": {"type": "boolean"},
            "contact_count": {"type": "integer"},
            "active": {"type": "boolean"},
        }
    )
    res = odoo_search_read(
        mock_client, 1, "res.partner", [["name", "ilike", "Acme"]], ["name"], limit=10
    )
    assert res[0]["__url"] == (
        "https://erp.example.com/web#id=7&model=res.partner&view_type=form"
    )
    assert res[1]["__url"] == (
        "https://erp.example.com/web#id=9&model=res.partner&view_type=form"
    )


def test_odoo_read_without_session_url_adds_no_url(mock_client):
    mock_client.odoo_session.url = None
    res = odoo_read(mock_client, 1, "res.partner", [42])
    assert "__url" not in res[0]
