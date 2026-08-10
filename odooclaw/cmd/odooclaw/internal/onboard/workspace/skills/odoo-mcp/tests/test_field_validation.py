"""Unit tests for field validation in odoo_read / odoo_search_read (NRA-496).

Covers:
- Invalid field → explicit OdooRPCError (not a 500)
- ``__``-prefixed synthetic fields are stripped silently
- Valid fields pass through unchanged
- ``fields=None`` → no validation, call without ``fields`` kwarg
- odoo_search_read with invalid field → same explicit error
"""

from unittest.mock import MagicMock

import pytest

from odoo_mcp.core.exceptions import OdooRPCError
from odoo_mcp.tools.records import (
    _field_cache,
    _field_cache_timestamps,
    odoo_read,
    odoo_search_read,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_client(fields_get_result=None):
    """Build a mock client whose call_kw returns *fields_get_result* for
    ``fields_get`` calls and record data for read/search_read calls."""
    if fields_get_result is None:
        fields_get_result = {
            "name": {"type": "char"},
            "is_public": {"type": "boolean"},
            "contact_count": {"type": "integer"},
            "active": {"type": "boolean"},
        }

    client = MagicMock()
    client.odoo_session.url = "https://erp.example.com"

    def _call_kw_side_effect(model, method, *args, **kwargs):
        if method == "fields_get":
            return fields_get_result
        # read / search_read → return record list
        return [{"id": 42, "name": "Acme SL"}]

    client.call_kw.side_effect = _call_kw_side_effect
    return client


def _extract_fields_from_call(calls, call_index):
    """Extract the ``fields`` value from a recorded call_kw call."""
    inner_kwargs = calls[call_index].kwargs["kwargs"]
    return inner_kwargs.get("fields")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_field_cache():
    """Reset module-level field cache before each test."""
    _field_cache.clear()
    _field_cache_timestamps.clear()
    yield


# ---------------------------------------------------------------------------
# odoo_read tests
# ---------------------------------------------------------------------------

def test_odoo_read_invalid_field_raises_explicit_error():
    """Invalid field → OdooRPCError listing unknown + valid fields."""
    client = _make_mock_client()
    with pytest.raises(OdooRPCError) as exc_info:
        odoo_read(client, 1, "res.partner", [42], ["name", "contact_nbr"])
    err_msg = str(exc_info.value)
    assert "contact_nbr" in err_msg
    assert "name" in err_msg  # valid fields shown too


def test_odoo_read_strips_double_underscore_fields():
    """Fields like ``__url`` are silently discarded; call_kw gets clean list."""
    client = _make_mock_client()
    odoo_read(client, 1, "res.partner", [42], ["name", "__url"])
    calls = client.call_kw.call_args_list
    # Two calls: fields_get (index 0) + read (index 1)
    assert _extract_fields_from_call(calls, 1) == ["name"]


def test_odoo_read_valid_fields_pass_through():
    """Valid fields are passed unchanged to call_kw."""
    client = _make_mock_client()
    odoo_read(client, 1, "res.partner", [42], ["name", "id"])
    calls = client.call_kw.call_args_list
    assert _extract_fields_from_call(calls, 1) == ["name", "id"]


def test_odoo_read_none_fields_no_validation():
    """fields=None → no validation, call_kw called without fields kwarg."""
    client = _make_mock_client()
    odoo_read(client, 1, "res.partner", [42])
    calls = client.call_kw.call_args_list
    # Only one call (fields_get is skipped when fields=None)
    assert len(calls) == 1
    assert "fields" not in calls[0].kwargs["kwargs"]


def test_odoo_read_only_underscore_fields_stripped():
    """When fields contains ONLY ``__``-prefixed keys, call_kw gets no fields."""
    client = _make_mock_client()
    odoo_read(client, 1, "res.partner", [42], ["__url", "__last_update"])
    calls = client.call_kw.call_args_list
    # Only one call (no fields_get needed since clean list is empty)
    assert len(calls) == 1
    assert "fields" not in calls[0].kwargs["kwargs"]


# ---------------------------------------------------------------------------
# odoo_search_read tests
# ---------------------------------------------------------------------------

def test_odoo_search_read_invalid_field_raises():
    """Invalid field in search_read → explicit error."""
    client = _make_mock_client()
    with pytest.raises(OdooRPCError) as exc_info:
        odoo_search_read(
            client, 1, "res.partner", [["name", "ilike", "Acme"]],
            ["name", "contact_nbr"], limit=10,
        )
    assert "contact_nbr" in str(exc_info.value)


def test_odoo_search_read_valid_fields_pass():
    """Valid fields pass through in search_read."""
    client = _make_mock_client()
    odoo_search_read(
        client, 1, "res.partner", [["name", "ilike", "Acme"]],
        ["name", "id"], limit=10,
    )
    calls = client.call_kw.call_args_list
    # Two calls: fields_get (index 0) + search_read (index 1)
    assert _extract_fields_from_call(calls, 1) == ["name", "id"]


def test_odoo_search_read_none_fields_no_validation():
    """fields=None → no validation in search_read."""
    client = _make_mock_client()
    odoo_search_read(
        client, 1, "res.partner", [["name", "ilike", "Acme"]],
        limit=10,
    )
    calls = client.call_kw.call_args_list
    # Only one call (no fields_get needed)
    assert len(calls) == 1
    assert "fields" not in calls[0].kwargs["kwargs"]


def test_odoo_search_read_strips_underscore_fields():
    """Synthetic ``__`` fields are stripped in search_read."""
    client = _make_mock_client()
    odoo_search_read(
        client, 1, "res.partner", [["name", "ilike", "Acme"]],
        ["name", "__url"], limit=10,
    )
    calls = client.call_kw.call_args_list
    # Two calls: fields_get (index 0) + search_read (index 1)
    assert _extract_fields_from_call(calls, 1) == ["name"]
