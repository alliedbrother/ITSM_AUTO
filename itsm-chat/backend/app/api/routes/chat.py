"""Chat API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ...schemas.state import ChatRequest, ChatResponse
from ...graph.workflow import process_message
from ...services.session import get_session, delete_session

router = APIRouter(prefix="/chat")


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest) -> ChatResponse:
    """Process a chat message and return the response.

    This is the main endpoint for the chat interface.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if not request.company_id:
        raise HTTPException(status_code=400, detail="company_id is required")

    try:
        response = await process_message(
            message=request.message,
            session_id=request.session_id,
            company_id=request.company_id
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
    state = get_session(session_id)
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
    deleted = delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"status": "deleted", "session_id": session_id}
