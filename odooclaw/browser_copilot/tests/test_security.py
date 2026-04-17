from __future__ import annotations

from browser_copilot.security import is_domain_allowed, require_token


def test_domain_whitelist() -> None:
    allowed = ["*.odoo.com", "localhost"]
    assert is_domain_allowed("demo.odoo.com", allowed)
    assert is_domain_allowed("localhost", allowed)
    assert not is_domain_allowed("example.com", allowed)


def test_token_validation() -> None:
    assert require_token("abc", "abc")
    assert not require_token("abc", "")
    assert not require_token("abc", "def")
