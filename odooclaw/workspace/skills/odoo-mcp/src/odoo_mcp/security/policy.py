import os
import time
from typing import Optional, Set, Tuple
from odoo_mcp.config import DEFAULT_ALLOWED_MODELS, DEFAULT_DENIED_MODELS, DEFAULT_DENIED_FIELDS

# Cache for dynamic allowed models without a client (env-var only, static per process).
_allowed_models_cache: Optional[Set[str]] = None
# Cache for client-based lookups (ir.config_parameter): short TTL so runtime changes apply.
_client_cache: Optional[Tuple[float, Set[str]]] = None
_CLIENT_CACHE_TTL_SECONDS = 60.0


def get_allowed_models(client=None, sender_id: Optional[int] = None) -> Set[str]:
    """Returns the set of models the MCP is authorized to interact with in write mode.

    Includes DEFAULT_ALLOWED_MODELS plus any models from the escape hatch.
    Escape hatch sources (in priority order):
    1. ir.config_parameter 'odooclaw.extra_allowed_models' (when client provided)
    2. Environment variable ODOOCLAW_EXTRA_ALLOWED_MODELS

    The blacklist (DEFAULT_DENIED_MODELS) always wins and is applied after merging.

    Args:
        client: Optional OdooClient for ir.config_parameter lookup
        sender_id: Odoo user id used to read the config parameter under native delegation
    """
    if client is not None:
        return _get_allowed_models_with_client(client, sender_id)

    global _allowed_models_cache
    if _allowed_models_cache is None:
        _allowed_models_cache = _compute_allowed_models(None, None)
    return _allowed_models_cache


def _get_allowed_models_with_client(client, sender_id: Optional[int] = None) -> Set[str]:
    """Client-based lookups are cached briefly so ir.config_parameter changes apply at runtime."""
    global _client_cache
    now = time.monotonic()
    if _client_cache is not None:
        timestamp, models = _client_cache
        if now - timestamp < _CLIENT_CACHE_TTL_SECONDS:
            return models
    models = _compute_allowed_models(client, sender_id)
    _client_cache = (now, models)
    return models


def _compute_allowed_models(client=None, sender_id: Optional[int] = None) -> Set[str]:
    """Merge DEFAULT_ALLOWED_MODELS with the escape hatch and apply the blacklist."""
    allowed = set(DEFAULT_ALLOWED_MODELS)

    extra_models = _get_escape_hatch_models(client, sender_id)
    if extra_models:
        for model in extra_models.split(","):
            model = model.strip()
            if model and model not in DEFAULT_DENIED_MODELS:
                allowed.add(model)

    # Apply blacklist: remove any denied models
    allowed = allowed - DEFAULT_DENIED_MODELS
    return allowed


def _get_escape_hatch_models(client=None, sender_id: Optional[int] = None) -> str:
    """Get extra allowed models from ir.config_parameter or env var.

    Args:
        client: Optional OdooClient instance for ir.config_parameter lookup
        sender_id: Odoo user id used to read the config parameter under native delegation

    Returns:
        Comma-separated list of extra model names, or empty string
    """
    # Try ir.config_parameter first (when client is available)
    if client is not None:
        try:
            value = client.try_call_kw(
                "ir.config_parameter",
                "get_param",
                args=["odooclaw.extra_allowed_models"],
                sender_id=sender_id,
                default=None
            )
            if value:
                return value
        except Exception:
            # Fall through to env var if config parameter lookup fails
            pass

    # Fallback to environment variable
    return os.environ.get("ODOOCLAW_EXTRA_ALLOWED_MODELS", "")


def get_denied_write_fields() -> Set[str]:
    """Returns the set of fields that cannot be written directly by tools."""
    return DEFAULT_DENIED_FIELDS


def reset_allowed_models_cache() -> None:
    """Reset the cache (useful for testing with different env vars or clients)."""
    global _allowed_models_cache, _client_cache
    _allowed_models_cache = None
    _client_cache = None
