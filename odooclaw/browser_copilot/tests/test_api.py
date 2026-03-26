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
        "tables": [],
        "headings": ["Cliente"],
        "breadcrumbs": ["Ventas / Clientes"],
        "actions_available": ["click", "set_value"],
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
