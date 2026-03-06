"""Claude API client service."""

import json
from typing import Optional, List, Dict, Any
from anthropic import Anthropic
from ..config.settings import get_settings


_client: Optional[Anthropic] = None


def get_client() -> Anthropic:
    """Get or create the Anthropic client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = Anthropic(api_key=settings.anthropic_api_key)
    return _client


def extract_issue_info(
    conversation_history: List[Dict[str, str]],
    agents_context: str = "",
    projects_context: str = ""
) -> Dict[str, Any]:
    """Extract issue information from conversation history.

    Returns a dict with: title, description, priority, assignee_agent_id, project_id
    """
    client = get_client()

    # Build conversation text
    conv_text = "\n".join(
        f"{msg['role'].upper()}: {msg['content']}"
        for msg in conversation_history
    )

    prompt = f"""You are an intelligent IT support ticket routing system. Analyze the conversation and extract issue information, then assign it to the most appropriate agent based on their capabilities.

{agents_context}

{projects_context}

CONVERSATION:
{conv_text}

Based on the conversation and available agents/projects, extract:
1. title: A concise title for the issue (max 100 chars)
2. description: A detailed description of the issue
3. priority: One of "critical", "high", "medium", "low" based on urgency/impact
4. assignee_agent_id: The UUID of the most appropriate agent to handle this issue (choose based on their capabilities)
5. project_id: The UUID of the relevant project (if applicable, otherwise null)

IMPORTANT ROUTING RULES:
- For security issues (breaches, threats, compliance): Assign to VP Security or Security Analyst
- For database issues (slow queries, backups, data): Assign to VP Database or Database Administrator
- For network/infrastructure issues (connectivity, servers, cloud): Assign to VP Networking or Network Engineer
- For HR issues (onboarding, employee matters, benefits): Assign to VP Human Resources or HR Coordinator
- For complex cross-department issues: Assign to CEO
- Prefer assigning to specialists for specific tasks, VPs for complex/escalated issues

Return ONLY valid JSON in this exact format:
{{"title": "...", "description": "...", "priority": "...", "assignee_agent_id": "uuid-here", "project_id": "uuid-or-null"}}"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )

    content = response.content[0].text.strip()

    # Parse JSON from response
    try:
        # Handle markdown code blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        return json.loads(content)
    except json.JSONDecodeError:
        return {"title": None, "description": None, "priority": None, "assignee_agent_id": None, "project_id": None}


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
