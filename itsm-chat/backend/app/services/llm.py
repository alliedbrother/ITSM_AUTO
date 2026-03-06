"""Claude API client service with task-type aware information gathering."""

import json
from typing import Optional, List, Dict, Any
from anthropic import Anthropic
from ..config.settings import get_settings


_client: Optional[Anthropic] = None


# Task types and their required fields for the executing agent
TASK_TYPE_REQUIREMENTS = {
    "email_send": {
        "name": "Send Email",
        "required_fields": ["recipient_name", "recipient_email", "email_purpose"],
        "optional_fields": ["email_content", "attachments"],
        "field_descriptions": {
            "recipient_name": "Full name of the email recipient",
            "recipient_email": "Email address of the recipient",
            "email_purpose": "Purpose/type of email (welcome, birthday, announcement, etc.)",
            "email_content": "Specific content or message to include",
            "attachments": "Any attachments needed"
        }
    },
    "employee_onboarding": {
        "name": "Employee Onboarding",
        "required_fields": ["employee_name", "start_date", "department"],
        "optional_fields": ["manager_name", "role_title", "equipment_needed"],
        "field_descriptions": {
            "employee_name": "Full name of the new employee",
            "start_date": "When the employee starts",
            "department": "Which department they're joining",
            "manager_name": "Their direct manager",
            "role_title": "Job title/role",
            "equipment_needed": "Laptop, phone, etc."
        }
    },
    "database_issue": {
        "name": "Database Issue",
        "required_fields": ["issue_description", "affected_system"],
        "optional_fields": ["error_messages", "when_started", "impact_scope"],
        "field_descriptions": {
            "issue_description": "What is the database problem",
            "affected_system": "Which database/system is affected",
            "error_messages": "Any error messages seen",
            "when_started": "When did this issue start",
            "impact_scope": "How many users/services affected"
        }
    },
    "security_incident": {
        "name": "Security Incident",
        "required_fields": ["incident_type", "affected_systems", "when_discovered"],
        "optional_fields": ["suspected_source", "data_compromised", "actions_taken"],
        "field_descriptions": {
            "incident_type": "Type of security issue (breach, suspicious activity, etc.)",
            "affected_systems": "Which systems are affected",
            "when_discovered": "When was this discovered",
            "suspected_source": "Suspected source/cause",
            "data_compromised": "Any data potentially compromised",
            "actions_taken": "Immediate actions already taken"
        }
    },
    "network_issue": {
        "name": "Network/Infrastructure Issue",
        "required_fields": ["issue_description", "affected_area"],
        "optional_fields": ["error_messages", "when_started", "users_affected"],
        "field_descriptions": {
            "issue_description": "What is the network problem",
            "affected_area": "Which office/location/service affected",
            "error_messages": "Any error messages",
            "when_started": "When did this start",
            "users_affected": "How many users affected"
        }
    },
    "service_request": {
        "name": "General Service Request",
        "required_fields": ["request_description"],
        "optional_fields": ["requester_name", "deadline", "additional_context"],
        "field_descriptions": {
            "request_description": "What is being requested",
            "requester_name": "Who is making the request",
            "deadline": "When is this needed by",
            "additional_context": "Any additional context"
        }
    },
    "general": {
        "name": "General Issue",
        "required_fields": ["issue_description"],
        "optional_fields": ["priority_reason"],
        "field_descriptions": {
            "issue_description": "Description of the issue or request",
            "priority_reason": "Why this priority level"
        }
    }
}


def get_client() -> Anthropic:
    """Get or create the Anthropic client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = Anthropic(api_key=settings.anthropic_api_key)
    return _client


def classify_and_extract(
    conversation_history: List[Dict[str, str]],
    agents_context: str = "",
    projects_context: str = ""
) -> Dict[str, Any]:
    """Classify task type, extract info, and identify missing required fields.

    Returns a dict with:
    - task_type: The classified task type
    - extracted_fields: Fields extracted from conversation
    - missing_required: List of required fields still missing
    - title, description, priority, assignee_agent_id, project_id
    - ready_to_create: Boolean indicating if we have all required info
    """
    client = get_client()

    conv_text = "\n".join(
        f"{msg['role'].upper()}: {msg['content']}"
        for msg in conversation_history
    )

    # Build task type descriptions for the prompt
    task_types_desc = "\n".join([
        f"- {key}: {info['name']} (Required: {', '.join(info['required_fields'])})"
        for key, info in TASK_TYPE_REQUIREMENTS.items()
    ])

    prompt = f"""You are an intelligent IT support system. Analyze this conversation to:
1. Classify the task type
2. Extract ALL available information
3. Identify what required information is MISSING

{agents_context}

{projects_context}

AVAILABLE TASK TYPES:
{task_types_desc}

CONVERSATION:
{conv_text}

IMPORTANT: For each task type, certain information is REQUIRED before we can create a ticket.
The executing agent CANNOT complete the task without this information.

Examples of what to check:
- "Send birthday email to john@email.com" -> MISSING: recipient's full name
- "Onboard new employee" -> MISSING: employee name, start date, department
- "Database is slow" -> Need: which system/database is affected
- "Security breach detected" -> Need: what systems, when discovered

Analyze and return JSON:
{{
    "task_type": "one of: email_send, employee_onboarding, database_issue, security_incident, network_issue, service_request, general",
    "title": "concise issue title",
    "description": "detailed description with ALL info we have",
    "priority": "critical/high/medium/low",
    "assignee_agent_id": "UUID of best agent or null",
    "project_id": "UUID of project or null",
    "extracted_fields": {{
        "field_name": "value extracted from conversation"
    }},
    "missing_required": ["list", "of", "missing", "required", "field", "names"],
    "missing_field_questions": {{
        "field_name": "Natural question to ask for this field"
    }}
}}

Be thorough - identify ALL missing required fields based on the task type.
Return ONLY valid JSON."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}]
    )

    content = response.content[0].text.strip()

    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        result = json.loads(content)

        # Determine if ready to create
        missing = result.get("missing_required", [])
        result["ready_to_create"] = len(missing) == 0

        return result
    except json.JSONDecodeError:
        return {
            "task_type": "general",
            "title": None,
            "description": None,
            "priority": None,
            "assignee_agent_id": None,
            "project_id": None,
            "extracted_fields": {},
            "missing_required": ["issue_description"],
            "missing_field_questions": {},
            "ready_to_create": False
        }


def extract_issue_info(
    conversation_history: List[Dict[str, str]],
    agents_context: str = "",
    projects_context: str = ""
) -> Dict[str, Any]:
    """Extract issue information from conversation history.

    This is a wrapper that calls classify_and_extract for backwards compatibility.
    Returns a dict with: title, description, priority, assignee_agent_id, project_id,
    plus task_type, missing_required, ready_to_create
    """
    return classify_and_extract(conversation_history, agents_context, projects_context)


def generate_clarification(
    missing_fields: List[str],
    extracted_info: Dict[str, Any],
    conversation_history: List[Dict[str, str]]
) -> str:
    """Generate a natural clarifying question for missing information."""
    client = get_client()

    # Build context
    extracted_text = ", ".join(
        f"{k}: {v}" for k, v in extracted_info.items() if v
    ) or "Nothing extracted yet"

    prompt = f"""You are a helpful IT support assistant. Generate a friendly clarifying question.

CONTEXT:
- Extracted so far: {extracted_text}
- Missing: {', '.join(missing_fields)}

Generate a single, natural question to get the missing information.
Be conversational and helpful. If priority is missing, offer options.
Keep it brief (1-2 sentences max)."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=150,
        messages=[{"role": "user", "content": prompt}]
    )

    return response.content[0].text.strip()


def generate_confirmation_message(extracted_info: Dict[str, Any], agent_name: str = "", project_name: str = "") -> str:
    """Generate a confirmation message summarizing the issue."""
    client = get_client()

    prompt = f"""Generate a brief confirmation message for this IT issue:

Title: {extracted_info.get('title', 'N/A')}
Description: {extracted_info.get('description', 'N/A')}
Priority: {extracted_info.get('priority', 'N/A')}
Assigned To: {agent_name or 'Auto-assign'}
Project: {project_name or 'N/A'}

Format as a friendly summary asking for confirmation.
Keep it brief (2-3 sentences). End with asking if this looks correct."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )

    return response.content[0].text.strip()
