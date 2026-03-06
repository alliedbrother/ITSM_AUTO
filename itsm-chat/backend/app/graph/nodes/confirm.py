"""Confirmation node - presents summary for user approval."""

from typing import Dict, Any
from ...schemas.state import ConversationState
from ...services.llm import generate_confirmation_message
from ...config.agents import DEPARTMENT_NAMES


def confirm_node(state: ConversationState) -> Dict[str, Any]:
    """Generate a confirmation message with issue summary."""
    extracted = state.get("extracted", {})
    messages = state.get("messages", [])

    # Build a nice summary
    dept_name = DEPARTMENT_NAMES.get(
        extracted.get("department", ""),
        "General"
    )

    summary_parts = [
        f"**Title:** {extracted.get('title', 'N/A')}",
        f"**Priority:** {(extracted.get('priority', 'medium') or 'medium').capitalize()}",
        f"**Department:** {dept_name}",
    ]

    if extracted.get("description"):
        desc = extracted["description"]
        if len(desc) > 100:
            desc = desc[:100] + "..."
        summary_parts.append(f"**Description:** {desc}")

    summary = "\n".join(summary_parts)

    confirmation_msg = f"""Here's a summary of your issue:

{summary}

Does this look correct? I can create this issue for you, or you can make changes."""

    # Add assistant message
    new_messages = messages.copy()
    new_messages.append({
        "role": "assistant",
        "content": confirmation_msg
    })

    return {
        "messages": new_messages,
        "phase": "confirm"
    }
