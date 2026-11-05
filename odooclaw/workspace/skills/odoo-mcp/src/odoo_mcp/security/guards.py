from typing import Any

from odoo_mcp.core.exceptions import OdooSecurityError

from .policy import DEFAULT_DENIED_MODELS, get_allowed_models, get_denied_write_fields


def _existing_model_named_like(model_name: str, client, sender_id: int | None) -> str | None:
    """Returns the real model name when the caller mistyped it with underscores.

    Models do this constantly: `sale_order` instead of `sale.order`. Reporting it
    as a permission problem sends people to `odoooclaw.extra_allowed_models`
    to grant access to a model that does not exist.
    """
    if client is None or "." in model_name:
        return None
    candidate = model_name.replace("_", ".")
    try:
        found = client.try_call_kw(
            "ir.model",
            "search_count",
            args=[[("model", "=", candidate)]],
            sender_id=sender_id,
            default=0,
        )
    except Exception:
        return None
    return candidate if found else None


def guard_model_access(model_name: str, client=None, sender_id: int | None = None) -> None:
    """Raises OdooSecurityError if the model is not authorized.

    Authorization check order:
    1. Blacklist check (DEFAULT_DENIED_MODELS) - ALWAYS blocks
    2. Allowlist check (get_allowed_models(client, sender_id)) - must be present

    Args:
        model_name: The Odoo model name to check
        client: Optional OdooClient for ir.config_parameter lookup
        sender_id: Odoo user id used to read the escape-hatch config parameter
    """
    # Blacklist always wins - even if model is in escape hatch
    if model_name in DEFAULT_DENIED_MODELS:
        raise OdooSecurityError(
            f"Model '{model_name}' is not authorized (denied by security policy)."
        )

    if model_name not in get_allowed_models(client, sender_id):
        suggestion = _existing_model_named_like(model_name, client, sender_id)
        if suggestion:
            raise OdooSecurityError(
                f"Model '{model_name}' does not exist. Did you mean '{suggestion}'? "
                f"Odoo model names use dots, not underscores."
            )
        raise OdooSecurityError(
            f"Model '{model_name}' is not authorized. "
            f"Add it to 'odooclaw.extra_allowed_models' (ir.config_parameter) "
            f"or ODOOCLAW_EXTRA_ALLOWED_MODELS to enable access."
        )


def guard_write_fields(values: dict[str, Any]) -> None:
    """Raises OdooSecurityError if attempting to write to a restricted field."""
    denied = get_denied_write_fields()
    for field in values.keys():
        if field in denied:
            raise OdooSecurityError(
                f"Field '{field}' is restricted from direct write operations via MCP."
            )


def guard_unlink(model_name: str) -> None:
    """Denies completely all unlink operations."""
    raise OdooSecurityError(
        f"Delete (unlink) operations are strictly forbidden via MCP. Model: {model_name}"
    )


def guard_action_name(method: str) -> None:
    """Ensures that invoked methods are safe workflow actions."""
    if not (method.startswith("action_") or method.startswith("button_")):
        raise OdooSecurityError("Only workflow actions (action_*, button_*) are permitted.")
