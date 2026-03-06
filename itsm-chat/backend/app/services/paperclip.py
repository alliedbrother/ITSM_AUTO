"""Paperclip API client service."""

from typing import Dict, Any, Optional, List
import httpx
from ..config.settings import get_settings

# Cache for agents and projects
_agents_cache: Optional[List[Dict[str, Any]]] = None
_projects_cache: Optional[List[Dict[str, Any]]] = None


async def get_agents(company_id: str) -> List[Dict[str, Any]]:
    """Fetch all agents for a company."""
    global _agents_cache
    if _agents_cache is not None:
        return _agents_cache

    settings = get_settings()
    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if settings.paperclip_api_token:
        headers["Authorization"] = f"Bearer {settings.paperclip_api_token}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.paperclip_api_url}/api/companies/{company_id}/agents",
            headers=headers,
            timeout=30.0
        )
        response.raise_for_status()
        _agents_cache = response.json()
        return _agents_cache


async def get_projects(company_id: str) -> List[Dict[str, Any]]:
    """Fetch all projects for a company."""
    global _projects_cache
    if _projects_cache is not None:
        return _projects_cache

    settings = get_settings()
    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if settings.paperclip_api_token:
        headers["Authorization"] = f"Bearer {settings.paperclip_api_token}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.paperclip_api_url}/api/companies/{company_id}/projects",
            headers=headers,
            timeout=30.0
        )
        response.raise_for_status()
        _projects_cache = response.json()
        return _projects_cache


def build_agents_context(agents: List[Dict[str, Any]]) -> str:
    """Build a context string describing all agents and their capabilities."""
    lines = ["AVAILABLE AGENTS:"]

    # Group by department (based on reportsTo hierarchy)
    vps = [a for a in agents if a.get("role") == "ceo" or (a.get("name", "").startswith("VP") or a.get("name") == "Chief Executive Officer")]

    for agent in agents:
        agent_id = agent.get("id", "")
        name = agent.get("name", "")
        title = agent.get("title", "")
        capabilities = agent.get("capabilities", "")

        lines.append(f"- {name} (ID: {agent_id})")
        lines.append(f"  Title: {title}")
        lines.append(f"  Capabilities: {capabilities}")

    return "\n".join(lines)


def build_projects_context(projects: List[Dict[str, Any]]) -> str:
    """Build a context string describing all projects."""
    lines = ["AVAILABLE PROJECTS:"]

    for project in projects:
        project_id = project.get("id", "")
        name = project.get("name", "")
        description = project.get("description", "")

        lines.append(f"- {name} (ID: {project_id})")
        lines.append(f"  Description: {description}")

    return "\n".join(lines)


async def create_issue(
    company_id: str,
    title: str,
    description: Optional[str] = None,
    priority: str = "medium",
    assignee_agent_id: Optional[str] = None,
    project_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create an issue via the Paperclip API.

    Args:
        company_id: The company UUID
        title: Issue title (required)
        description: Issue description (optional)
        priority: One of critical, high, medium, low
        assignee_agent_id: Agent UUID to assign
        project_id: Project UUID to assign

    Returns:
        The created issue data from the API
    """
    settings = get_settings()

    payload: Dict[str, Any] = {
        "title": title,
        "status": "todo",
        "priority": priority,
    }

    if description:
        payload["description"] = description

    if assignee_agent_id:
        payload["assigneeAgentId"] = assignee_agent_id

    if project_id:
        payload["projectId"] = project_id

    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if settings.paperclip_api_token:
        headers["Authorization"] = f"Bearer {settings.paperclip_api_token}"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.paperclip_api_url}/api/companies/{company_id}/issues",
            json=payload,
            headers=headers,
            timeout=30.0
        )
        response.raise_for_status()
        return response.json()


def get_issue_url(identifier: str) -> str:
    """Get the full URL for an issue."""
    settings = get_settings()
    return f"{settings.itsm_base_url}/issues/{identifier}"


def clear_cache():
    """Clear the agents and projects cache."""
    global _agents_cache, _projects_cache
    _agents_cache = None
    _projects_cache = None
