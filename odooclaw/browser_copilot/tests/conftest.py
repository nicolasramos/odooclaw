from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from browser_copilot.router import create_app


@pytest.fixture(autouse=True)
def browser_copilot_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "BROWSER_COPILOT_ALLOWED_DOMAINS", "*.odoo.com,localhost,127.0.0.1"
    )
    monkeypatch.setenv("BROWSER_COPILOT_TOKEN", "test-token")
    monkeypatch.setenv("BROWSER_COPILOT_READ_ONLY", "true")


@pytest.fixture
def client() -> TestClient:
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def auth_headers() -> dict[str, str]:
    return {
        "X-Browser-Copilot-Token": os.environ.get("BROWSER_COPILOT_TOKEN", "test-token")
    }
