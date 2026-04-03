from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from conftest import auth_headers


def _snapshot(domain: str = "demo.odoo.com") -> dict:
    return {
        "page": {
            "url": f"https://{domain}/web#id=42&model=res.partner&view_type=form",
            "title": "Partner",
            "domain": domain,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "app": {
            "detected": "unknown",
            "model": None,
            "record_id": None,
            "view_type": None,
        },
        "visible_text": "Formulario de cliente",
        "elements": [
            {
                "id": "el_001",
                "type": "input",
                "tag": "input",
                "label": "Nombre",
                "name": "name",
                "selector": "input[name='name']",
                "value": "",
                "visible": True,
                "enabled": True,
            }
        ],
        "forms": [],
        "tables": [
            {
                "id": "table_01",
                "title": "Pedidos a facturar",
                "headers": ["Número", "Cliente", "Total"],
                "rows": [
                    ["S00030", "Acme Corporation", "$290.616,50"],
                    ["S00029", "Acme Corporation", "$7.187,50"],
                    ["S00026", "Acme Corporation", "$53.000,00"],
                ],
                "footer": ["", "", "$350.804,00"],
                "row_count": 3,
            }
        ],
        "headings": ["Cliente"],
        "breadcrumbs": ["Ventas / Clientes"],
        "actions_available": ["click", "set_value"],
        "channel": "odoo",
        "chat_id": "res.partner_42",
        "source": "browser_extension",
        "pairing_code": None,
    }


def test_snapshot_endpoint_ok(client: TestClient) -> None:
    response = client.post(
        "/browser-copilot/snapshot",
        headers=auth_headers(),
        json=_snapshot(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["app"]["detected"] == "odoo"


def test_snapshot_rejects_forbidden_domain(client: TestClient) -> None:
    response = client.post(
        "/browser-copilot/snapshot",
        headers=auth_headers(),
        json=_snapshot(domain="evil.example.com"),
    )
    assert response.status_code == 403


def test_plan_endpoint_returns_structured_payload(client: TestClient) -> None:
    response = client.post(
        "/browser-copilot/plan",
        headers=auth_headers(),
        json={"snapshot": _snapshot(), "instruction": "resume este cliente"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "summarize_record"
    assert "reasoning_summary" in body


def test_action_endpoint_blocked_when_read_only(client: TestClient) -> None:
    payload = {
        "action": {
            "action_type": "click",
            "target": {"element_id": "el_010", "selector": "button.o_form_button_save"},
            "reason": "save",
        },
        "approved": True,
    }
    response = client.post(
        "/browser-copilot/action",
        headers=auth_headers(),
        json=payload,
    )
    assert response.status_code == 403


def test_resolve_context_returns_recent_snapshot(client: TestClient) -> None:
    saved = client.post(
        "/browser-copilot/snapshot",
        headers=auth_headers(),
        json=_snapshot(),
    )
    assert saved.status_code == 200

    response = client.post(
        "/browser-copilot/context/resolve",
        headers=auth_headers(),
        json={"channel": "odoo", "chat_id": "res.partner_42", "sender_id": "18"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["found"] is True
    assert body["app"]["model"] == "res.partner"
    assert body["page_title"] == "Partner"
    assert body["visible_tables"][0]["title"] == "Pedidos a facturar"
    assert body["visible_tables"][0]["row_count"] == 3
    assert body["visible_tables"][0]["rows"][2][0] == "S00026"
    assert "$350.804,00" in body["visible_tables"][0]["footer"]


def test_resolve_context_returns_not_found_for_unknown_chat(client: TestClient) -> None:
    response = client.post(
        "/browser-copilot/context/resolve",
        headers=auth_headers(),
        json={"channel": "odoo", "chat_id": "res.partner_999"},
    )
    assert response.status_code == 200
    assert response.json()["found"] is False


def test_pairing_create_and_link_flow(client: TestClient) -> None:
    created = client.post(
        "/browser-copilot/pairing/create",
        headers=auth_headers(),
        json={"channel": "odoo", "chat_id": "res.partner_42", "sender_id": "18"},
    )
    assert created.status_code == 200
    body = created.json()
    assert body["ok"] is True
    assert len(body["code"]) == 6

    linked = client.post(
        "/browser-copilot/pairing/link",
        headers=auth_headers(),
        json={"code": body["code"]},
    )
    assert linked.status_code == 200
    link_body = linked.json()
    assert link_body["linked"] is True
    assert link_body["chat_id"] == "res.partner_42"


def test_snapshot_can_resolve_from_pairing_code(client: TestClient) -> None:
    created = client.post(
        "/browser-copilot/pairing/create",
        headers=auth_headers(),
        json={"channel": "odoo", "chat_id": "res.partner_42", "sender_id": "18"},
    )
    code = created.json()["code"]
    payload = _snapshot()
    payload["channel"] = None
    payload["chat_id"] = None
    payload["pairing_code"] = code
    saved = client.post(
        "/browser-copilot/snapshot",
        headers=auth_headers(),
        json=payload,
    )
    assert saved.status_code == 200

    resolved = client.post(
        "/browser-copilot/context/resolve",
        headers=auth_headers(),
        json={"channel": "odoo", "chat_id": "res.partner_42"},
    )
    assert resolved.status_code == 200
    assert resolved.json()["found"] is True
