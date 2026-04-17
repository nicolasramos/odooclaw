import pytest
from odoo_mcp.core.security import validate_model_access, validate_write_fields, validate_unlink
from odoo_mcp.core.exceptions import OdooSecurityError

def test_allowlist_success():
    # Should not raise
    validate_model_access("res.partner")
    validate_model_access("sale.order")

def test_allowlist_failure():
    with pytest.raises(OdooSecurityError):
        validate_model_access("ir.config_parameter")
    
    with pytest.raises(OdooSecurityError):
        validate_model_access("account.payment")

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
