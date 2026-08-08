import pytest
import os
from unittest.mock import patch, MagicMock

from odoo_mcp.core.security import (
    validate_model_access,
    validate_write_fields,
    validate_unlink,
)
from odoo_mcp.core.exceptions import OdooSecurityError
from odoo_mcp.config import DEFAULT_ALLOWED_MODELS, DEFAULT_DENIED_MODELS, DEFAULT_DENIED_FIELDS


def test_allowlist_success():
    # Should not raise
    validate_model_access("res.partner")
    validate_model_access("sale.order")


def test_allowlist_failure():
    with pytest.raises(OdooSecurityError):
        validate_model_access("ir.config_parameter")

    with pytest.raises(OdooSecurityError):
        validate_model_access("ir.model.data")


def test_denylist_success():
    # Safe fields, should not raise
    validate_write_fields({"name": "New partner", "email": "test@test.com"})


def test_denylist_failure():
    with pytest.raises(OdooSecurityError):
        validate_write_fields({"name": "New partner", "state": "done"})

    with pytest.raises(OdooSecurityError):
        validate_write_fields({"company_id": 1})


def test_unlink_blocked():
    with pytest.raises(OdooSecurityError):
        validate_unlink("res.partner")


# ============================================
# Tests for expanded allowlist (GH #47)
# ============================================

def test_new_business_models_allowed():
    """Models core CE que faltaban deben ser permitidos."""
    # Should not raise
    validate_model_access("res.partner.category")
    validate_model_access("calendar.event")
    validate_model_access("project.project")
    validate_model_access("hr.leave")
    validate_model_access("hr.leave.allocation")
    validate_model_access("resource.calendar.leaves")
    validate_model_access("mailing.list")
    validate_model_access("mailing.contact")
    validate_model_access("res.country")
    validate_model_access("res.country.state")
    validate_model_access("res.bank")
    validate_model_access("calendar.event.type")
    validate_model_access("project.task.type")
    validate_model_access("hr.department")
    validate_model_access("hr.job")
    validate_model_access("hr.leave.type")
    validate_model_access("resource.calendar")
    validate_model_access("resource.calendar.attendance")
    validate_model_access("mailing.mailing")
    validate_model_access("mail.mail")
    validate_model_access("mail.template")
    validate_model_access("mail.channel")
    validate_model_access("mail.followers")
    validate_model_access("sale.order.tag")


def test_blacklist_blocks_sensitive_models():
    """Modelos técnicos/de seguridad deben estar bloqueados."""
    # These should be blocked even if someone adds them to escape hatch
    blocked_models = [
        "ir.model",
        "ir.model.fields",
        "ir.model.data",
        "ir.model.relation",
        "ir.model.access",
        "ir.ui.view",
        "ir.ui.menu",
        "ir.module.module",
        "ir.module.category",
        "ir.config_parameter",
        "ir.actions.act_window",
        "ir.actions.server",
        "res.users",
        "res.groups",
        "res.lang",
        "base.ir.actions.act_window",
    ]

    for model in blocked_models:
        with pytest.raises(OdooSecurityError, match="not authorized"):
            validate_model_access(model)


def test_blacklist_wins_over_escape_hatch():
    """La blacklist gana sobre el escape hatch."""
    # Even if we add a blocked model via escape hatch, it should still be blocked
    with patch.dict(os.environ, {"ODOOCLAW_EXTRA_ALLOWED_MODELS": "ir.model,res.users"}):
        # Need to reload the policy to pick up env var
        from odoo_mcp.security import policy
        # Force re-evaluation by clearing cached allowed models
        policy.reset_allowed_models_cache()

        with pytest.raises(OdooSecurityError):
            validate_model_access("ir.model")

        with pytest.raises(OdooSecurityError):
            validate_model_access("res.users")


def test_escape_hatch_env_allows_extra_models():
    """Escape hatch via env var debe permitir modelos adicionales."""
    with patch.dict(os.environ, {"ODOOCLAW_EXTRA_ALLOWED_MODELS": "custom.model,another.model"}):
        from odoo_mcp.security import policy
        policy.reset_allowed_models_cache()

        # Should not raise
        validate_model_access("custom.model")
        validate_model_access("another.model")


def test_escape_hatch_config_parameter_allows_extra_models():
    """Escape hatch via ir.config_parameter debe permitir modelos adicionales."""
    from odoo_mcp.security import policy
    
    # Create mock client
    mock_client = MagicMock()
    mock_client.try_call_kw.return_value = "custom.model,another.model"
    
    # Clear cache and get allowed models with client
    policy.reset_allowed_models_cache()
    allowed = policy.get_allowed_models(mock_client)
    
    # Should include models from config parameter
    assert "custom.model" in allowed
    assert "another.model" in allowed


def test_escape_hatch_config_parameter_fallback_to_env():
    """Si config_parameter no devuelve valor, debe usar env var."""
    from odoo_mcp.security import policy
    
    # Create mock client that returns None
    mock_client = MagicMock()
    mock_client.try_call_kw.return_value = None
    
    with patch.dict(os.environ, {"ODOOCLAW_EXTRA_ALLOWED_MODELS": "env.model"}):
        policy.reset_allowed_models_cache()
        allowed = policy.get_allowed_models(mock_client)
        
        # Should include model from env var
        assert "env.model" in allowed


def test_blacklist_wins_over_config_parameter():
    """La blacklist gana incluso si el modelo viene de config_parameter."""
    from odoo_mcp.security import policy
    
    # Create mock client that returns a denied model
    mock_client = MagicMock()
    mock_client.try_call_kw.return_value = "ir.model,res.users"
    
    policy.reset_allowed_models_cache()
    
    # Should still be blocked
    with pytest.raises(OdooSecurityError):
        validate_model_access("ir.model", mock_client)
    
    with pytest.raises(OdooSecurityError):
        validate_model_access("res.users", mock_client)


def test_denied_models_constant_defined():
    """DEFAULT_DENIED_MODELS debe existir y contener modelos técnicos."""
    assert hasattr(DEFAULT_DENIED_MODELS, "__len__")
    assert "ir.model" in DEFAULT_DENIED_MODELS
    assert "res.users" in DEFAULT_DENIED_MODELS
    assert "ir.config_parameter" in DEFAULT_DENIED_MODELS


def test_allowed_models_expanded():
    """DEFAULT_ALLOWED_MODELS debe incluir los nuevos modelos core CE."""
    new_models = [
        "res.partner.category",
        "calendar.event",
        "project.project",
        "hr.leave",
        "hr.leave.allocation",
        "resource.calendar.leaves",
        "mailing.list",
        "mailing.contact",
    ]

    for model in new_models:
        assert model in DEFAULT_ALLOWED_MODELS, f"{model} should be in DEFAULT_ALLOWED_MODELS"
