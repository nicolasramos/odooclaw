"""Observability layer - Logging, metrics, and audit."""

from odoo_mcp.observability.logging import get_logger
from odoo_mcp.observability.metrics import measure_time
from odoo_mcp.observability.audit import log_audit_event

__all__ = [
    "get_logger",
    "measure_time",
    "log_audit_event",
]
