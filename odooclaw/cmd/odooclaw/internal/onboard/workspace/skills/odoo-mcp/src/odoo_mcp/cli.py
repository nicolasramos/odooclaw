"""CLI entrypoint for odoo-mcp."""

from __future__ import annotations

import argparse
import os
import sys

from dotenv import load_dotenv

from odoo_mcp import __version__


def _missing_required_env() -> list[str]:
    required = ("ODOO_URL", "ODOO_DB", "ODOO_USERNAME", "ODOO_PASSWORD")
    return [name for name in required if not (os.environ.get(name) or "").strip()]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="odoo-mcp", description="Run Odoo MCP server")
    parser.add_argument("--check-config", action="store_true", help="Validate required env vars")
    parser.add_argument("--version", action="store_true", help="Print package version and exit")
    args = parser.parse_args(argv)

    if args.version:
        print(__version__)
        return 0

    load_dotenv()

    if args.check_config:
        missing = _missing_required_env()
        if missing:
            print(
                "Missing mandatory Odoo environment variables: " + ", ".join(missing),
                file=sys.stderr,
            )
            return 1
        print("Configuration OK: required Odoo environment variables are present.")
        return 0

    from odoo_mcp.server import mcp

    mcp.run()
    return 0
