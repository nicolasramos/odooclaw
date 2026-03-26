from typing import Any, Dict, Iterable, Optional

from odoo_mcp.core.client import OdooClient


def build_unsupported_response(
    capability: str, message: str, missing: Optional[Iterable[str]] = None
) -> dict:
    return {
        "ok": False,
        "status": "unsupported",
        "capability": capability,
        "message": message,
        "missing": list(missing or []),
    }


def build_success_response(capability: str, **payload: Any) -> dict:
    response = {
        "ok": True,
        "status": "ok",
        "capability": capability,
    }
    response.update(payload)
    return response


def get_capabilities(client: OdooClient, user_id: int) -> dict:
    def probe(model: str) -> Dict[str, Any]:
        fields = client.try_get_model_fields(model, sender_id=user_id)
        return {
            "available": fields is not None,
            "fields": sorted(fields.keys()) if fields else [],
        }

    helpdesk_ticket = probe("helpdesk.ticket")
    mail_activity = probe("mail.activity")
    contract_line = probe("contract.line")
    contract_contract = probe("contract.contract")
    mail_compose = probe("mail.compose.message")

    return {
        "helpdesk": {
            "available": helpdesk_ticket["available"],
            "model": "helpdesk.ticket",
            "required_for_create": ["name"],
            "fields": helpdesk_ticket["fields"],
        },
        "activities": {
            "available": mail_activity["available"],
            "model": "mail.activity",
            "required_for_create": ["res_model", "res_id", "summary"],
            "fields": mail_activity["fields"],
        },
        "contracts": {
            "available": contract_line["available"] and contract_contract["available"],
            "models": ["contract.contract", "contract.line"],
            "line_fields": contract_line["fields"],
            "contract_fields": contract_contract["fields"],
        },
        "ticket_email_draft": {
            "available": helpdesk_ticket["available"] and mail_compose["available"],
            "models": ["helpdesk.ticket", "mail.compose.message"],
            "fields": mail_compose["fields"],
        },
    }
