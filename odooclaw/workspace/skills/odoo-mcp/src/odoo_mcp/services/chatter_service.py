from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger
from odoo_mcp.services.capability_service import (
    build_success_response,
    build_unsupported_response,
)

_logger = get_logger("chatter_service")


def create_activity(
    client: OdooClient,
    user_id: int,
    model: str,
    res_id: int,
    summary: str,
    note: str = None,
    assign_to: int = None,
) -> int:
    values = {
        "res_model": model,
        "res_id": res_id,
        "summary": summary,
        "note": note,
    }

    # Resolving res_model_id which is required by mail.activity
    model_ids = client.call_kw(
        "ir.model",
        "search",
        args=[[("model", "=", model)]],
        kwargs={"limit": 1},
        sender_id=user_id,
    )
    if model_ids:
        values["res_model_id"] = model_ids[0]

    if assign_to:
        values["user_id"] = assign_to

    _logger.info(f"Creating activity for {model} id {res_id}")
    return client.call_kw("mail.activity", "create", args=[values], sender_id=user_id)


def list_pending_activities(
    client: OdooClient, user_id: int, model: str = None, assign_to: int = None
) -> list:
    domain = []
    if model:
        domain.append(("res_model", "=", model))
    if assign_to:
        domain.append(("user_id", "=", assign_to))

    _logger.info(f"Listing pending activities with domain: {domain}")
    return client.call_kw(
        "mail.activity",
        "search_read",
        args=[domain],
        kwargs={
            "fields": [
                "summary",
                "note",
                "date_deadline",
                "res_model",
                "res_name",
                "user_id",
                "state",
            ]
        },
        sender_id=user_id,
    )


def mark_activity_done(
    client: OdooClient, user_id: int, activity_id: int, feedback: str = None
) -> bool:
    _logger.info(f"Marking activity {activity_id} as done")
    kwargs = {}
    if feedback:
        kwargs["feedback"] = feedback
    # Using action_feedback or action_done
    client.call_kw(
        "mail.activity",
        "action_feedback",
        args=[[activity_id]],
        kwargs=kwargs,
        sender_id=user_id,
    )
    return True


def post_chatter_message(
    client: OdooClient, user_id: int, model: str, res_id: int, body: str
) -> int:
    _logger.info(f"Posting chatter message on {model} id {res_id}")
    return client.call_kw(
        model,
        "message_post",
        args=[[res_id]],
        kwargs={"body": body, "message_type": "comment"},
        sender_id=user_id,
    )


def create_activity_summary(
    client: OdooClient,
    user_id: int,
    model: str,
    res_id: int,
    summary: str,
    note: str = None,
    assign_to: int = None,
) -> dict:
    if not client.model_exists("mail.activity", sender_id=user_id):
        return build_unsupported_response(
            "activities.create_summary",
            "mail.activity model is not available.",
            ["mail.activity"],
        )

    activity_id = create_activity(
        client, user_id, model, res_id, summary, note, assign_to
    )
    activity = client.call_kw(
        "mail.activity",
        "read",
        args=[[activity_id]],
        kwargs={
            "fields": [
                "summary",
                "note",
                "res_model",
                "res_id",
                "user_id",
                "date_deadline",
            ]
        },
        sender_id=user_id,
    )
    return build_success_response(
        "activities.create_summary",
        activity_id=activity_id,
        activity=activity[0] if activity else None,
    )


def close_activity_with_reason(
    client: OdooClient, user_id: int, activity_id: int, reason: str = None
) -> dict:
    if not client.model_exists("mail.activity", sender_id=user_id):
        return build_unsupported_response(
            "activities.close_with_reason",
            "mail.activity model is not available.",
            ["mail.activity"],
        )

    activity = client.call_kw(
        "mail.activity",
        "read",
        args=[[activity_id]],
        kwargs={"fields": ["summary", "res_model", "res_id", "user_id", "state"]},
        sender_id=user_id,
    )
    if not activity:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "activities.close_with_reason",
            "message": f"Activity {activity_id} was not found.",
        }

    mark_activity_done(client, user_id, activity_id, feedback=reason)
    return build_success_response(
        "activities.close_with_reason",
        activity_id=activity_id,
        reason=reason,
        activity=activity[0],
    )
