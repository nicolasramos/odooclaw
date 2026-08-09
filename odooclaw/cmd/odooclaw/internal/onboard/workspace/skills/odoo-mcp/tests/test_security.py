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
# =====================================
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
    # New models from NRA-464
    validate_model_access("event.event")
    validate_model_access("event.event.type")
    validate_model_access("event.registration")
    validate_model_access("event.ticket")
    validate_model_access("survey.survey")
    validate_model_access("survey.question")
    validate_model_access("survey.user_input")
    validate_model_access("blog.post")
    validate_model_access("blog.blog")
    validate_model_access("blog.tag")


def test_blacklist_blocks_sensitive_models():
    """Modelos técnicos/de seguridad deben estar bloqueados."""
    # These should be blocked even if someone adds them to escape hatch
    # (NRA-466: 20 critical models added to fill security gap)
    blocked_models = [
        # Model metadata
        "ir.model",
        "ir.model.fields",
        "ir.model.data",
        "ir.model.relation",
        "ir.model.access",
        # Views and menus
        "ir.ui.view",
        "ir.ui.menu",
        # Module management
        "ir.module.module",
        "ir.module.category",
        # Configuration (could expose credentials)
        "ir.config_parameter",
        "ir.actions.act_window",
        "ir.actions.server",
        "res.users",
        "res.groups",
        "res.lang",
        "base.ir.actions.act_window",
        # Credential / token / authentication models
        "res.users.apikeys",
        "res.users.apikeys.show",
        "res.users.log",
        "res.users.deletion",
        "res.device.log",
        "auth_totp.device",
        "auth.oauth.provider",
        "auth.passkey.key",
        "certificate.key",
        # Cron / automation / logging — arbitrary execution risk
        "ir.cron",
        "ir.cron.trigger",
        "ir.cron.progress",
        "ir.actions.server.history",
        "base.automation",
        "ir.rule",
        "ir.mail_server",
        "fetchmail.server",
        "ir.logging",
        # Payment tokens — financial data
        "payment.token",
        # Privacy — GDPR-sensitive
        "privacy.log",
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
    """DEFAULT_DENIED_MODELS debe existir y contener modelos técnicos + críticos."""
    assert hasattr(DEFAULT_DENIED_MODELS, "__len__")
    # Original baseline
    assert "ir.model" in DEFAULT_DENIED_MODELS
    assert "res.users" in DEFAULT_DENIED_MODELS
    assert "ir.config_parameter" in DEFAULT_DENIED_MODELS
    # (NRA-466: new critical models)
    assert "payment.token" in DEFAULT_DENIED_MODELS
    assert "auth_totp.device" in DEFAULT_DENIED_MODELS
    assert "base.automation" in DEFAULT_DENIED_MODELS


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
        # NRA-464: new core CE models
        "event.event",
        "event.event.type",
        "event.registration",
        "event.ticket",
        "survey.survey",
        "survey.question",
        "survey.user_input",
        "blog.post",
        "blog.blog",
        "blog.tag",
    ]

    for model in new_models:
        assert model in DEFAULT_ALLOWED_MODELS, f"{model} should be in DEFAULT_ALLOWED_MODELS"


# ============================================
# Tests for dynamic allowlist (NRA-463)
# =====================================
def test_dynamic_allowlist_from_ir_model():
    """La allowlist dinámica debe consultar ir.model y excluir DENIED."""
    from odoo_mcp.security import policy
    policy.reset_allowed_models_cache()

    mock_client = MagicMock()
    mock_client.call_kw.return_value = [
        {"model": "res.partner"},
        {"model": "sale.order"},
        {"model": "custom.module.model"},
        {"model": "ir.model"},  # debe ser excluido por blacklist
    ]

    allowed = policy.get_allowed_models(mock_client)

    # Modelos de ir.model deben estar permitidos
    assert "res.partner" in allowed
    assert "sale.order" in allowed
    assert "custom.module.model" in allowed
    # ir.model debe estar bloqueado por blacklist
    assert "ir.model" not in allowed


def test_dynamic_allowlist_excludes_transient_models():
    """Los modelos transient=True no deben aparecer en la allowlist dinámica."""
    from odoo_mcp.security import policy
    policy.reset_allowed_models_cache()

    mock_client = MagicMock()
    # search_read ya filtra por transient=False, pero verificamos que no se agreguen
    mock_client.call_kw.return_value = [
        {"model": "res.partner"},
        {"model": "test.transient.model"},
    ]

    allowed = policy.get_allowed_models(mock_client)

    # Ambos deben estar si no están en blacklist
    assert "res.partner" in allowed
    assert "test.transient.model" in allowed


def test_dynamic_allowlist_fallback_to_static_when_empty():
    """Si ir.model devuelve vacío, debe fallback a DEFAULT_ALLOWED_MODELS."""
    from odoo_mcp.security import policy
    policy.reset_allowed_models_cache()

    mock_client = MagicMock()
    mock_client.call_kw.return_value = []

    allowed = policy.get_allowed_models(mock_client)

    # Debe fallback a la allowlist estática
    assert "res.partner" in allowed
    assert "sale.order" in allowed


def test_dynamic_allowlist_fallback_on_client_error():
    """Si la consulta a ir.model falla, debe fallback a DEFAULT_ALLOWED_MODELS."""
    from odoo_mcp.security import policy
    policy.reset_allowed_models_cache()

    mock_client = MagicMock()
    mock_client.call_kw.side_effect = Exception("Connection lost")

    allowed = policy.get_allowed_models(mock_client)

    # Debe fallback a la allowlist estática
    assert "res.partner" in allowed
    assert "sale.order" in allowed


def test_instance_denied_models_from_config_parameter():
    """odooclaw.denied_models debe excluir modelos de la allowlist dinámica."""
    from odoo_mcp.security import policy
    policy.reset_allowed_models_cache()

    mock_client = MagicMock()

    def call_kw_side_effect(model, method, args=None, kwargs=None, sender_id=None):
        if model == "ir.model":
            return [{"model": "res.partner"}, {"model": "sale.order"}, {"model": "custom.blocked.model"}]
        if model == "ir.config_parameter" and args and args[0] == "odooclaw.denied_models":
            return "res.users,custom.blocked.model"
        return None

    def try_call_kw_side_effect(model, method, args=None, kwargs=None, sender_id=None, default=None):
        return call_kw_side_effect(model, method, args, kwargs, sender_id)

    mock_client.call_kw.side_effect = call_kw_side_effect
    mock_client.try_call_kw.side_effect = try_call_kw_side_effect

    allowed = policy.get_allowed_models(mock_client)

    # custom.blocked.model debe estar excluido por odooclaw.denied_models
    assert "res.partner" in allowed
    assert "sale.order" in allowed
    assert "custom.blocked.model" not in allowed


def test_instance_denied_models_from_env():
    """ODOOCLAW_DENIED_MODELS debe excluir modelos de la allowlist dinámica."""
    from odoo_mcp.security import policy
    policy.reset_allowed_models_cache()

    with patch.dict(os.environ, {"ODOOCLAW_DENIED_MODELS": "custom.env.blocked,model.two"}):
        mock_client = MagicMock()

        def call_kw_side_effect(model, method, args=None, kwargs=None, sender_id=None):
            if model == "ir.model":
                return [
                    {"model": "res.partner"},
                    {"model": "custom.env.blocked"},
                    {"model": "model.two"},
                    {"model": "sale.order"},
                ]
            return None

        def try_call_kw_side_effect(model, method, args=None, kwargs=None, sender_id=None, default=None):
            return call_kw_side_effect(model, method, args, kwargs, sender_id)

        mock_client.call_kw.side_effect = call_kw_side_effect
        mock_client.try_call_kw.side_effect = try_call_kw_side_effect

        allowed = policy.get_allowed_models(mock_client)

        assert "res.partner" in allowed
        assert "sale.order" in allowed
        assert "custom.env.blocked" not in allowed
        assert "model.two" not in allowed


def test_dynamic_allowlist_with_escape_hatch():
    """El escape hatch extra_allowed_models debe sumar modelos a la allowlist dinámica."""
    from odoo_mcp.security import policy
    policy.reset_allowed_models_cache()

    mock_client = MagicMock()

    def call_kw_side_effect(model, method, args=None, kwargs=None, sender_id=None):
        if model == "ir.model":
            return [{"model": "res.partner"}, {"model": "sale.order"}]
        if model == "ir.config_parameter" and args and args[0] == "odooclaw.extra_allowed_models":
            return "extra.custom.model"
        return None

    def try_call_kw_side_effect(model, method, args=None, kwargs=None, sender_id=None, default=None):
        return call_kw_side_effect(model, method, args, kwargs, sender_id)

    mock_client.call_kw.side_effect = call_kw_side_effect
    mock_client.try_call_kw.side_effect = try_call_kw_side_effect

    allowed = policy.get_allowed_models(mock_client)

    assert "res.partner" in allowed
    assert "sale.order" in allowed
    assert "extra.custom.model" in allowed


def test_blacklist_wins_over_dynamic_allowlist():
    """DEFAULT_DENIED_MODELS debe bloquear incluso si viene de ir.model."""
    from odoo_mcp.security import policy
    policy.reset_allowed_models_cache()

    mock_client = MagicMock()
    mock_client.call_kw.return_value = [
        {"model": "ir.model"},
        {"model": "res.users"},
        {"model": "res.partner"},
    ]

    allowed = policy.get_allowed_models(mock_client)

    assert "ir.model" not in allowed
    assert "res.users" not in allowed
    assert "res.partner" in allowed


def test_denied_model_in_dynamic_allows_fallback_not_escape():
    """Un modelo en odooclaw.denied_models no debe poder ser escapado por extra_allowed_models."""
    from odoo_mcp.security import policy
    policy.reset_allowed_models_cache()

    mock_client = MagicMock()

    def side_effect(model, method, args=None, kwargs=None, sender_id=None):
        if model == "ir.model":
            return [{"model": "res.partner"}]
        if model == "ir.config_parameter":
            if args and args[0] == "odooclaw.denied_models":
                return "blocked.model"
            if args and args[0] == "odooclaw.extra_allowed_models":
                return "blocked.model"
        return None

    mock_client.call_kw.side_effect = side_effect
    mock_client.try_call_kw.side_effect = side_effect

    # Debe bloquear aunque esté en ambos config_parameters
    with pytest.raises(OdooSecurityError):
        validate_model_access("blocked.model", mock_client)


def test_dynamic_allowlist_no_client_uses_static():
    """Sin client, debe usar DEFAULT_ALLOWED_MODELS (comportamiento existente)."""
    from odoo_mcp.security import policy
    policy.reset_allowed_models_cache()

    allowed = policy.get_allowed_models()

    assert "res.partner" in allowed
    assert "sale.order" in allowed
    assert "ir.model" not in allowed


def test_error_message_contains_solution_hint():
    """El mensaje de error debe indicar cómo habilitar el modelo."""
    with pytest.raises(OdooSecurityError, match="odooclaw.extra_allowed_models"):
        validate_model_access("nonexistent.model")

    with pytest.raises(OdooSecurityError, match="ODOOCLAW_EXTRA_ALLOWED_MODELS"):
        validate_model_access("nonexistent.model")
