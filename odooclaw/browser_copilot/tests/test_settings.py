"""Tests for backend settings, health endpoint, and token-based configuration."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from browser_copilot.router import create_app
from browser_copilot.security import load_security_config


class TestHealthEndpoint:
    """Health endpoint should be public (no token required) and return config info."""

    def test_health_returns_ok_without_token(self, client: TestClient) -> None:
        response = client.get("/browser-copilot/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert "domains_configured" in body
        assert "read_only" in body

    def test_health_includes_configured_domains(self, client: TestClient) -> None:
        response = client.get("/browser-copilot/health")
        body = response.json()
        domains = body["domains_configured"]
        assert isinstance(domains, list)
        assert "*.odoo.com" in domains
        assert "localhost" in domains

    def test_health_reflects_read_only_flag(self, client: TestClient) -> None:
        response = client.get("/browser-copilot/health")
        body = response.json()
        # conftest sets BROWSER_COPILOT_READ_ONLY=true
        assert body["read_only"] is True


class TestTokenConfiguration:
    """Token is loaded from env var and applied to all protected endpoints."""

    def test_config_loads_token_from_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("BROWSER_COPILOT_TOKEN", "my-secret-token")
        cfg = load_security_config()
        assert cfg.token == "my-secret-token"

    def test_config_defaults_to_dev_token(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("BROWSER_COPILOT_TOKEN", raising=False)
        cfg = load_security_config()
        assert cfg.token == "dev-token"

    def test_snapshot_rejects_wrong_token(self, client: TestClient) -> None:
        response = client.post(
            "/browser-copilot/snapshot",
            headers={"X-Browser-Copilot-Token": "wrong-token"},
            json={
                "page": {
                    "url": "https://demo.odoo.com/web",
                    "title": "Test",
                    "domain": "demo.odoo.com",
                    "timestamp": "2026-01-01T00:00:00Z",
                },
                "app": {
                    "detected": "unknown",
                    "model": None,
                    "record_id": None,
                    "view_type": None,
                },
                "visible_text": "",
                "elements": [],
                "forms": [],
                "tables": [],
                "headings": [],
                "breadcrumbs": [],
                "actions_available": [],
            },
        )
        assert response.status_code == 401

    def test_snapshot_rejects_missing_token(self, client: TestClient) -> None:
        response = client.post(
            "/browser-copilot/snapshot",
            json={
                "page": {
                    "url": "https://demo.odoo.com/web",
                    "title": "Test",
                    "domain": "demo.odoo.com",
                    "timestamp": "2026-01-01T00:00:00Z",
                },
                "app": {
                    "detected": "unknown",
                    "model": None,
                    "record_id": None,
                    "view_type": None,
                },
                "visible_text": "",
                "elements": [],
                "forms": [],
                "tables": [],
                "headings": [],
                "breadcrumbs": [],
                "actions_available": [],
            },
        )
        assert response.status_code == 401


class TestDomainConfiguration:
    """Allowed domains are loaded from env var and enforced."""

    def test_config_loads_domains_from_env(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv(
            "BROWSER_COPILOT_ALLOWED_DOMAINS", "mi-odoo.com,*.cliente.es"
        )
        cfg = load_security_config()
        assert "mi-odoo.com" in cfg.allowed_domains
        assert "*.cliente.es" in cfg.allowed_domains

    def test_config_defaults_to_localhost(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("BROWSER_COPILOT_ALLOWED_DOMAINS", raising=False)
        cfg = load_security_config()
        assert "localhost" in cfg.allowed_domains
        assert "127.0.0.1" in cfg.allowed_domains

    def test_custom_domains_accepted_in_snapshot(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("BROWSER_COPILOT_TOKEN", "test-token")
        monkeypatch.setenv("BROWSER_COPILOT_ALLOWED_DOMAINS", "mi-vps.example.com")
        monkeypatch.setenv("BROWSER_COPILOT_READ_ONLY", "true")
        app = create_app()
        with TestClient(app) as test_client:
            response = test_client.post(
                "/browser-copilot/snapshot",
                headers={"X-Browser-Copilot-Token": "test-token"},
                json={
                    "page": {
                        "url": "https://mi-vps.example.com/web",
                        "title": "Mi Odoo",
                        "domain": "mi-vps.example.com",
                        "timestamp": "2026-01-01T00:00:00Z",
                    },
                    "app": {
                        "detected": "unknown",
                        "model": None,
                        "record_id": None,
                        "view_type": None,
                    },
                    "visible_text": "",
                    "elements": [],
                    "forms": [],
                    "tables": [],
                    "headings": [],
                    "breadcrumbs": [],
                    "actions_available": [],
                },
            )
            assert response.status_code == 200

    def test_wildcard_domain_accepts_all(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("BROWSER_COPILOT_TOKEN", "test-token")
        monkeypatch.setenv("BROWSER_COPILOT_ALLOWED_DOMAINS", "*")
        monkeypatch.setenv("BROWSER_COPILOT_READ_ONLY", "true")
        app = create_app()
        with TestClient(app) as test_client:
            response = test_client.post(
                "/browser-copilot/snapshot",
                headers={"X-Browser-Copilot-Token": "test-token"},
                json={
                    "page": {
                        "url": "https://random.example.com/web",
                        "title": "Random",
                        "domain": "random.example.com",
                        "timestamp": "2026-01-01T00:00:00Z",
                    },
                    "app": {
                        "detected": "unknown",
                        "model": None,
                        "record_id": None,
                        "view_type": None,
                    },
                    "visible_text": "",
                    "elements": [],
                    "forms": [],
                    "tables": [],
                    "headings": [],
                    "breadcrumbs": [],
                    "actions_available": [],
                },
            )
            assert response.status_code == 200
