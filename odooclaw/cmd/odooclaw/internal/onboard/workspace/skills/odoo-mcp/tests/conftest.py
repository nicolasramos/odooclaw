"""Shared pytest fixtures for the odoo-mcp test suite.

Autouse fixture that clears module-level field cache before each test,
preventing _field_cache / _field_cache_timestamps from leaking between
test files (NRA-597).
"""

import pytest

try:  # depends on the packaged version: newer builds dropped the cache
    from odoo_mcp.tools.records import (
        _field_cache,
        _field_cache_timestamps,
    )
except ImportError:
    _field_cache = None
    _field_cache_timestamps = None


@pytest.fixture(autouse=True)
def clear_field_cache():
    """Reset module-level field cache before each test when present."""
    if _field_cache is not None:
        _field_cache.clear()
    if _field_cache_timestamps is not None:
        _field_cache_timestamps.clear()
    yield
