"""Session management service with PostgreSQL persistence."""

import json
from typing import Optional
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..schemas.state import ConversationState, create_initial_state
from ..config.database import get_db_context


async def get_session(session_id: str) -> Optional[ConversationState]:
    """Get a session by ID from PostgreSQL.

    Args:
        session_id: The session UUID

    Returns:
        ConversationState if found, None otherwise
    """
    try:
        async with get_db_context() as db:
            result = await db.execute(
                text("SELECT state_data FROM chat_sessions WHERE session_id = :session_id"),
                {"session_id": session_id}
            )
            row = result.fetchone()
            if row:
                state_data = row[0]
                # JSONB returns dict directly, JSON returns string
                if isinstance(state_data, str):
                    return json.loads(state_data)
                return state_data
            return None
    except Exception as e:
        print(f"Error getting session {session_id}: {e}")
        return None


async def save_session(state: ConversationState) -> None:
    """Save a session state to PostgreSQL.

    Args:
        state: The conversation state to save
    """
    try:
        async with get_db_context() as db:
            # Ensure table exists
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    session_id VARCHAR(255) PRIMARY KEY,
                    user_id VARCHAR(255),
                    company_id VARCHAR(255) NOT NULL,
                    state_data JSONB NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))

            # Create index on user_id if not exists
            await db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
                ON chat_sessions(user_id)
            """))

            # Upsert the session
            await db.execute(
                text("""
                    INSERT INTO chat_sessions (session_id, user_id, company_id, state_data, updated_at)
                    VALUES (:session_id, :user_id, :company_id, :state_data, :updated_at)
                    ON CONFLICT (session_id) DO UPDATE SET
                        state_data = EXCLUDED.state_data,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "session_id": state["session_id"],
                    "user_id": state.get("user_id"),
                    "company_id": state["company_id"],
                    "state_data": json.dumps(state),
                    "updated_at": datetime.now(timezone.utc)
                }
            )
            await db.commit()
    except Exception as e:
        # Log error but don't fail - fall back to returning state as-is
        print(f"Error saving session: {e}")


async def create_session(company_id: str, user_id: Optional[str] = None) -> ConversationState:
    """Create a new session.

    Args:
        company_id: Company ID for the session
        user_id: Optional user ID for authenticated users

    Returns:
        New conversation state
    """
    state = create_initial_state(company_id, user_id)
    await save_session(state)
    return state


async def delete_session(session_id: str) -> bool:
    """Delete a session.

    Args:
        session_id: The session ID to delete

    Returns:
        True if session was deleted, False otherwise
    """
    try:
        async with get_db_context() as db:
            result = await db.execute(
                text("DELETE FROM chat_sessions WHERE session_id = :session_id"),
                {"session_id": session_id}
            )
            await db.commit()
            return result.rowcount > 0
    except Exception:
        return False


async def get_or_create_session(
    session_id: Optional[str],
    company_id: str,
    user_id: Optional[str] = None
) -> ConversationState:
    """Get an existing session or create a new one.

    Args:
        session_id: Optional session ID to retrieve
        company_id: Company ID for new sessions
        user_id: Optional user ID for authenticated users

    Returns:
        Existing or new conversation state
    """
    if session_id:
        existing = await get_session(session_id)
        if existing:
            # Update user_id if provided and not already set
            if user_id and not existing.get("user_id"):
                existing["user_id"] = user_id
            return existing

    return await create_session(company_id, user_id)


async def get_user_conversations(
    user_id: str,
    limit: int = 20,
    offset: int = 0
) -> list[dict]:
    """Get all conversations for a user.

    Args:
        user_id: The user ID
        limit: Maximum number of conversations to return
        offset: Number of conversations to skip

    Returns:
        List of conversation summaries
    """
    try:
        async with get_db_context() as db:
            result = await db.execute(
                text("""
                    SELECT session_id, state_data, created_at, updated_at
                    FROM chat_sessions
                    WHERE user_id = :user_id
                    ORDER BY updated_at DESC
                    LIMIT :limit OFFSET :offset
                """),
                {"user_id": user_id, "limit": limit, "offset": offset}
            )
            rows = result.fetchall()

            conversations = []
            for row in rows:
                state_data = row[1]
                # JSONB returns dict directly, JSON returns string
                state = json.loads(state_data) if isinstance(state_data, str) else state_data
                messages = state.get("messages", [])

                # Get first user message as preview
                first_user_msg = next(
                    (m["content"] for m in messages if m.get("role") == "user"),
                    "New conversation"
                )

                conversations.append({
                    "session_id": row[0],
                    "preview": first_user_msg[:100] + "..." if len(first_user_msg) > 100 else first_user_msg,
                    "message_count": len(messages),
                    "phase": state.get("phase", "classify"),
                    "created_at": row[2].isoformat() if row[2] else None,
                    "updated_at": row[3].isoformat() if row[3] else None,
                    "has_created_issue": state.get("created_issue") is not None
                })

            return conversations
    except Exception as e:
        print(f"Error getting user conversations: {e}")
        return []
