import os
from typing import Set, Optional
from odoo_mcp.config import DEFAULT_ALLOWED_MODELS, DEFAULT_DENIED_MODELS, DEFAULT_DENIED_FIELDS

# Cache for dynamic allowed models (populated on first call)
_allowed_models_cache: Set[str] | None = None


def get_allowed_models(client=None) -> Set[str]:
    """Returns the set of models the MCP is authorized to interact with in write mode.
    
    Includes DEFAULT_ALLOWED_MODELS plus any models from the escape hatch.
    Escape hatch sources (in priority order):
    1. ir.config_parameter 'odooclaw.extra_allowed_models' (when client provided)
    2. Environment variable ODOOCLAW_EXTRA_ALLOWED_MODELS
    
    The blacklist (DEFAULT_DENIED_MODELS) always wins and is applied after merging.
    """
    global _allowed_models_cache
    
    if _allowed_models_cache is not None:
        return _allowed_models_cache
    
    allowed = set(DEFAULT_ALLOWED_MODELS)
    
    # Check escape hatch via ir.config_parameter (primary) or env var (fallback)
    extra_models = _get_escape_hatch_models(client)
    if extra_models:
        for model in extra_models.split(","):
            model = model.strip()
            if model and model not in DEFAULT_DENIED_MODELS:
                allowed.add(model)
    
    # Apply blacklist: remove any denied models
    allowed = allowed - DEFAULT_DENIED_MODELS
    
    _allowed_models_cache = allowed
    return _allowed_models_cache


def _get_escape_hatch_models(client=None) -> str:
    """Get extra allowed models from ir.config_parameter or env var.
    
    Args:
        client: Optional OdooClient instance for ir.config_parameter lookup
        
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
    global _allowed_models_cache
    _allowed_models_cache = None
