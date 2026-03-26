from __future__ import annotations

from .schemas import ActionResponse, ActionType, SuggestedAction

ALLOWED_ACTIONS = {
    ActionType.CLICK,
    ActionType.SET_VALUE,
    ActionType.SELECT_OPTION,
    ActionType.SCROLL_INTO_VIEW,
}


class ActionValidationError(ValueError):
    pass


def validate_action(action: SuggestedAction) -> SuggestedAction:
    if action.action_type not in ALLOWED_ACTIONS:
        raise ActionValidationError(f"Action {action.action_type} is not allowed")
    if not action.target.selector:
        raise ActionValidationError("Action target selector is required")
    if (
        action.action_type in {ActionType.SET_VALUE, ActionType.SELECT_OPTION}
        and action.value is None
    ):
        raise ActionValidationError(f"Action {action.action_type} requires value")
    return action


def build_action_response(action: SuggestedAction) -> ActionResponse:
    validated = validate_action(action)
    return ActionResponse(
        status="ok",
        command=validated,
        message="Action approved and serialized for extension execution.",
    )
