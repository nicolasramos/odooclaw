"""A mistyped model name must not look like a permission problem.

The agent asked for `sale_order`, which does not exist, and the MCP answered
"not authorized, add it to odooclaw.extra_allowed_models". Following that advice
grants access to a model that will never exist.
"""

import pytest

from odoo_mcp.core.exceptions import OdooSecurityError
from odoo_mcp.security import guards


class FakeClient:
    """Minimal stand-in: knows which models exist, denies nothing."""

    def __init__(self, existing):
        self.existing = set(existing)
        self.calls = []

    def try_call_kw(self, model, method, args=None, sender_id=None, default=None):
        self.calls.append((model, method, args))
        if model == "ir.model" and method == "search_count":
            domain = args[0]
            wanted = domain[0][2]
            return 1 if wanted in self.existing else 0
        if model == "ir.config_parameter":
            return default
        return default


@pytest.fixture(autouse=True)
def _allow_nothing(monkeypatch):
    """Empty allowlist, so every model reaches the error path."""
    monkeypatch.setattr(guards, "get_allowed_models", lambda client=None, sender_id=None: set())


def test_mistyped_model_suggests_the_real_name():
    client = FakeClient({"sale.order", "account.move"})

    with pytest.raises(OdooSecurityError) as exc:
        guards.guard_model_access("sale_order", client=client)

    message = str(exc.value)
    assert "does not exist" in message
    assert "sale.order" in message
    assert "extra_allowed_models" not in message


def test_unknown_model_keeps_the_permission_message():
    client = FakeClient({"sale.order"})

    with pytest.raises(OdooSecurityError) as exc:
        guards.guard_model_access("invented_model", client=client)

    message = str(exc.value)
    assert "not authorized" in message
    assert "extra_allowed_models" in message


def test_blacklisted_model_still_reports_the_policy_denial():
    denied = next(iter(guards.DEFAULT_DENIED_MODELS))

    with pytest.raises(OdooSecurityError) as exc:
        guards.guard_model_access(denied, client=FakeClient(set()))

    assert "denied by security policy" in str(exc.value)


def test_dotted_unknown_model_does_not_query_ir_model():
    """A name with a dot is not an underscore typo, so no lookup is needed."""
    client = FakeClient(set())

    with pytest.raises(OdooSecurityError):
        guards.guard_model_access("nope.nothing", client=client)

    assert client.calls == []
