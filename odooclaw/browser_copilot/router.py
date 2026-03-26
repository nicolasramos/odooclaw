from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, status

from .action_executor import ActionValidationError, build_action_response
from .schemas import (
    ActionRequest,
    ActionResponse,
    BackendSettings,
    HealthResponse,
    PlanRequest,
    PlanResponse,
    SnapshotAnalysis,
    SnapshotPayload,
)
from .security import is_domain_allowed, load_security_config, require_token
from .service import BrowserCopilotService, service_metadata

logger = logging.getLogger("browser_copilot")


def _build_settings() -> BackendSettings:
    cfg = load_security_config()
    return BackendSettings(
        allowed_domains=cfg.allowed_domains,
        token=cfg.token,
        read_only=cfg.read_only,
    )


def create_app() -> FastAPI:
    settings = _build_settings()
    service = BrowserCopilotService()

    app = FastAPI(title="OdooClaw Browser Copilot", version="0.1.0")

    def _check_token(
        x_browser_copilot_token: Optional[str] = Header(default=None),
    ) -> None:
        if not require_token(settings.token, x_browser_copilot_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid browser copilot token",
            )

    def _check_domain(snapshot: SnapshotPayload) -> None:
        if not is_domain_allowed(snapshot.page.domain, settings.allowed_domains):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Domain not allowed: {snapshot.page.domain}",
            )

    @app.get("/browser-copilot/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            read_only=settings.read_only,
            domains_configured=settings.allowed_domains,
            now=datetime.now(timezone.utc),
            metadata=service_metadata(),
        )

    @app.post("/browser-copilot/snapshot", response_model=SnapshotAnalysis)
    def snapshot(
        payload: SnapshotPayload,
        _authorized: None = Depends(_check_token),
    ) -> SnapshotAnalysis:
        _check_domain(payload)
        logger.info("Processing snapshot for %s", payload.page.domain)
        analysis = service.process_snapshot(payload)
        return analysis

    @app.post("/browser-copilot/plan", response_model=PlanResponse)
    def plan(
        payload: PlanRequest,
        _authorized: None = Depends(_check_token),
    ) -> PlanResponse:
        _check_domain(payload.snapshot)
        logger.info("Planning browser action for %s", payload.snapshot.page.domain)
        return service.build_plan(
            snapshot=payload.snapshot,
            instruction=payload.instruction,
            read_only=settings.read_only,
        )

    @app.post("/browser-copilot/action", response_model=ActionResponse)
    def action(
        payload: ActionRequest,
        _authorized: None = Depends(_check_token),
    ) -> ActionResponse:
        if settings.read_only:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Action execution disabled while read_only=true",
            )
        if not payload.approved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Action must be explicitly approved",
            )

        try:
            return build_action_response(payload.action)
        except ActionValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    return app
