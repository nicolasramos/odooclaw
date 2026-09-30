from typing import Optional

import base64
import binascii

from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger
from odoo_mcp.security.guards import guard_model_access
from odoo_mcp.security.audit import audit_action

_logger = get_logger("delivery_service")

# Default ceiling for a single uploaded file. Kept in step with the
# `file_size` users expect in the chatter; a report is a few tens of KB.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

# Model that backs every chatter thread. A file meant for the user is an
# ir.attachment whose (res_model, res_id) is the thread it is posted to.
ATTACHMENT_MODEL = "ir.attachment"


def attach_file_to_chat(
    client: OdooClient,
    user_id: int,
    model: str,
    res_id: int,
    *,
    filename: str,
    content_base64: str,
    mimetype: Optional[str] = None,
    body: Optional[str] = None,
    max_bytes: int = MAX_UPLOAD_BYTES,
) -> dict:
    """Upload a file and post it to a chatter thread as a real attachment.

    This is the delivery path for a generated file. The alternative — having
    the model print a workspace path — is not delivery at all: the path exists
    only inside the gateway's filesystem and the user has no way to open it.

    Ordering matters. The attachment must exist BEFORE ``message_post`` runs,
    because Odoo links attachments to a message by id; and it must carry
    ``res_model``/``res_id`` so that Odoo's own access rules apply to it.

    Args:
        model: the thread's model (e.g. ``discuss.channel``)
        res_id: the thread's id
        filename: name the user will see
        content_base64: the file's bytes, base64-encoded
        mimetype: optional MIME type hint
        body: optional message text to post with the file
        max_bytes: refuse anything larger, to protect the Odoo filestore

    Returns a small dict describing what was created.
    """
    guard_model_access(ATTACHMENT_MODEL, client, sender_id=user_id)
    if not filename:
        raise ValueError("filename is required to attach a file")
    if not content_base64:
        raise ValueError("content_base64 is required to attach a file")

    # Measure the DECODED size: base64 inflates by ~4/3, so checking the
    # encoded length would reject legitimate files near the limit.
    try:
        raw = base64.b64decode(content_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError(f"content_base64 is not valid base64: {exc}") from exc

    if len(raw) > max_bytes:
        raise ValueError(
            f"file is {len(raw)} bytes, over the {max_bytes}-byte limit"
        )

    audit_action(
        "ATTACH_FILE",
        user_id,
        ATTACHMENT_MODEL,
        [],
        {"filename": filename, "bytes": len(raw), "model": model, "res_id": res_id},
    )

    values = {
        "name": filename,
        "datas": content_base64,
        "res_model": model,
        "res_id": res_id,
    }
    if mimetype:
        values["mimetype"] = mimetype

    _logger.info(
        f"Uploading {filename} ({len(raw)} bytes) to {model} id {res_id}"
    )
    attachment_id = client.call_kw(
        ATTACHMENT_MODEL, "create", args=[values], sender_id=user_id
    )

    # `message_post` requires attachment_ids as a literal list of ints. Odoo
    # 17 raises ValueError on the x2many command form before the message
    # exists, which silently loses the file — the same trap that odoo_create
    # normalises for mail.message.
    message_id = client.call_kw(
        model,
        "message_post",
        args=[[res_id]],
        kwargs={
            "body": body or "",
            "message_type": "comment",
            "attachment_ids": [attachment_id],
        },
        sender_id=user_id,
    )

    return {
        "attachment_id": attachment_id,
        "message_id": message_id,
        "filename": filename,
        "bytes": len(raw),
    }
