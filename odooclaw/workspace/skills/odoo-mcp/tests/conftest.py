"""Shared pytest fixtures for the odoo-mcp test suite.

Ensures module-level state in ``odoo_mcp.tools.records`` is cleaned
between test files so that running ``pytest tests/`` is order-independent.
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
