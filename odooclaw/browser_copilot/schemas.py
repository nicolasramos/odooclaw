from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ActionType(str, Enum):
    CLICK = "click"
    SET_VALUE = "set_value"
    SELECT_OPTION = "select_option"
    SCROLL_INTO_VIEW = "scroll_into_view"


class PageContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str
    title: str
    domain: str
    timestamp: datetime


class AppContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    detected: str = "unknown"
    model: Optional[str] = None
    record_id: Optional[int] = None
    view_type: Optional[str] = None


class SnapshotElement(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    type: str
    tag: Optional[str] = None
    label: str = ""
    name: str = ""
    role: str = ""
    selector: str
    value: str = ""
    text: str = ""
    visible: bool = True
    enabled: bool = True


class FormField(BaseModel):
    model_config = ConfigDict(extra="ignore")

    selector: str
    name: str = ""
    type: str = ""
    label: str = ""


class SnapshotForm(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    selector: str
    fields: list[FormField] = Field(default_factory=list)


class SnapshotTable(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str = ""
    headers: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)
    footer: list[str] = Field(default_factory=list)
    row_count: int = 0


class BrowserVisibleTable(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str = ""
    headers: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)
    footer: list[str] = Field(default_factory=list)
    row_count: int = 0


class SnapshotPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    page: PageContext
    app: AppContext = Field(default_factory=AppContext)
    visible_text: str = ""
    elements: list[SnapshotElement] = Field(default_factory=list)
    forms: list[SnapshotForm] = Field(default_factory=list)
    tables: list[SnapshotTable] = Field(default_factory=list)
    headings: list[str] = Field(default_factory=list)
    breadcrumbs: list[str] = Field(default_factory=list)
    actions_available: list[ActionType] = Field(default_factory=list)
    channel: Optional[str] = None
    chat_id: Optional[str] = None
    sender_id: Optional[str] = None
    source: Optional[str] = None
    pairing_code: Optional[str] = None

    @field_validator("visible_text")
    @classmethod
    def normalize_visible_text(cls, value: str) -> str:
        return " ".join(value.split())[:8000]


class AppDetection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    detected: str
    model: Optional[str] = None
    record_id: Optional[int] = None
    view_type: Optional[str] = None
    chatter_visible: bool = False
    fields_visible: list[str] = Field(default_factory=list)
    main_buttons_visible: list[str] = Field(default_factory=list)
    probable_record_name: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)


class SnapshotAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    app: AppDetection
    summary: str
    issues: list[str] = Field(default_factory=list)
    suggested_next_actions: list[str] = Field(default_factory=list)


class BrowserContextResolveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    channel: str
    chat_id: str
    sender_id: Optional[str] = None


class BrowserContextResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    found: bool = False
    shared_at: Optional[datetime] = None
    age_seconds: Optional[int] = None
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    domain: Optional[str] = None
    app: Optional[AppDetection] = None
    headings: list[str] = Field(default_factory=list)
    breadcrumbs: list[str] = Field(default_factory=list)
    visible_fields: list[str] = Field(default_factory=list)
    main_buttons: list[str] = Field(default_factory=list)
    visible_text_summary: str = ""
    visible_tables: list[BrowserVisibleTable] = Field(default_factory=list)


class BrowserPairingCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    channel: str
    chat_id: str
    sender_id: Optional[str] = None


class BrowserPairingCodeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ok: bool = True
    code: str
    expires_at: datetime
    channel: str
    chat_id: str


class BrowserPairingLinkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str


class BrowserPairingLinkResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    linked: bool
    code: str
    channel: Optional[str] = None
    chat_id: Optional[str] = None
    expires_at: Optional[datetime] = None


class PlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    snapshot: SnapshotPayload
    instruction: str = Field(min_length=2, max_length=1000)


class ActionTarget(BaseModel):
    model_config = ConfigDict(extra="forbid")

    element_id: Optional[str] = None
    selector: str


class SuggestedAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action_type: ActionType
    target: ActionTarget
    value: Optional[str] = None
    reason: str


class PlanResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    intent: str
    reasoning_summary: str
    actions_suggested: list[SuggestedAction] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)


class ActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: SuggestedAction
    approved: bool = False


class ActionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    command: SuggestedAction
    message: str


class BackendSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    allowed_domains: list[str]
    token: str
    read_only: bool = True


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    read_only: bool
    domains_configured: list[str]
    now: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)
