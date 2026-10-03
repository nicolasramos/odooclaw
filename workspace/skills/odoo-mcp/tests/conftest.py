"""Shared pytest fixtures for the odoo-mcp test suite.

Autouse fixture that clears module-level field cache before each test,
preventing _field_cache / _field_cache_timestamps from leaking between
test files (NRA-597).
"""

import pytest

from odoo_mcp.tools.records import (
    _field_cache,
    _field_cache_timestamps,
)


@pytest.fixture(autouse=True)
def clear_field_cache():
    """Reset module-level field cache before each test."""
    _field_cache.clear()
    _field_cache_timestamps.clear()
    yield
