import os
from typing import Set
from odoo_mcp.config import DEFAULT_ALLOWED_MODELS, DEFAULT_DENIED_MODELS, DEFAULT_DENIED_FIELDS

# Cache for dynamic allowed models (populated on first call)
_allowed_models_cache: Set[str] | None = None


def get_allowed_models() -> Set[str]:
    """Returns the set of models the MCP is authorized to interact with in write mode.
    
    Includes DEFAULT_ALLOWED_MODELS plus any models from the escape hatch
    (ir.config_parameter 'odooclaw.extra_allowed_models' or env var
    ODOOCLAW_EXTRA_ALLOWED_MODELS). The blacklist (DEFAULT_DENIED_MODELS)
    always wins and is applied after merging.
    """
    global _allowed_models_cache
    
    if _allowed_models_cache is not None:
        return _allowed_models_cache
    
    allowed = set(DEFAULT_ALLOWED_MODELS)
    
    # Check escape hatch via environment variable
    env_models = os.environ.get("ODOOCLAW_EXTRA_ALLOWED_MODELS", "")
    if env_models:
        for model in env_models.split(","):
            model = model.strip()
            if model and model not in DEFAULT_DENIED_MODELS:
                allowed.add(model)
    
    # Note: ir.config_parameter lookup would require an active Odoo connection,
    # which we don't have at policy initialization time. The env var provides
    # a practical escape hatch for deployment-time configuration.
    
    # Apply blacklist: remove any denied models
    allowed = allowed - DEFAULT_DENIED_MODELS
    
    _allowed_models_cache = allowed
    return _allowed_models_cache


def get_denied_write_fields() -> Set[str]:
    """Returns the set of fields that cannot be written directly by tools."""
    return DEFAULT_DENIED_FIELDS


def reset_allowed_models_cache() -> None:
    """Reset the cache (useful for testing with different env vars)."""
    global _allowed_models_cache
    _allowed_models_cache = None
