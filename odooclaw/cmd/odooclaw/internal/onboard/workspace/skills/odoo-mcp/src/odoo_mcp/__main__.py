"""Main entry point for `python -m odoo_mcp`."""

import sys

from odoo_mcp.cli import main

if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
