from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import secrets
from typing import Any, Optional

from .detector_odoo import detect_odoo_context
from .prompts import build_planning_hint
from .schemas import (
    BrowserPairingCodeResponse,
    BrowserPairingLinkResponse,
    BrowserContextResponse,
    BrowserVisibleTable,
    ActionType,
    PlanResponse,
    SnapshotAnalysis,
    SnapshotElement,
    SnapshotPayload,
    SuggestedAction,
    ActionTarget,
)


IMPORTANT_FIELD_HINTS = {
    "res.partner": ["name", "email", "phone", "vat"],
    "sale.order": ["partner", "payment terms", "order lines"],
    "account.move": ["partner", "invoice date", "due date", "journal", "invoice lines"],
    "project.task": ["name", "stage", "assignees"],
    "crm.lead": ["name", "email", "phone", "expected revenue"],
}


SNAPSHOT_TTL_SECONDS = 300
PAIRING_TTL_MINUTES = 30


@dataclass
class PairingRecord:
    code: str
    channel: str
    chat_id: str
    sender_id: str
    expires_at: datetime


@dataclass
class StoredSnapshot:
    snapshot: SnapshotPayload
    analysis: SnapshotAnalysis
    shared_at: datetime


@dataclass
class SnapshotMemory:
    latest_by_domain: dict[str, StoredSnapshot] = field(default_factory=dict)
    latest_by_session: dict[str, StoredSnapshot] = field(default_factory=dict)
    pairings: dict[str, PairingRecord] = field(default_factory=dict)

    def store(self, snapshot: SnapshotPayload, analysis: SnapshotAnalysis) -> None:
        stored = StoredSnapshot(
            snapshot=snapshot,
            analysis=analysis,
            shared_at=datetime.now(timezone.utc),
        )
        self.latest_by_domain[snapshot.page.domain] = stored
        session_key = build_session_lookup_key(snapshot, analysis)
        if session_key:
            self.latest_by_session[session_key] = stored

    def latest(self, domain: str) -> Optional[SnapshotPayload]:
        stored = self.latest_by_domain.get(domain)
        if stored is None:
            return None
        if is_snapshot_stale(stored):
            self.latest_by_domain.pop(domain, None)
            return None
        return stored.snapshot

    def resolve(self, channel: str, chat_id: str) -> Optional[StoredSnapshot]:
        key = normalize_session_lookup_key(channel, chat_id)
        if not key:
            return None
        stored = self.latest_by_session.get(key)
        if stored is None:
            return None
        if is_snapshot_stale(stored):
            self.latest_by_session.pop(key, None)
            return None
        return stored

    def create_pairing(
        self, channel: str, chat_id: str, sender_id: str
    ) -> PairingRecord:
        self.cleanup_pairings()
        code = generate_pairing_code()
        while code in self.pairings:
            code = generate_pairing_code()
        record = PairingRecord(
            code=code,
            channel=channel,
            chat_id=chat_id,
            sender_id=sender_id,
            expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=PAIRING_TTL_MINUTES),
        )
        self.pairings[code] = record
        return record

    def get_pairing(self, code: str) -> Optional[PairingRecord]:
        self.cleanup_pairings()
        normalized = normalize_pairing_code(code)
        if not normalized:
            return None
        record = self.pairings.get(normalized)
        if record is None:
            return None
        if record.expires_at <= datetime.now(timezone.utc):
            self.pairings.pop(normalized, None)
            return None
        return record

    def cleanup_pairings(self) -> None:
        now = datetime.now(timezone.utc)
        expired = [
            code for code, record in self.pairings.items() if record.expires_at <= now
        ]
        for code in expired:
            self.pairings.pop(code, None)


def normalize_session_lookup_key(channel: str, chat_id: str) -> str:
    normalized_channel = (channel or "").strip().lower()
    normalized_chat = (chat_id or "").strip()
    if not normalized_channel or not normalized_chat:
        return ""
    return f"{normalized_channel}::{normalized_chat}"


def normalize_pairing_code(code: str) -> str:
    value = "".join(ch for ch in (code or "").upper() if ch.isalnum())
    if len(value) != 6:
        return ""
    return value


def generate_pairing_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))


def build_session_lookup_key(
    snapshot: SnapshotPayload, analysis: SnapshotAnalysis
) -> str:
    if snapshot.channel and snapshot.chat_id:
        return normalize_session_lookup_key(snapshot.channel, snapshot.chat_id)

    app = analysis.app
    if app.detected == "odoo" and app.model and app.record_id:
        return normalize_session_lookup_key("odoo", f"{app.model}_{app.record_id}")

    return ""


def is_snapshot_stale(stored: StoredSnapshot) -> bool:
    age = datetime.now(timezone.utc) - stored.shared_at
    return age.total_seconds() > SNAPSHOT_TTL_SECONDS


def build_visible_text_summary(value: str, max_len: int = 500) -> str:
    text = " ".join((value or "").split())
    if len(text) <= max_len:
        return text
    return text[:max_len].rstrip() + "..."


def build_visible_tables(snapshot: SnapshotPayload) -> list[BrowserVisibleTable]:
    tables: list[BrowserVisibleTable] = []
    for table in snapshot.tables[:3]:
        rows = [
            row[:10] for row in table.rows[:12] if any(cell.strip() for cell in row)
        ]
        footer = [cell for cell in table.footer[:10] if cell.strip()]
        headers = [cell for cell in table.headers[:10] if cell.strip()]
        if not headers and not rows:
            continue
        tables.append(
            BrowserVisibleTable(
                id=table.id,
                title=table.title,
                headers=headers,
                rows=rows,
                footer=footer,
                row_count=table.row_count or len(rows),
            )
        )
    return tables


def build_browser_context_response(
    stored: Optional[StoredSnapshot],
) -> BrowserContextResponse:
    if stored is None:
        return BrowserContextResponse(found=False)

    age_seconds = max(
        0,
        int((datetime.now(timezone.utc) - stored.shared_at).total_seconds()),
    )
    return BrowserContextResponse(
        found=True,
        shared_at=stored.shared_at,
        age_seconds=age_seconds,
        page_url=stored.snapshot.page.url,
        page_title=stored.snapshot.page.title,
        domain=stored.snapshot.page.domain,
        app=stored.analysis.app,
        headings=stored.snapshot.headings[:10],
        breadcrumbs=stored.snapshot.breadcrumbs[:6],
        visible_fields=stored.analysis.app.fields_visible[:20],
        main_buttons=stored.analysis.app.main_buttons_visible[:12],
        visible_text_summary=build_visible_text_summary(stored.snapshot.visible_text),
        visible_tables=build_visible_tables(stored.snapshot),
    )


class BrowserCopilotService:
    def __init__(self) -> None:
        self._memory = SnapshotMemory()

    def process_snapshot(self, snapshot: SnapshotPayload) -> SnapshotAnalysis:
        self._apply_pairing(snapshot)
        detection = detect_odoo_context(snapshot)

        issues = self._detect_obvious_issues(snapshot, detection.model)
        next_actions = self._next_actions(snapshot, detection.detected)
        summary = self._build_summary(snapshot, detection.detected)

        analysis = SnapshotAnalysis(
            status="ok",
            app=detection,
            summary=summary,
            issues=issues,
            suggested_next_actions=next_actions,
        )
        self._memory.store(snapshot, analysis)
        return analysis

    def build_plan(
        self, snapshot: SnapshotPayload, instruction: str, read_only: bool
    ) -> PlanResponse:
        lowered = instruction.lower().strip()
        _ = build_planning_hint(snapshot, instruction)
        intent = self._classify_intent(lowered)
        reasoning_summary = self._reasoning_snapshot(snapshot, intent)

        actions: list[SuggestedAction] = []
        if not read_only and intent in {"fill_missing_data", "perform_form_action"}:
            actions = self._suggest_actions(snapshot, lowered)

        confidence = 0.88 if snapshot.app.detected == "odoo" else 0.72
        if not actions and intent in {
            "summarize_record",
            "audit_form",
            "list_available_buttons",
        }:
            confidence += 0.05
        confidence = min(confidence, 0.97)

        return PlanResponse(
            intent=intent,
            reasoning_summary=reasoning_summary,
            actions_suggested=actions,
            confidence=confidence,
        )

    def latest_snapshot(self, domain: str) -> Optional[SnapshotPayload]:
        return self._memory.latest(domain)

    def resolve_context(self, channel: str, chat_id: str) -> BrowserContextResponse:
        stored = self._memory.resolve(channel, chat_id)
        return build_browser_context_response(stored)

    def create_pairing(
        self, channel: str, chat_id: str, sender_id: str
    ) -> BrowserPairingCodeResponse:
        record = self._memory.create_pairing(channel, chat_id, sender_id)
        return BrowserPairingCodeResponse(
            ok=True,
            code=record.code,
            expires_at=record.expires_at,
            channel=record.channel,
            chat_id=record.chat_id,
        )

    def link_pairing(self, code: str) -> BrowserPairingLinkResponse:
        record = self._memory.get_pairing(code)
        if record is None:
            return BrowserPairingLinkResponse(
                linked=False, code=normalize_pairing_code(code) or code
            )
        return BrowserPairingLinkResponse(
            linked=True,
            code=record.code,
            channel=record.channel,
            chat_id=record.chat_id,
            expires_at=record.expires_at,
        )

    def _apply_pairing(self, snapshot: SnapshotPayload) -> None:
        if snapshot.channel and snapshot.chat_id:
            return
        record = self._memory.get_pairing(snapshot.pairing_code or "")
        if record is None:
            return
        snapshot.channel = record.channel
        snapshot.chat_id = record.chat_id
        if not snapshot.sender_id:
            snapshot.sender_id = record.sender_id

    def _build_summary(self, snapshot: SnapshotPayload, detected: str) -> str:
        element_count = len(snapshot.elements)
        form_count = len(snapshot.forms)
        table_count = len(snapshot.tables)
        return (
            f"Captured {element_count} interactive elements, {form_count} forms, and {table_count} tables "
            f"on domain {snapshot.page.domain} (detected app: {detected})."
        )

    def _detect_obvious_issues(
        self, snapshot: SnapshotPayload, model: Optional[str]
    ) -> list[str]:
        issues: list[str] = []
        required_hints = IMPORTANT_FIELD_HINTS.get(model or "", [])
        labels = {(element.label or "").lower() for element in snapshot.elements}
        values = {
            (element.label or element.name or "").lower(): (element.value or "").strip()
            for element in snapshot.elements
            if element.type in {"input", "textarea", "select"}
        }

        for required in required_hints:
            present = any(required in label for label in labels)
            if not present:
                continue
            field_value = ""
            for name, value in values.items():
                if required in name:
                    field_value = value
                    break
            if not field_value:
                issues.append(f"Field related to '{required}' appears empty.")

        if not snapshot.elements:
            issues.append("No interactive elements found on the visible page.")
        return issues

    def _next_actions(self, snapshot: SnapshotPayload, detected: str) -> list[str]:
        suggestions = [
            "Review empty important fields before saving.",
            "Check available primary buttons for the next workflow step.",
        ]
        if detected == "odoo":
            suggestions.insert(0, "Ask for a quick record summary before editing.")
        if snapshot.tables:
            suggestions.append("Inspect visible table rows for inconsistencies.")
        return suggestions[:5]

    def _classify_intent(self, instruction: str) -> str:
        if any(token in instruction for token in {"resume", "resumen", "summary"}):
            return "summarize_record"
        if any(
            token in instruction for token in {"falta", "missing", "error", "errores"}
        ):
            return "audit_form"
        if any(token in instruction for token in {"boton", "botones", "buttons"}):
            return "list_available_buttons"
        if any(
            token in instruction
            for token in {"rellena", "fill", "completa", "complete"}
        ):
            return "fill_missing_data"
        return "perform_form_action"

    def _reasoning_snapshot(self, snapshot: SnapshotPayload, intent: str) -> str:
        return (
            f"Intent '{intent}' inferred from user instruction and page context with "
            f"{len(snapshot.elements)} interactive elements on {snapshot.page.domain}."
        )

    def _suggest_actions(
        self, snapshot: SnapshotPayload, instruction: str
    ) -> list[SuggestedAction]:
        actions: list[SuggestedAction] = []
        empty_inputs = [
            element
            for element in snapshot.elements
            if element.type in {"input", "textarea"}
            and element.enabled
            and not (element.value or "").strip()
        ]

        if "guardar" in instruction or "save" in instruction:
            save_button = self._find_button(snapshot.elements, {"save", "guardar"})
            if save_button:
                actions.append(
                    SuggestedAction(
                        action_type=ActionType.CLICK,
                        target=ActionTarget(
                            element_id=save_button.id, selector=save_button.selector
                        ),
                        reason="Save button detected and user asked for a save-related step.",
                    )
                )

        if empty_inputs:
            first = empty_inputs[0]
            actions.append(
                SuggestedAction(
                    action_type=ActionType.SET_VALUE,
                    target=ActionTarget(element_id=first.id, selector=first.selector),
                    value="Pendiente de completar",
                    reason="First empty editable field found in current form.",
                )
            )

        return actions[:3]

    def _find_button(
        self, elements: list[SnapshotElement], terms: set[str]
    ) -> Optional[SnapshotElement]:
        for element in elements:
            if element.tag not in {"button", "a"}:
                continue
            text = f"{element.text} {element.label}".lower()
            if any(term in text for term in terms):
                return element
        return None


def service_metadata() -> dict[str, Any]:
    return {"component": "browser-copilot", "transport": "http", "ws_ready": True}
