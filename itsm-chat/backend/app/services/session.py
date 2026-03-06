"""Session management service using in-memory storage."""

from typing import Dict, Optional
from ..schemas.state import ConversationState, create_initial_state


# In-memory session store
# In production, this should be Redis or another persistent store
_sessions: Dict[str, ConversationState] = {}


def get_session(session_id: str) -> Optional[ConversationState]:
    """Get a session by ID."""
    return _sessions.get(session_id)


def save_session(state: ConversationState) -> None:
    """Save a session state."""
    _sessions[state["session_id"]] = state


def create_session(company_id: str) -> ConversationState:
    """Create a new session."""
    state = create_initial_state(company_id)
    save_session(state)
    return state


def delete_session(session_id: str) -> bool:
    """Delete a session. Returns True if session existed."""
    if session_id in _sessions:
        del _sessions[session_id]
        return True
    return False


def get_or_create_session(session_id: Optional[str], company_id: str) -> ConversationState:
    """Get an existing session or create a new one."""
    if session_id:
        existing = get_session(session_id)
        if existing:
            return existing

    return create_session(company_id)
