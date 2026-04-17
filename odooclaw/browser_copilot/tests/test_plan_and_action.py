from __future__ import annotations

from datetime import datetime, timezone

import pytest

from browser_copilot.action_executor import ActionValidationError, build_action_response
from browser_copilot.schemas import ActionTarget, ActionType, SuggestedAction
from browser_copilot.service import BrowserCopilotService, normalize_session_lookup_key


def _snapshot_data() -> dict:
    return {
        "page": {
            "url": "https://demo.odoo.com/web#id=15&model=account.move&view_type=form",
            "title": "Factura INV/2026/001",
            "domain": "demo.odoo.com",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "app": {
            "detected": "odoo",
            "model": "account.move",
            "record_id": 15,
            "view_type": "form",
        },
        "visible_text": "Factura borrador",
        "elements": [
            {
                "id": "el_001",
                "type": "input",
                "tag": "input",
                "label": "Due Date",
                "name": "invoice_date_due",
                "selector": "input[name='invoice_date_due']",
                "value": "",
                "visible": True,
                "enabled": True,
            },
            {
                "id": "el_002",
                "type": "button",
                "tag": "button",
                "label": "Guardar",
                "name": "",
                "selector": "button.o_form_button_save",
                "text": "Guardar",
                "value": "",
                "visible": True,
                "enabled": True,
            },
        ],
        "forms": [],
        "tables": [],
        "headings": ["Factura INV/2026/001"],
        "breadcrumbs": ["Contabilidad / Facturas"],
        "actions_available": ["click", "set_value", "select_option"],
    }


def test_plan_read_only_has_no_actions() -> None:
    from browser_copilot.schemas import SnapshotPayload

    service = BrowserCopilotService()
    snapshot = SnapshotPayload.model_validate(_snapshot_data())
    response = service.build_plan(
        snapshot=snapshot, instruction="rellena los datos básicos", read_only=True
    )
    assert response.intent == "fill_missing_data"
    assert response.actions_suggested == []


def test_action_serialization_ok() -> None:
    action = SuggestedAction(
        action_type=ActionType.SET_VALUE,
        target=ActionTarget(
            element_id="el_001", selector="input[name='invoice_date_due']"
        ),
        value="2026-03-19",
        reason="Due date missing",
    )
    response = build_action_response(action)
    assert response.command.action_type == ActionType.SET_VALUE
    assert response.command.target.selector == "input[name='invoice_date_due']"


def test_action_serialization_rejects_missing_value() -> None:
    action = SuggestedAction(
        action_type=ActionType.SET_VALUE,
        target=ActionTarget(
            element_id="el_001", selector="input[name='invoice_date_due']"
        ),
        value=None,
        reason="Invalid action for test",
    )
    with pytest.raises(ActionValidationError):
        build_action_response(action)


def test_process_snapshot_links_odoo_session_key() -> None:
    from browser_copilot.schemas import SnapshotPayload

    service = BrowserCopilotService()
    payload = _snapshot_data()
    payload["channel"] = "odoo"
    payload["chat_id"] = "account.move_15"
    snapshot = SnapshotPayload.model_validate(payload)

    service.process_snapshot(snapshot)
    resolved = service.resolve_context("odoo", "account.move_15")

    assert resolved.found is True
    assert resolved.app is not None
    assert resolved.app.model == "account.move"


def test_normalize_session_lookup_key_requires_values() -> None:
    assert normalize_session_lookup_key("", "abc") == ""
    assert normalize_session_lookup_key("odoo", "") == ""
    assert (
        normalize_session_lookup_key("odoo", "res.partner_4") == "odoo::res.partner_4"
    )
