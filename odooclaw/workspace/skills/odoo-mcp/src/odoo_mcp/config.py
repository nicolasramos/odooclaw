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
    "product.supplierinfo",
    "stock.picking",
    "stock.move",
    "stock.move.line",
    "stock.quant",
    "stock.location",
    "stock.warehouse",
    "stock.lot",
    "stock.production.lot",
    "stock.route",
    "stock.rule",
    "product.category",
    "uom.uom",
    "uom.category",
    "purchase.request",
    "purchase.blanket.order",
    "purchase.invoice.plan",
    "purchase.order.product.recommendation",
    "helpdesk.ticket",
    "sale.order",
    "sale.order.line",
    "purchase.order",
    "purchase.order.line",
    "account.move",
    "account.move.line",
    "account.bank.statement.line",
    "account.payment",
    "account.payment.register",
    "account.journal",
    "account.tax",
    "account.account",
    "crm.lead",
    "contract.contract",
    "contract.line",
    "mail.message",
    "mail.activity",
    "mail.compose.message",
    "discuss.channel",
    "project.task",
    "hr.employee",
    "hr.attendance",
    "account.analytic.line",
    "hr.expense",
    "hr.expense.sheet",
}

DEFAULT_DENIED_FIELDS: Set[str] = {
    "company_id",
    "create_uid",
    "create_date",
    "write_uid",
    "write_date",
    "state",
}
