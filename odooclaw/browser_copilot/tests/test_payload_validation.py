from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from browser_copilot.schemas import SnapshotPayload


def _base_snapshot() -> dict:
    return {
        "page": {
            "url": "https://demo.odoo.com/web#id=42&model=res.partner&view_type=form",
            "title": "Demo - Odoo",
            "domain": "demo.odoo.com",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "app": {
            "detected": "unknown",
            "model": None,
            "record_id": None,
            "view_type": None,
        },
        "visible_text": "Cliente demo",
        "elements": [
            {
                "id": "el_001",
                "type": "input",
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
        "headings": ["Cliente demo"],
        "breadcrumbs": ["Ventas / Clientes"],
        "actions_available": ["click", "set_value", "select_option"],
    }


def test_snapshot_payload_validation_ok() -> None:
    payload = SnapshotPayload.model_validate(_base_snapshot())
    assert payload.page.domain == "demo.odoo.com"
    assert payload.elements[0].id == "el_001"


def test_snapshot_payload_validation_fails_without_page_url() -> None:
    data = _base_snapshot()
    data["page"].pop("url")
    with pytest.raises(ValidationError):
        SnapshotPayload.model_validate(data)
