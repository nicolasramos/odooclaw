from odoo_mcp.core.client import OdooClient
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access
from odoo_mcp.services.chatter_service import (
    create_activity_summary,
    close_activity_with_reason,
)
from odoo_mcp.services.contract_service import (
    create_contract_line,
    replace_contract_line,
    close_contract_line,
)
from odoo_mcp.services.helpdesk_service import (
    create_helpdesk_ticket,
    create_helpdesk_ticket_from_partner,
    draft_ticket_email,
)
from odoo_mcp.tools.introspection import odoo_get_capabilities as get_capabilities_tool


def odoo_get_capabilities(client: OdooClient, user_id: int) -> dict:
    return get_capabilities_tool(client, user_id)


def odoo_create_helpdesk_ticket(
    client: OdooClient,
    user_id: int,
    name: str,
    description: str = None,
    partner_id: int = None,
    email: str = None,
    team_id: int = None,
    priority: str = None,
) -> dict:
    audit_action(
        "CREATE_HELPDESK_TICKET", user_id, "helpdesk.ticket", [], {"name": name}
    )
    return create_helpdesk_ticket(
        client, user_id, name, description, partner_id, email, team_id, priority
    )


def odoo_create_helpdesk_ticket_from_partner(
    client: OdooClient,
    user_id: int,
    partner_id: int,
    name: str,
    description: str = None,
    team_id: int = None,
    priority: str = None,
) -> dict:
    guard_model_access("res.partner")
    audit_action(
        "CREATE_HELPDESK_TICKET_FROM_PARTNER",
        user_id,
        "res.partner",
        [partner_id],
        {"name": name},
    )
    return create_helpdesk_ticket_from_partner(
        client, user_id, partner_id, name, description, team_id, priority
    )


def odoo_create_activity_summary(
    client: OdooClient,
    user_id: int,
    model: str,
    res_id: int,
    summary: str,
    note: str = None,
    assign_to: int = None,
) -> dict:
    guard_model_access(model)
    audit_action(
        "CREATE_ACTIVITY_SUMMARY", user_id, model, [res_id], {"summary": summary}
    )
    return create_activity_summary(
        client, user_id, model, res_id, summary, note, assign_to
    )


def odoo_close_activity_with_reason(
    client: OdooClient, user_id: int, activity_id: int, reason: str = None
) -> dict:
    audit_action(
        "CLOSE_ACTIVITY_WITH_REASON",
        user_id,
        "mail.activity",
        [activity_id],
        {"reason": reason},
    )
    return close_activity_with_reason(client, user_id, activity_id, reason)


def odoo_draft_ticket_email(
    client: OdooClient,
    user_id: int,
    ticket_id: int,
    subject: str,
    body: str,
    email_to: str = None,
) -> dict:
    audit_action(
        "DRAFT_TICKET_EMAIL",
        user_id,
        "helpdesk.ticket",
        [ticket_id],
        {"subject": subject},
    )
    return draft_ticket_email(client, user_id, ticket_id, subject, body, email_to)


def odoo_create_contract_line(
    client: OdooClient,
    user_id: int,
    contract_id: int,
    product_id: int = None,
    name: str = None,
    quantity: float = None,
    price_unit: float = None,
    date_start: str = None,
    date_end: str = None,
) -> dict:
    audit_action(
        "CREATE_CONTRACT_LINE",
        user_id,
        "contract.contract",
        [contract_id],
        {"product_id": product_id},
    )
    return create_contract_line(
        client,
        user_id,
        contract_id,
        product_id,
        name,
        quantity,
        price_unit,
        date_start,
        date_end,
    )


def odoo_replace_contract_line(
    client: OdooClient,
    user_id: int,
    line_id: int,
    product_id: int = None,
    name: str = None,
    quantity: float = None,
    price_unit: float = None,
    date_start: str = None,
    date_end: str = None,
    close_reason: str = None,
) -> dict:
    audit_action(
        "REPLACE_CONTRACT_LINE",
        user_id,
        "contract.line",
        [line_id],
        {"product_id": product_id},
    )
    return replace_contract_line(
        client,
        user_id,
        line_id,
        product_id,
        name,
        quantity,
        price_unit,
        date_start,
        date_end,
        close_reason,
    )


def odoo_close_contract_line(
    client: OdooClient,
    user_id: int,
    line_id: int,
    reason: str = None,
    close_date: str = None,
) -> dict:
    audit_action(
        "CLOSE_CONTRACT_LINE", user_id, "contract.line", [line_id], {"reason": reason}
    )
    return close_contract_line(client, user_id, line_id, reason, close_date)
