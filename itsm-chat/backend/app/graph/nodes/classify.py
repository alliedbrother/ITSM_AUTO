"""Classification node - determines the department for the issue."""

from typing import Dict, Any
from ...schemas.state import ConversationState
from ...config.agents import classify_department_by_keywords, get_agent_for_department
from ...services.llm import classify_department


def classify_node(state: ConversationState) -> Dict[str, Any]:
    """Classify the issue to a department.

    Uses keyword matching first, falls back to LLM for ambiguous cases.
    """
    messages = state.get("messages", [])
    if not messages:
        return {"phase": "extract"}

    # Get all user messages
    user_text = " ".join(
        msg["content"] for msg in messages if msg["role"] == "user"
    )

    # Try keyword-based classification first
    department = classify_department_by_keywords(user_text)

    # Fall back to LLM if no clear match
    if not department:
        department = classify_department(user_text)

    # Update extracted info
    extracted = state.get("extracted", {}).copy()
    if department:
        extracted["department"] = department
        extracted["assignee_agent_id"] = get_agent_for_department(department)

    return {
        "extracted": extracted,
        "phase": "extract"
    }
