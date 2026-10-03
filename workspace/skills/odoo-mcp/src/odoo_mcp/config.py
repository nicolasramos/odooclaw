import os
from typing import Set

# Limits
DEFAULT_SEARCH_LIMIT = int(os.environ.get("ODOO_MCP_DEFAULT_LIMIT", 50))
MAX_SEARCH_LIMIT = int(os.environ.get("ODOO_MCP_MAX_LIMIT", 80))

# Security Configuration Defaults
DEFAULT_ALLOWED_MODELS: Set[str] = {
    # Core business models
    "res.partner",
    "res.partner.category",
    "res.country",
    "res.country.state",
    "res.bank",
    "product.product",
    "product.template",
    "product.supplierinfo",
    "product.category",
    "uom.uom",
    "uom.category",
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
    "purchase.request",
    "purchase.blanket.order",
    "purchase.invoice.plan",
    "purchase.order.product.recommendation",
    "purchase.order",
    "purchase.order.line",
    "sale.order",
    "sale.order.line",
    "sale.order.tag",
    "account.move",
    "account.move.line",
    "account.bank.statement.line",
    "account.payment",
    "account.payment.register",
    "account.journal",
    "account.tax",
    "account.account",
    "account.analytic.line",
    "crm.lead",
    "helpdesk.ticket",
    "contract.contract",
    "contract.line",
    "mail.message",
    "mail.activity",
    "mail.compose.message",
    "mail.mail",
    "mail.template",
    "mail.channel",
    "mail.followers",
    "discuss.channel",
    "project.task",
    "project.project",
    "project.task.type",
    "calendar.event",
    "calendar.event.type",
    "hr.employee",
    "hr.attendance",
    "hr.department",
    "hr.job",
    "hr.leave",
    "hr.leave.allocation",
    "hr.leave.type",
    "hr.expense",
    "hr.expense.sheet",
    "resource.calendar",
    "resource.calendar.leaves",
    "resource.calendar.attendance",
    "mailing.list",
    "mailing.contact",
    "mailing.mailing",
    # Event management
    "event.event",
    "event.event.type",
    "event.registration",
    "event.ticket",
    # Survey
    "survey.survey",
    "survey.question",
    "survey.user_input",
    # Blog
    "blog.post",
    "blog.blog",
    "blog.tag",
}

# Models that are NEVER allowed, even via escape hatch
# These are technical/security models that could expose system internals
DEFAULT_DENIED_MODELS: Set[str] = {
    # Model metadata
    "ir.model",
    "ir.model.fields",
    "ir.model.data",
    "ir.model.relation",
    "ir.model.access",
    # Views and menus
    "ir.ui.view",
    "ir.ui.menu",
    # Module management
    "ir.module.module",
    "ir.module.category",
    # Configuration (could expose credentials)
    "ir.config_parameter",
    "ir.actions.act_window",
    "ir.actions.server",
    "ir.actions.act_url",
    "ir.actions.act_window.view",
    # Users and security
    "res.users",
    "res.groups",
    "res.lang",
    # Base technical
    "base.ir.actions.act_window",
    # Credential / token / authentication models — NEVER allowed
    # (NRA-466: critical security gap fill)
    "res.users.apikeys",
    "res.users.apikeys.show",
    "res.users.log",
    "res.users.deletion",
    "res.device.log",
    "auth_totp.device",
    "auth.oauth.provider",
    "auth.passkey.key",
    "certificate.key",
    # Cron / automation / logging — arbitrary execution risk
    "ir.cron",
    "ir.cron.trigger",
    "ir.cron.progress",
    "ir.actions.server.history",
    "base.automation",
    "ir.rule",
    "ir.mail_server",
    "fetchmail.server",
    "ir.logging",
    # Payment tokens — financial data
    "payment.token",
    # Privacy — GDPR-sensitive
    "privacy.log",
}

DEFAULT_DENIED_FIELDS: Set[str] = {
    "company_id",
    "create_uid",
    "create_date",
    "write_uid",
    "write_date",
    "state",
}
