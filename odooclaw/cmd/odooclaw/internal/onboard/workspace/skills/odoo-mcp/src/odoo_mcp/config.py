import os
from typing import Set

# Limits
DEFAULT_SEARCH_LIMIT = int(os.environ.get("ODOO_MCP_DEFAULT_LIMIT", 50))
MAX_SEARCH_LIMIT = int(os.environ.get("ODOO_MCP_MAX_LIMIT", 80))

# Security Configuration Defaults
DEFAULT_ALLOWED_MODELS: Set[str] = {
    "res.partner",
    "product.product",
    "product.template",
    "sale.order",
    "sale.order.line",
    "purchase.order",
    "purchase.order.line",
    "account.move",
    "account.move.line",
    "crm.lead",
    "mail.message",
    "mail.activity",
    "discuss.channel",
    "project.task",
}

DEFAULT_DENIED_FIELDS: Set[str] = {
    "company_id",
    "create_uid",
    "create_date",
    "write_uid",
    "write_date",
    "state",
}
