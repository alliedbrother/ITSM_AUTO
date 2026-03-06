"""Task-type aware workflow for issue creation with complete information gathering."""

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
from ..services.llm import extract_issue_info, generate_confirmation_message
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
    """Run the initial extract -> clarify flow with task-type awareness."""
    # Fetch agents and projects
    agents = await get_agents(company_id)
    projects = await get_projects(company_id)
    state["agents"] = agents
    state["projects"] = projects

    # Build context for LLM
    agents_context = build_agents_context(agents)
    projects_context = build_projects_context(projects)

    # Extract issue info with task-type awareness
    messages = state.get("messages", [])
    extracted_data = extract_issue_info(messages, agents_context, projects_context)

    # Store task type and extracted fields
    extracted = state.get("extracted", {}).copy()

    # Store task type for context
    if extracted_data.get("task_type"):
        extracted["task_type"] = extracted_data["task_type"]

    # Store all extracted fields from the task
    if extracted_data.get("extracted_fields"):
        extracted["task_fields"] = extracted_data["extracted_fields"]

    # Standard fields
    if extracted_data.get("title"):
        extracted["title"] = extracted_data["title"]
    if extracted_data.get("description"):
        extracted["description"] = extracted_data["description"]
    if extracted_data.get("priority"):
        extracted["priority"] = extracted_data["priority"]

    # Map agent/project IDs to names
    if extracted_data.get("assignee_agent_id"):
        agent_id = extracted_data["assignee_agent_id"]
        extracted["assignee_agent_id"] = agent_id
        agent = next((a for a in agents if a.get("id") == agent_id), None)
        if agent:
            extracted["assignee_agent_name"] = agent.get("name", "")

    if extracted_data.get("project_id"):
        project_id = extracted_data["project_id"]
        extracted["project_id"] = project_id
        project = next((p for p in projects if p.get("id") == project_id), None)
        if project:
            extracted["project_name"] = project.get("name", "")

    state["extracted"] = extracted

    # Check for missing required fields (task-type aware)
    missing_required = extracted_data.get("missing_required", [])
    missing_questions = extracted_data.get("missing_field_questions", {})
    ready_to_create = extracted_data.get("ready_to_create", False)

    # Also check basic required fields
    if not extracted.get("priority"):
        if "priority" not in missing_required:
            missing_required.append("priority")
            missing_questions["priority"] = "How urgent is this issue? (Critical, High, Medium, or Low)"

    if missing_required and not ready_to_create:
        # Build clarification message for ALL missing fields
        state = generate_clarification_for_missing(state, missing_required, missing_questions)
    else:
        # All required info gathered - move to confirm
        state["missing_fields"] = []
        state = generate_confirmation(state)

    return state


def generate_clarification_for_missing(
    state: ConversationState,
    missing_required: List[str],
    missing_questions: Dict[str, str]
) -> ConversationState:
    """Generate clarification message asking for ALL missing required fields."""
    messages = state.get("messages", [])
    extracted = state.get("extracted", {})

    # Build missing fields list for state
    missing_fields = []
    questions_list = []

    for field in missing_required:
        question = missing_questions.get(field, f"What is the {field.replace('_', ' ')}?")
        missing_fields.append({
            "field_name": field,
            "question": question,
            "options": None
        })
        questions_list.append(f"• {question}")

    # Build a comprehensive clarification message
    task_type = extracted.get("task_type", "general")

    if len(questions_list) == 1:
        clarification = f"Before I can create this ticket, I need one more piece of information:\n\n{questions_list[0]}"
    else:
        clarification = f"Before I can create this ticket, I need a few more details to ensure the assigned agent can complete this task:\n\n" + "\n".join(questions_list)

    new_messages = messages.copy()
    new_messages.append({"role": "assistant", "content": clarification})
    state["messages"] = new_messages
    state["missing_fields"] = missing_fields
    state["phase"] = "clarify"

    return state


def generate_confirmation(state: ConversationState) -> ConversationState:
    """Generate confirmation message with ALL extracted info including task-specific fields."""
    extracted = state.get("extracted", {})
    messages = state.get("messages", [])

    agent_name = extracted.get("assignee_agent_name", "")
    project_name = extracted.get("project_name", "")
    task_fields = extracted.get("task_fields", {})

    # Build enhanced description with all task fields
    description = extracted.get("description", "")
    if task_fields:
        field_details = "\n\n**Collected Information:**\n"
        for field, value in task_fields.items():
            field_label = field.replace("_", " ").title()
            field_details += f"• {field_label}: {value}\n"
        description = description + field_details
        extracted["description"] = description

    confirmation = generate_confirmation_message(extracted, agent_name, project_name)

    new_messages = messages.copy()
    new_messages.append({"role": "assistant", "content": confirmation})
    state["messages"] = new_messages
    state["phase"] = "confirm"

    return state


async def handle_clarification(state: ConversationState, user_input: str, company_id: str) -> ConversationState:
    """Handle user response during clarification phase - re-extract with new info."""
    extracted = state.get("extracted", {}).copy()

    # Check for priority in user input
    priority = parse_priority_from_input(user_input)
    if priority:
        extracted["priority"] = priority

    state["extracted"] = extracted

    # Re-run extraction with the complete conversation
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

    # Update with new extraction results
    if extracted_data.get("task_type"):
        extracted["task_type"] = extracted_data["task_type"]
    if extracted_data.get("extracted_fields"):
        # Merge new fields with existing
        existing_fields = extracted.get("task_fields", {})
        existing_fields.update(extracted_data["extracted_fields"])
        extracted["task_fields"] = existing_fields

    if extracted_data.get("title"):
        extracted["title"] = extracted_data["title"]
    if extracted_data.get("description"):
        extracted["description"] = extracted_data["description"]
    if extracted_data.get("priority") and not extracted.get("priority"):
        extracted["priority"] = extracted_data["priority"]

    if extracted_data.get("assignee_agent_id"):
        agent_id = extracted_data["assignee_agent_id"]
        extracted["assignee_agent_id"] = agent_id
        agent = next((a for a in agents if a.get("id") == agent_id), None)
        if agent:
            extracted["assignee_agent_name"] = agent.get("name", "")

    if extracted_data.get("project_id"):
        project_id = extracted_data["project_id"]
        extracted["project_id"] = project_id
        project = next((p for p in projects if p.get("id") == project_id), None)
        if project:
            extracted["project_name"] = project.get("name", "")

    state["extracted"] = extracted

    # Check if we still have missing required fields
    missing_required = extracted_data.get("missing_required", [])
    missing_questions = extracted_data.get("missing_field_questions", {})
    ready_to_create = extracted_data.get("ready_to_create", False)

    # Check basic required fields
    if not extracted.get("priority"):
        if "priority" not in missing_required:
            missing_required.append("priority")
            missing_questions["priority"] = "How urgent is this issue? (Critical, High, Medium, or Low)"
        ready_to_create = False

    if missing_required and not ready_to_create:
        state = generate_clarification_for_missing(state, missing_required, missing_questions)
    else:
        state["missing_fields"] = []
        state = generate_confirmation(state)

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
