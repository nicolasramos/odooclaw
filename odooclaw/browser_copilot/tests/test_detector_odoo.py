from __future__ import annotations

from datetime import datetime, timezone

from browser_copilot.detector_odoo import detect_odoo_context
from browser_copilot.schemas import SnapshotPayload


def test_odoo_detector_extracts_model_and_view() -> None:
    snapshot = SnapshotPayload.model_validate(
        {
            "page": {
                "url": "https://demo.odoo.com/web#id=42&model=res.partner&view_type=form",
                "title": "Contacts - Odoo",
                "domain": "demo.odoo.com",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "app": {
                "detected": "unknown",
                "model": None,
                "record_id": None,
                "view_type": None,
            },
            "visible_text": "Cliente demo chatter",
            "elements": [
                {
                    "id": "el_001",
                    "type": "input",
                    "tag": "input",
                    "label": "Nombre",
                    "name": "name",
                    "selector": "div.o_form_view input[name='name']",
                    "value": "",
                    "visible": True,
                    "enabled": True,
                }
            ],
            "forms": [],
            "tables": [],
            "headings": ["Azure Interior"],
            "breadcrumbs": ["Ventas / Clientes"],
            "actions_available": ["click"],
        }
    )

    detected = detect_odoo_context(snapshot)
    assert detected.detected == "odoo"
    assert detected.model == "res.partner"
    assert detected.record_id == 42
    assert detected.view_type == "form"
    assert detected.confidence > 0.6
