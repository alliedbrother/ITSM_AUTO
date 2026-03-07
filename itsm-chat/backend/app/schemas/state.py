"""LangGraph state schema definitions."""

from typing import TypedDict, Literal, Optional, List, Any
from pydantic import BaseModel, Field
import uuid


# Valid phases in the conversation flow
Phase = Literal["classify", "extract", "clarify", "confirm", "create", "done", "error"]

# Valid priorities
Priority = Literal["critical", "high", "medium", "low"]


class Message(BaseModel):
    """A single message in the conversation."""
    role: Literal["user", "assistant"]
    content: str


class ExtractedInfo(BaseModel):
    """Information extracted from the conversation."""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Priority] = None
    assignee_agent_id: Optional[str] = None
    assignee_agent_name: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None


class MissingField(BaseModel):
    """A field that needs clarification from the user."""
    field_name: str
    question: str
    options: Optional[List[str]] = None


class CreatedIssue(BaseModel):
    """Details of a successfully created issue."""
    id: str
    identifier: str
    title: str
    url: str


class ConversationState(TypedDict, total=False):
    """The state of a conversation in the LangGraph workflow."""
    session_id: str
    user_id: Optional[str]  # UUID of authenticated user (None for unauthenticated)
    messages: List[dict]  # List of Message dicts
    phase: Phase
    extracted: dict  # ExtractedInfo as dict
    missing_fields: List[dict]  # List of MissingField dicts
    created_issue: Optional[dict]  # CreatedIssue as dict
    error: Optional[str]
    company_id: str
    agents: List[dict]  # Cached agents
    projects: List[dict]  # Cached projects


def create_initial_state(company_id: str, user_id: Optional[str] = None) -> ConversationState:
    """Create a new conversation state."""
    return ConversationState(
        session_id=str(uuid.uuid4()),
        user_id=user_id,
        messages=[],
        phase="classify",
        extracted={},
        missing_fields=[],
        created_issue=None,
        error=None,
        company_id=company_id,
        agents=[],
        projects=[]
    )


# API Request/Response models

class ChatRequest(BaseModel):
    """Request body for chat message endpoint."""
    message: str
    session_id: Optional[str] = None
    company_id: Optional[str] = None  # Optional if authenticated (uses user's company)


class QuickReply(BaseModel):
    """A quick reply option for the user."""
    label: str
    value: str


class ChatResponse(BaseModel):
    """Response from chat message endpoint."""
    session_id: str
    message: str
    phase: Phase
    quick_replies: List[QuickReply] = Field(default_factory=list)
    extracted: Optional[ExtractedInfo] = None
    created_issue: Optional[CreatedIssue] = None
    error: Optional[str] = None
