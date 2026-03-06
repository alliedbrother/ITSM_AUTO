"""Routing logic (edges) for the LangGraph workflow."""

from typing import Literal
from ..schemas.state import ConversationState


def route_after_classify(state: ConversationState) -> Literal["extract"]:
    """After classification, always move to extraction."""
    return "extract"


def route_after_extract(state: ConversationState) -> Literal["clarify"]:
    """After extraction, move to clarify to check for missing info."""
    return "clarify"


def route_after_clarify(state: ConversationState) -> Literal["clarify", "confirm"]:
    """After clarify, either stay in clarify or move to confirm."""
    missing = state.get("missing_fields", [])
    if missing:
        return "clarify"
    return "confirm"


def route_after_confirm(state: ConversationState) -> Literal["confirm", "create", "clarify"]:
    """After confirm, check user response and route accordingly.

    Note: This is typically handled by the workflow processor based on user input.
    """
    return "confirm"


def should_create_issue(user_input: str) -> bool:
    """Check if user input confirms they want to create the issue."""
    positive_responses = [
        "yes", "yep", "yeah", "correct", "looks good", "create it",
        "go ahead", "confirm", "submit", "ok", "okay", "sure",
        "that's right", "perfect", "looks correct", "create"
    ]
    user_lower = user_input.lower().strip()
    return any(resp in user_lower for resp in positive_responses)


def should_modify_issue(user_input: str) -> bool:
    """Check if user wants to modify the issue before creating."""
    negative_responses = [
        "no", "change", "modify", "edit", "wrong", "incorrect",
        "not right", "update", "fix", "different"
    ]
    user_lower = user_input.lower().strip()
    return any(resp in user_lower for resp in negative_responses)


def parse_priority_from_input(user_input: str) -> str | None:
    """Parse priority level from user input."""
    user_lower = user_input.lower()

    if any(word in user_lower for word in ["critical", "urgent", "emergency", "down", "outage"]):
        return "critical"
    elif any(word in user_lower for word in ["high", "important", "major", "serious"]):
        return "high"
    elif any(word in user_lower for word in ["medium", "moderate", "normal", "standard"]):
        return "medium"
    elif any(word in user_lower for word in ["low", "minor", "small", "trivial"]):
        return "low"

    return None
