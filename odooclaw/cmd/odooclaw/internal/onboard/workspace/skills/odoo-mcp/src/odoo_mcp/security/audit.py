from contextvars import ContextVar
from typing import Optional

from odoo_mcp.observability.audit import log_audit_event

_current_session_uid: ContextVar[Optional[int]] = ContextVar("current_session_uid", default=None)


def set_session_uid(uid: Optional[int]) -> None:
    _current_session_uid.set(uid)


def audit_action(action: str, user_id: int, model: str, ids: list, values: dict = None):
    details = {"ids": ids}
    if values:
        from .redaction import redact_sensitive_values

        details["values"] = redact_sensitive_values(values)

    session_uid = _current_session_uid.get()
    log_audit_event(action, user_id, model, details, session_uid=session_uid)
