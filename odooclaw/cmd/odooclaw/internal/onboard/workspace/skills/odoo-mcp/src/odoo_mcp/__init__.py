"""Odoo MCP Server - A modular, type-safe, and secure MCP server for Odoo 18."""

__version__ = "2.0.0"


def main(argv=None):
    from odoo_mcp.cli import main as _main

    return _main(argv)


__all__ = ["__version__", "main"]
