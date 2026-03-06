"""Clarification node - asks for missing information."""

from typing import Dict, Any, List
from ...schemas.state import ConversationState, MissingField
from ...services.llm import generate_clarification


REQUIRED_FIELDS = ["title", "priority"]
OPTIONAL_FIELDS = ["description", "department"]


def get_missing_fields(extracted: Dict[str, Any]) -> List[MissingField]:
    """Identify which required fields are missing."""
    missing = []

    if not extracted.get("title"):
        missing.append(MissingField(
            field_name="title",
            question="Could you briefly describe the issue you're experiencing?",
            options=None
        ))

    if not extracted.get("priority"):
        missing.append(MissingField(
            field_name="priority",
            question="How urgent is this issue?",
            options=["Critical - System down", "High - Major impact", "Medium - Some impact", "Low - Minor issue"]
        ))

    return missing


def clarify_node(state: ConversationState) -> Dict[str, Any]:
    """Check for missing information and generate clarifying questions."""
    extracted = state.get("extracted", {})
    messages = state.get("messages", [])

    # Check what's missing
    missing = get_missing_fields(extracted)

    if not missing:
        # All required info present, move to confirm
        return {
            "missing_fields": [],
            "phase": "confirm"
        }

    # Generate a natural clarifying message
    missing_names = [m.field_name for m in missing]
    clarification_msg = generate_clarification(missing_names, extracted, messages)

    # Add assistant message
    new_messages = messages.copy()
    new_messages.append({
        "role": "assistant",
        "content": clarification_msg
    })

    return {
        "messages": new_messages,
        "missing_fields": [m.model_dump() for m in missing],
        "phase": "clarify"  # Stay in clarify until we have all info
    }
