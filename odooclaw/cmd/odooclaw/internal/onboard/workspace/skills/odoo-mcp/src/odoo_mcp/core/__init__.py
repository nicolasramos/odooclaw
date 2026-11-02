"""Core layer - Base technical components for Odoo RPC communication."""

from odoo_mcp.core.exceptions import (
    OdooMCPError,
    OdooAuthError,
    OdooSecurityError,
    OdooRPCError,
)
from odoo_mcp.core.session import OdooSession
from odoo_mcp.core.client import OdooClient

__all__ = [
    "OdooMCPError",
    "OdooAuthError",
    "OdooSecurityError",
    "OdooRPCError",
    "OdooSession",
    "OdooClient",
]
