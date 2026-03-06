"""Simple state machine workflow for issue creation."""

from typing import Optional, List, Dict, Any

from ..schemas.state import (
    ConversationState, ChatResponse, QuickReply,
    ExtractedInfo, CreatedIssue
)
from ..services.session import get_or_create_session, save_session
from ..services.paperclip import (
    get_agents, get_projects, build_agents_context, build_projects_context,
    create_issue, get_issue_url
)
from ..services.llm import extract_issue_info, generate_clarification, generate_confirmation_message
from .edges import should_create_issue, should_modify_issue, parse_priority_from_input


async def process_message(
    message: str,
    session_id: Optional[str],
    company_id: str
) -> ChatResponse:
    """Process a user message through the conversation flow.

    This is the main entry point for handling chat messages.
    """
    # Get or create session
    state = get_or_create_session(session_id, company_id)

    # Add user message
    messages = state.get("messages", []).copy()
    messages.append({"role": "user", "content": message})
    state["messages"] = messages

    current_phase = state.get("phase", "classify")

    # Handle based on current phase
    if current_phase == "classify":
        # Initial message - run through classify -> extract -> clarify
        state = await run_initial_flow(state, company_id)

    elif current_phase == "clarify":
        # User is providing clarification
        state = await handle_clarification(state, message, company_id)

    elif current_phase == "confirm":
        # User is responding to confirmation
        state = await handle_confirmation(state, message, company_id)

    elif current_phase in ["done", "error"]:
        # Start a new conversation
        state = get_or_create_session(None, company_id)
        messages = [{"role": "user", "content": message}]
        state["messages"] = messages
        state = await run_initial_flow(state, company_id)

    # Save updated state
    save_session(state)

    # Build response
    return build_response(state)


async def run_initial_flow(state: ConversationState, company_id: str) -> ConversationState:
    """Run the initial extract -> clarify flow with real agent data."""
    # Fetch agents and projects
    agents = await get_agents(company_id)
    projects = await get_projects(company_id)
    state["agents"] = agents
    state["projects"] = projects

    # Build context for LLM
    agents_context = build_agents_context(agents)
    projects_context = build_projects_context(projects)

    # Extract issue info with agent context
    messages = state.get("messages", [])
    extracted_data = extract_issue_info(messages, agents_context, projects_context)

    # Map agent/project IDs to names
    extracted = state.get("extracted", {}).copy()
    if extracted_data.get("title"):
        extracted["title"] = extracted_data["title"]
    if extracted_data.get("description"):
        extracted["description"] = extracted_data["description"]
    if extracted_data.get("priority"):
        extracted["priority"] = extracted_data["priority"]
    if extracted_data.get("assignee_agent_id"):
        agent_id = extracted_data["assignee_agent_id"]
        extracted["assignee_agent_id"] = agent_id
        # Find agent name
        agent = next((a for a in agents if a.get("id") == agent_id), None)
        if agent:
            extracted["assignee_agent_name"] = agent.get("name", "")
    if extracted_data.get("project_id"):
        project_id = extracted_data["project_id"]
        extracted["project_id"] = project_id
        # Find project name
        project = next((p for p in projects if p.get("id") == project_id), None)
        if project:
            extracted["project_name"] = project.get("name", "")

    state["extracted"] = extracted

    # Check for missing required fields
    state = check_missing_fields(state)

    return state


def check_missing_fields(state: ConversationState) -> ConversationState:
    """Check for missing fields and update state accordingly."""
    extracted = state.get("extracted", {})
    missing = []

    if not extracted.get("title"):
        missing.append({
            "field_name": "title",
            "question": "Could you briefly describe the issue you're experiencing?",
            "options": None
        })

    if not extracted.get("priority"):
        missing.append({
            "field_name": "priority",
            "question": "How urgent is this issue?",
            "options": ["Critical - System down", "High - Major impact", "Medium - Some impact", "Low - Minor issue"]
        })

    if missing:
        # Generate clarification message
        missing_names = [m["field_name"] for m in missing]
        messages = state.get("messages", [])
        clarification = generate_clarification(missing_names, extracted, messages)

        new_messages = messages.copy()
        new_messages.append({"role": "assistant", "content": clarification})
        state["messages"] = new_messages
        state["missing_fields"] = missing
        state["phase"] = "clarify"
    else:
        # Move to confirm
        state["missing_fields"] = []
        state = generate_confirmation(state)

    return state


def generate_confirmation(state: ConversationState) -> ConversationState:
    """Generate confirmation message with extracted info."""
    extracted = state.get("extracted", {})
    messages = state.get("messages", [])

    agent_name = extracted.get("assignee_agent_name", "")
    project_name = extracted.get("project_name", "")

    confirmation = generate_confirmation_message(extracted, agent_name, project_name)

    new_messages = messages.copy()
    new_messages.append({"role": "assistant", "content": confirmation})
    state["messages"] = new_messages
    state["phase"] = "confirm"

    return state


async def handle_clarification(state: ConversationState, user_input: str, company_id: str) -> ConversationState:
    """Handle user response during clarification phase."""
    extracted = state.get("extracted", {}).copy()
    missing_fields = state.get("missing_fields", [])

    # Try to extract information from user input
    if missing_fields:
        first_missing = missing_fields[0].get("field_name") if missing_fields else None

        if first_missing == "priority":
            priority = parse_priority_from_input(user_input)
            if priority:
                extracted["priority"] = priority

        elif first_missing == "title":
            # Use the input as title if it's reasonable
            if len(user_input) >= 5:
                extracted["title"] = user_input[:100]

    state["extracted"] = extracted

    # Re-run extraction with updated context
    agents = state.get("agents", [])
    projects = state.get("projects", [])

    if not agents:
        agents = await get_agents(company_id)
        projects = await get_projects(company_id)
        state["agents"] = agents
        state["projects"] = projects

    agents_context = build_agents_context(agents)
    projects_context = build_projects_context(projects)

    messages = state.get("messages", [])
    extracted_data = extract_issue_info(messages, agents_context, projects_context)

    # Merge new extraction
    if extracted_data.get("title") and not extracted.get("title"):
        extracted["title"] = extracted_data["title"]
    if extracted_data.get("description"):
        extracted["description"] = extracted_data["description"]
    if extracted_data.get("priority") and not extracted.get("priority"):
        extracted["priority"] = extracted_data["priority"]
    if extracted_data.get("assignee_agent_id") and not extracted.get("assignee_agent_id"):
        agent_id = extracted_data["assignee_agent_id"]
        extracted["assignee_agent_id"] = agent_id
        agent = next((a for a in agents if a.get("id") == agent_id), None)
        if agent:
            extracted["assignee_agent_name"] = agent.get("name", "")

    state["extracted"] = extracted

    # Check if we still have missing fields
    state = check_missing_fields(state)

    return state


async def handle_confirmation(state: ConversationState, user_input: str, company_id: str) -> ConversationState:
    """Handle user response during confirmation phase."""
    messages = state.get("messages", [])
    extracted = state.get("extracted", {})

    if should_create_issue(user_input):
        # User confirmed - create the issue
        try:
            issue_data = await create_issue(
                company_id=company_id,
                title=extracted.get("title", "Untitled Issue"),
                description=extracted.get("description"),
                priority=extracted.get("priority", "medium"),
                assignee_agent_id=extracted.get("assignee_agent_id"),
                project_id=extracted.get("project_id")
            )

            created_issue = CreatedIssue(
                id=issue_data["id"],
                identifier=issue_data["identifier"],
                title=issue_data["title"],
                url=get_issue_url(issue_data["identifier"])
            )

            agent_name = extracted.get("assignee_agent_name", "the team")
            success_msg = f"""Your issue has been created successfully!

**Issue ID:** {created_issue.identifier}
**Title:** {created_issue.title}
**Assigned to:** {agent_name}

You can track it here: {created_issue.url}

Is there anything else I can help you with?"""

            new_messages = messages.copy()
            new_messages.append({"role": "assistant", "content": success_msg})
            state["messages"] = new_messages
            state["created_issue"] = created_issue.model_dump()
            state["phase"] = "done"

        except Exception as e:
            error_msg = f"I encountered an error creating the issue: {str(e)}. Please try again or contact support."
            new_messages = messages.copy()
            new_messages.append({"role": "assistant", "content": error_msg})
            state["messages"] = new_messages
            state["error"] = str(e)
            state["phase"] = "error"

    elif should_modify_issue(user_input):
        # User wants to modify - go back to clarify
        state["phase"] = "clarify"
        state["missing_fields"] = []

        new_messages = messages.copy()
        new_messages.append({
            "role": "assistant",
            "content": "Sure, what would you like to change?"
        })
        state["messages"] = new_messages

    else:
        # Unclear response - ask again
        new_messages = messages.copy()
        new_messages.append({
            "role": "assistant",
            "content": "I didn't quite understand. Would you like me to create this issue? Just say 'yes' to confirm or let me know what you'd like to change."
        })
        state["messages"] = new_messages

    return state


def build_response(state: ConversationState) -> ChatResponse:
    """Build the API response from the current state."""
    messages = state.get("messages", [])
    phase = state.get("phase", "classify")
    extracted = state.get("extracted", {})
    missing_fields = state.get("missing_fields", [])

    # Get the last assistant message
    assistant_messages = [m for m in messages if m["role"] == "assistant"]
    last_message = assistant_messages[-1]["content"] if assistant_messages else "How can I help you today?"

    # Build quick replies based on phase
    quick_replies: List[QuickReply] = []

    if phase == "clarify" and missing_fields:
        first_missing = missing_fields[0] if missing_fields else {}
        if first_missing.get("field_name") == "priority":
            quick_replies = [
                QuickReply(label="Critical", value="critical"),
                QuickReply(label="High", value="high"),
                QuickReply(label="Medium", value="medium"),
                QuickReply(label="Low", value="low"),
            ]

    elif phase == "confirm":
        quick_replies = [
            QuickReply(label="Yes, create it", value="yes"),
            QuickReply(label="Make changes", value="change"),
        ]

    # Build extracted info
    extracted_info = ExtractedInfo(
        title=extracted.get("title"),
        description=extracted.get("description"),
        priority=extracted.get("priority"),
        assignee_agent_id=extracted.get("assignee_agent_id"),
        assignee_agent_name=extracted.get("assignee_agent_name"),
        project_id=extracted.get("project_id"),
        project_name=extracted.get("project_name")
    ) if extracted else None

    # Build created issue if present
    created_issue_data = state.get("created_issue")
    created_issue = CreatedIssue(**created_issue_data) if created_issue_data else None

    return ChatResponse(
        session_id=state["session_id"],
        message=last_message,
        phase=phase,
        quick_replies=quick_replies,
        extracted=extracted_info,
        created_issue=created_issue,
        error=state.get("error")
    )
