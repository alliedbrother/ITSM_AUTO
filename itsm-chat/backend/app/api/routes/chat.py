"""Chat API endpoints."""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List

from ...schemas.state import ChatRequest, ChatResponse
from ...graph.workflow import process_message
from ...services.session import get_session, delete_session, get_user_conversations
from ...middleware.auth import get_current_user_optional
from ...models.user import User
from ...config.settings import get_settings

router = APIRouter(prefix="/chat")


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> ChatResponse:
    """Process a chat message and return the response.

    This is the main endpoint for the chat interface.
    Supports both authenticated and unauthenticated users.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Determine company_id and user_id
    settings = get_settings()

    if current_user:
        # Authenticated user - use their company_id
        company_id = str(current_user.company_id)
        user_id = str(current_user.id)
    else:
        # Unauthenticated user - require company_id in request
        if not request.company_id:
            raise HTTPException(status_code=400, detail="company_id is required for unauthenticated users")
        company_id = request.company_id
        user_id = None

    try:
        response = await process_message(
            message=request.message,
            session_id=request.session_id,
            company_id=company_id,
            user_id=user_id
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SessionResponse(BaseModel):
    """Response for session endpoint."""
    session_id: str
    phase: str
    message_count: int


@router.get("/session/{session_id}", response_model=SessionResponse)
async def get_session_status(session_id: str) -> SessionResponse:
    """Get the current state of a session."""
    state = await get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse(
        session_id=state["session_id"],
        phase=state.get("phase", "unknown"),
        message_count=len(state.get("messages", []))
    )


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Delete a session."""
    deleted = await delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"status": "deleted", "session_id": session_id}


class ConversationSummary(BaseModel):
    """Summary of a conversation for listing."""
    session_id: str
    preview: str
    message_count: int
    phase: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    has_created_issue: bool = False


class ConversationsResponse(BaseModel):
    """Response for conversations list."""
    conversations: List[ConversationSummary]
    total: int


@router.get("/conversations", response_model=ConversationsResponse)
async def list_conversations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user_optional)
):
    """List all conversations for the authenticated user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    offset = (page - 1) * per_page
    conversations = await get_user_conversations(
        user_id=str(current_user.id),
        limit=per_page,
        offset=offset
    )

    return ConversationsResponse(
        conversations=[ConversationSummary(**c) for c in conversations],
        total=len(conversations)  # TODO: Get actual total count
    )


@router.get("/conversations/{session_id}")
async def get_conversation(
    session_id: str,
    current_user: User = Depends(get_current_user_optional)
):
    """Get full conversation history."""
    state = await get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check ownership if authenticated
    if current_user and state.get("user_id") and state.get("user_id") != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view this conversation")

    return {
        "session_id": state["session_id"],
        "messages": state.get("messages", []),
        "phase": state.get("phase", "classify"),
        "extracted": state.get("extracted"),
        "created_issue": state.get("created_issue"),
        "error": state.get("error")
    }
