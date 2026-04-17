from __future__ import annotations

from .schemas import SnapshotPayload


def build_planning_hint(snapshot: SnapshotPayload, instruction: str) -> str:
    return (
        "Analyze browser context with strict safety. "
        "Prioritize read-only insights and only propose allowlisted UI actions. "
        f"Instruction: {instruction}. "
        f"Page title: {snapshot.page.title}. "
        f"Domain: {snapshot.page.domain}."
    )
