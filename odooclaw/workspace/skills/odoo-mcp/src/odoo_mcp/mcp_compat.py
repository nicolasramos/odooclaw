"""MCP SDK compatibility shim: import FastMCP across SDK major versions.

The MCP Python SDK renamed ``FastMCP`` (``mcp.server.fastmcp``) to ``MCPServer``
(``mcp.server.mcpserver``) in 2.0, and the old module now raises
``ModuleNotFoundError`` on import, so a direct import only works on one side of
the rename. This module keeps the server importable on both lines and re-exports
the class under the historical ``FastMCP`` name.

mypy sees whichever SDK major version the environment resolved, so it can only
validate one of the two imports: the codes it cannot know about are disabled for
this file only.
"""

# mypy: disable-error-code="attr-defined,import-not-found,import-untyped"

try:
    from mcp.server.fastmcp import FastMCP  # SDK < 2.0
except ModuleNotFoundError:  # pragma: no cover - exercised per SDK major version
    from mcp.server.mcpserver import MCPServer as FastMCP  # SDK >= 2.0

__all__ = ["FastMCP"]
