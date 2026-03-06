"""Create node - creates the issue via Paperclip API."""

from typing import Dict, Any
from ...schemas.state import ConversationState, CreatedIssue
from ...services.paperclip import create_issue, get_issue_url


async def create_node(state: ConversationState) -> Dict[str, Any]:
    """Create the issue in Paperclip."""
    extracted = state.get("extracted", {})
    company_id = state.get("company_id", "")
    messages = state.get("messages", [])

    try:
        # Create the issue
        issue_data = await create_issue(
            company_id=company_id,
            title=extracted.get("title", "Untitled Issue"),
            description=extracted.get("description"),
            priority=extracted.get("priority", "medium"),
            assignee_agent_id=extracted.get("assignee_agent_id")
        )

        # Build success response
        created_issue = CreatedIssue(
            id=issue_data["id"],
            identifier=issue_data["identifier"],
            title=issue_data["title"],
            url=get_issue_url(issue_data["identifier"])
        )

        success_msg = f"""Your issue has been created successfully.

**Issue ID:** {created_issue.identifier}
**Title:** {created_issue.title}

You can track it here: {created_issue.url}

Is there anything else I can help you with?"""

        new_messages = messages.copy()
        new_messages.append({
            "role": "assistant",
            "content": success_msg
        })

        return {
            "messages": new_messages,
            "created_issue": created_issue.model_dump(),
            "phase": "done"
        }

    except Exception as e:
        error_msg = f"I encountered an error creating the issue: {str(e)}. Please try again or contact support."

        new_messages = messages.copy()
        new_messages.append({
            "role": "assistant",
            "content": error_msg
        })

        return {
            "messages": new_messages,
            "error": str(e),
            "phase": "error"
        }
