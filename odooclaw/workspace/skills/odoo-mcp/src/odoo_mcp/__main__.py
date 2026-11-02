"""Entry point for `python -m odoo_mcp`.

The module is copied into the agent workspace as a skill, so it must run from
source without being installed in site-packages.
"""

from odoo_mcp.server import mcp

if __name__ == "__main__":
    mcp.run()
