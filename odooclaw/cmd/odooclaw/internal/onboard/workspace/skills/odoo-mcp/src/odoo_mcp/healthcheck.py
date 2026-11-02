"""Container healthcheck for odoo-mcp.

This check is intentionally local-only (no network/auth calls):
- validates required env vars are present
- validates numeric limits are parseable
- validates server module import and CLI entrypoint wiring
"""

import os
import sys


def _required_env() -> tuple[bool, str]:
    required = ["ODOO_URL", "ODOO_DB", "ODOO_USERNAME", "ODOO_PASSWORD"]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        return False, f"missing env vars: {', '.join(missing)}"
    return True, "ok"


def _limits() -> tuple[bool, str]:
    try:
        int(os.environ.get("ODOO_MCP_DEFAULT_LIMIT", "50"))
        int(os.environ.get("ODOO_MCP_MAX_LIMIT", "80"))
    except ValueError:
        return False, "ODOO_MCP_DEFAULT_LIMIT and ODOO_MCP_MAX_LIMIT must be integers"
    return True, "ok"


def main() -> int:
    ok, msg = _required_env()
    if not ok:
        print(msg)
        return 1

    ok, msg = _limits()
    if not ok:
        print(msg)
        return 1

    # import checks
    from odoo_mcp import __version__  # noqa: F401
    from odoo_mcp.cli import main as _cli_main  # noqa: F401
    from odoo_mcp.server import mcp  # noqa: F401

    return 0


if __name__ == "__main__":
    sys.exit(main())
