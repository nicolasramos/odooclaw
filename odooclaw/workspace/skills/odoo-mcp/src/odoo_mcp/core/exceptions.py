class OdooMCPError(Exception):
    """Base exception for all Odoo MCP errors."""
    pass

class OdooAuthError(OdooMCPError):
    """Raised when authentication fails."""
    pass

class OdooSecurityError(OdooMCPError):
    """Raised when an operation violates MCP security constraints."""
    pass

class OdooRPCError(OdooMCPError):
    """Raised when Odoo returns an RPC or constraint error."""
    pass
