"""The delegated Odoo RPC must carry the shared secret and a flat payload.

Two things the module expects and this client used to get wrong, both found on
the M4 chat test of 2026-11-05:

- ``/odooclaw/call_kw_as_user`` is guarded by ``odooclaw.reply_token``, read
  from the ``X-OdooClaw-Token`` header. Without it every delegated call was
  ``401 Unauthorized: invalid token`` and the bill was never created.
- The same endpoint takes a FLAT body (``user_id``/``model``/``method``/``args``
  at the top level). Sending a JSON-RPC envelope was answered with
  ``400 Missing user_id, model, or method``.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import server  # noqa: E402


class FakeResponse:
    status_code = 200
    text = "{}"

    def __init__(self, body):
        self._body = body

    def raise_for_status(self):
        return None

    def json(self):
        return self._body


class FakeSession:
    def __init__(self):
        self.headers = {}
        self.posted = []

    def post(self, url, json=None, timeout=None):
        self.posted.append((url, json))
        if url.endswith("/web/session/authenticate"):
            return FakeResponse({"jsonrpc": "2.0", "result": {"uid": 2}})
        return FakeResponse({"status": "ok", "result": 7})


def make_skill(monkeypatch):
    fake = FakeSession()
    monkeypatch.setattr(server.requests, "Session", lambda: fake)
    skill = server.OdooOCRSkill()
    skill.odoo_url = "http://127.0.0.1:8069"
    skill.odoo_db = "odooclaw"
    skill.odoo_user = "admin"
    skill.odoo_pwd = "admin"
    return skill, fake


def test_the_session_sends_the_shared_secret_when_the_gateway_provides_it(monkeypatch):
    monkeypatch.setenv("ODOOCLAW_REPLY_TOKEN", "shared-secret")
    skill, fake = make_skill(monkeypatch)

    assert skill._odoo_auth() is None
    assert fake.headers.get("X-OdooClaw-Token") == "shared-secret"


def test_no_header_is_sent_when_the_deployment_has_no_secret(monkeypatch):
    monkeypatch.delenv("ODOOCLAW_REPLY_TOKEN", raising=False)
    skill, fake = make_skill(monkeypatch)

    assert skill._odoo_auth() is None
    assert "X-OdooClaw-Token" not in fake.headers


def test_a_delegated_call_uses_the_flat_payload_the_module_reads(monkeypatch):
    monkeypatch.setenv("ODOOCLAW_REPLY_TOKEN", "shared-secret")
    skill, fake = make_skill(monkeypatch)
    skill.runtime_sender_id = 5
    skill.runtime_rpc_context = {"allowed_company_ids": [1]}

    result = skill._odoo_call("res.partner", "search_read", [[["name", "ilike", "x"]]],
                              {"fields": ["id"]})

    assert result == {"result": 7}
    url, body = fake.posted[-1]
    assert url.endswith("/odooclaw/call_kw_as_user")
    assert body["user_id"] == 5
    assert body["model"] == "res.partner"
    assert body["method"] == "search_read"
    assert body["context"] == {"allowed_company_ids": [1]}
    assert "params" not in body


def test_an_admin_call_keeps_the_jsonrpc_envelope(monkeypatch):
    monkeypatch.delenv("ODOOCLAW_REPLY_TOKEN", raising=False)
    skill, fake = make_skill(monkeypatch)
    skill.runtime_sender_id = None

    skill._odoo_call("ir.attachment", "read", [[511]], {"fields": ["datas"]})

    url, body = fake.posted[-1]
    assert url.endswith("/web/dataset/call_kw")
    assert body["params"]["model"] == "ir.attachment"
    assert "user_id" not in body
