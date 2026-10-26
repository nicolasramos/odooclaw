from odoo_mcp.core.client import OdooClient
from odoo_mcp.core.field_schema import (
    drop_empty_fields,
    read_summary_record,
    select_summary_fields,
)
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("generic_service")

# Fallback when the schema of the model cannot be fetched at all (unknown model,
# transport error): the old hardcoded default, kept so the summary still answers
# instead of failing.
_FALLBACK_SUMMARY_FIELDS = ["display_name"]


def get_record_summary(client: OdooClient, user_id: int, model: str, res_id: int) -> dict:
    """Summarise one record using the fields *this instance* exposes.

    The field list comes from ``fields_get`` (cached 60s) instead of a table of
    static lists that was written once and never re-read: custom fields, fields
    from optional modules and fields that only exist in some Odoo versions are
    covered without maintaining anything (github.com/nicolasramos/odooclaw#81).
    Empty values are dropped so the caller gets what is actually there.
    """
    _logger.info(f"Getting generic summary for {model} id {res_id}")
    fields = select_summary_fields(client, model, user_id)
    try:
        record = read_summary_record(
            client, model, res_id, fields or _FALLBACK_SUMMARY_FIELDS, user_id
        )
    except Exception as exc:  # noqa: BLE001 - only reachable with no schema
        if fields:
            raise
        # No schema for this model: it does not exist on this instance, or
        # fields_get was denied. Say so, and point at the tool that answers
        # the question, instead of letting Odoo surface an opaque 500.
        return {
            "error": (
                f"Cannot summarise '{model}' on this instance: {exc}. "
                f"Call odoo_get_model_schema('{model}') to see what exists here."
            )
        }
    if record is None:
        return {"error": f"Record {res_id} not found in {model}"}

    summary = drop_empty_fields(record)
    if "id" not in summary:
        summary["id"] = res_id
    return summary


def get_chatter_summary(client: OdooClient, user_id: int, model: str, res_id: int) -> dict:
    """Gets the latest messages and activities for a record's chatter."""
    _logger.info(f"Getting chatter summary for {model} id {res_id}")

    # Get messages
    messages = client.call_kw(
        "mail.message",
        "search_read",
        args=[[("model", "=", model), ("res_id", "=", res_id)]],
        kwargs={
            "fields": ["body", "author_id", "date", "message_type"],
            "limit": 5,
            "order": "date desc",
        },
        sender_id=user_id,
    )

    # Get pending activities
    activities = client.call_kw(
        "mail.activity",
        "search_read",
        args=[[("res_model", "=", model), ("res_id", "=", res_id)]],
        kwargs={"fields": ["summary", "user_id", "date_deadline", "state"]},
        sender_id=user_id,
    )

    return {
        "latest_messages": [
            {
                "author": m.get("author_id")[1] if m.get("author_id") else "System",
                "date": m.get("date"),
                "type": m.get("message_type"),
                "body_preview": m.get("body", "")[:200],
            }
            for m in messages
        ],
        "pending_activities": [
            {
                "summary": a.get("summary"),
                "user": a.get("user_id")[1] if a.get("user_id") else None,
                "deadline": a.get("date_deadline"),
            }
            for a in activities
        ],
    }
