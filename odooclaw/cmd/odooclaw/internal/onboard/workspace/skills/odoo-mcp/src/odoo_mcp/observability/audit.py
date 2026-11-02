from typing import Optional

from odoo_mcp.observability.logging import get_logger

_audit_logger = get_logger("audit")


def log_audit_event(
    action: str,
    user_id: int,
    model: str,
    details: dict,
    status: str = "SUCCESS",
    session_uid: Optional[int] = None,
):
    if session_uid is not None and session_uid != user_id:
        _audit_logger.info(
            f"AUDIT | Status: {status} | Action: {action} | Caller {user_id} | Session {session_uid} | Model {model} | Details: {details}"
        )
    else:
        _audit_logger.info(
            f"AUDIT | Status: {status} | Action: {action} | User {user_id} | Model {model} | Details: {details}"
        )
