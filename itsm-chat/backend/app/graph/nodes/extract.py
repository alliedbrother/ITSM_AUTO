"""Extraction node - extracts issue details from conversation."""

from typing import Dict, Any
from ...schemas.state import ConversationState
from ...config.agents import get_agent_for_department
from ...services.llm import extract_issue_info


def extract_node(state: ConversationState) -> Dict[str, Any]:
    """Extract title, description, priority from the conversation."""
    messages = state.get("messages", [])
    if not messages:
        return {"phase": "clarify"}

    # Get LLM extraction
    extracted_data = extract_issue_info(messages)

    # Merge with existing extracted info
    extracted = state.get("extracted", {}).copy()

    if extracted_data.get("title"):
        extracted["title"] = extracted_data["title"]

    if extracted_data.get("description"):
        extracted["description"] = extracted_data["description"]

    if extracted_data.get("priority"):
        extracted["priority"] = extracted_data["priority"]

    # Update department if LLM found one and we don't have one
    if extracted_data.get("department") and not extracted.get("department"):
        extracted["department"] = extracted_data["department"]
        extracted["assignee_agent_id"] = get_agent_for_department(extracted_data["department"])

    return {
        "extracted": extracted,
        "phase": "clarify"  # Move to clarify to check for missing fields
    }
