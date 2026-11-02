"""Shared pytest fixtures for the odoo-mcp test suite.

Autouse fixture that clears the module-level field schema cache before each
test, preventing _field_cache / _field_cache_timestamps from leaking between
test files (NRA-597). The cache lives in odoo_mcp.core.field_schema and is
shared by the summary services and the record field validation.
"""

import pytest

from odoo_mcp.core.field_schema import (
    _field_cache,
    _field_cache_timestamps,
    _unreadable_cache,
)


@pytest.fixture(autouse=True)
def clear_field_cache():
    """Reset module-level field cache before each test."""
    _field_cache.clear()
    _field_cache_timestamps.clear()
    _unreadable_cache.clear()
    yield
