from typing import Optional

from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger
from odoo_mcp.services.capability_service import (
    build_success_response,
    build_unsupported_response,
)

_logger = get_logger("helpdesk_service")


def _helpdesk_fields(client: OdooClient, user_id: int) -> Optional[dict]:
    return client.try_get_model_fields("helpdesk.ticket", sender_id=user_id)


def _ticket_values(
    fields: dict,
    name: str,
    description: Optional[str] = None,
    partner_id: Optional[int] = None,
    email: Optional[str] = None,
    team_id: Optional[int] = None,
    priority: Optional[str] = None,
) -> dict:
    values = {"name": name}
    if description and "description" in fields:
        values["description"] = description
    if description and "ticket_description" in fields and "description" not in values:
        values["ticket_description"] = description
    if partner_id and "partner_id" in fields:
        values["partner_id"] = partner_id
    if email:
        if "partner_email" in fields:
            values["partner_email"] = email
        elif "email" in fields:
            values["email"] = email
    if team_id and "team_id" in fields:
        values["team_id"] = team_id
    if priority and "priority" in fields:
        values["priority"] = priority
    return values


def create_helpdesk_ticket(
    client: OdooClient,
    user_id: int,
    name: str,
    description: Optional[str] = None,
    partner_id: Optional[int] = None,
    email: Optional[str] = None,
    team_id: Optional[int] = None,
    priority: Optional[str] = None,
) -> dict:
    fields = _helpdesk_fields(client, user_id)
    if not fields:
        return build_unsupported_response(
            "helpdesk.create_ticket",
            "helpdesk.ticket model is not available in this Odoo instance.",
            ["helpdesk.ticket"],
        )

    values = _ticket_values(
        fields,
        name=name,
        description=description,
        partner_id=partner_id,
        email=email,
        team_id=team_id,
        priority=priority,
    )
    _logger.info(f"Creating helpdesk ticket: {name}")
    ticket_id = client.call_kw(
        "helpdesk.ticket", "create", args=[values], sender_id=user_id
    )
    return build_success_response(
        "helpdesk.create_ticket",
        ticket_id=ticket_id,
        model="helpdesk.ticket",
        values=values,
    )


def create_helpdesk_ticket_from_partner(
    client: OdooClient,
    user_id: int,
    partner_id: int,
    name: str,
    description: Optional[str] = None,
    team_id: Optional[int] = None,
    priority: Optional[str] = None,
) -> dict:
    partner = client.call_kw(
        "res.partner",
        "read",
        args=[[partner_id]],
        kwargs={"fields": ["name", "email"]},
        sender_id=user_id,
    )
    if not partner:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "helpdesk.create_ticket_from_partner",
            "message": f"Partner {partner_id} was not found.",
        }

    partner_data = partner[0]
    result = create_helpdesk_ticket(
        client,
        user_id,
        name=name,
        description=description,
        partner_id=partner_id,
        email=partner_data.get("email"),
        team_id=team_id,
        priority=priority,
    )
    result["capability"] = "helpdesk.create_ticket_from_partner"
    result["partner"] = {
        "id": partner_id,
        "name": partner_data.get("name"),
        "email": partner_data.get("email"),
    }
    return result


def draft_ticket_email(
    client: OdooClient,
    user_id: int,
    ticket_id: int,
    subject: str,
    body: str,
    email_to: Optional[str] = None,
) -> dict:
    helpdesk_fields = _helpdesk_fields(client, user_id)
    compose_fields = client.try_get_model_fields(
        "mail.compose.message", sender_id=user_id
    )
    if not helpdesk_fields or not compose_fields:
        return build_unsupported_response(
            "helpdesk.draft_ticket_email",
            "Ticket email drafting requires helpdesk.ticket and mail.compose.message availability.",
            [
                name
                for name, present in (
                    ("helpdesk.ticket", bool(helpdesk_fields)),
                    ("mail.compose.message", bool(compose_fields)),
                )
                if not present
            ],
        )

    ticket = client.call_kw(
        "helpdesk.ticket",
        "read",
        args=[[ticket_id]],
        kwargs={"fields": ["name", "partner_id"]},
        sender_id=user_id,
    )
    if not ticket:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "helpdesk.draft_ticket_email",
            "message": f"Ticket {ticket_id} was not found.",
        }

    partner_email = email_to
    partner_id = None
    partner_ref = ticket[0].get("partner_id")
    if partner_ref:
        partner_id = partner_ref[0]
        if not partner_email:
            partner = client.call_kw(
                "res.partner",
                "read",
                args=[[partner_id]],
                kwargs={"fields": ["email"]},
                sender_id=user_id,
            )
            if partner:
                partner_email = partner[0].get("email")

    draft_payload = {
        "model": "helpdesk.ticket",
        "res_id": ticket_id,
        "subject": subject,
        "body": body,
        "email_to": partner_email,
        "partner_id": partner_id,
    }

    return build_success_response(
        "helpdesk.draft_ticket_email", ticket_id=ticket_id, draft=draft_payload
    )
