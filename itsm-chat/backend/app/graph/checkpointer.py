"""PostgreSQL checkpointer for LangGraph session persistence."""

from typing import Optional
import asyncio

from ..config.settings import get_settings

# Global checkpointer instance
_checkpointer = None
_checkpointer_lock = asyncio.Lock()


async def get_checkpointer():
    """Get or create the PostgreSQL checkpointer.

    Returns:
        AsyncPostgresSaver instance for LangGraph persistence
    """
    global _checkpointer

    async with _checkpointer_lock:
        if _checkpointer is None:
            try:
                from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

                settings = get_settings()

                # Convert asyncpg URL to psycopg format for langgraph
                # langgraph-checkpoint-postgres uses psycopg, not asyncpg
                db_url = settings.database_url.replace(
                    "postgresql+asyncpg://",
                    "postgresql://"
                )

                _checkpointer = AsyncPostgresSaver.from_conn_string(db_url)
                await _checkpointer.setup()  # Creates required tables

            except ImportError:
                # Fallback to in-memory if langgraph-checkpoint-postgres not installed
                from langgraph.checkpoint.memory import MemorySaver
                _checkpointer = MemorySaver()

    return _checkpointer


def generate_thread_id(user_id: Optional[str], session_id: str) -> str:
    """Generate a thread ID for LangGraph checkpointer.

    Args:
        user_id: UUID of authenticated user (None for unauthenticated)
        session_id: Session/conversation ID

    Returns:
        Thread ID string for checkpointer
    """
    if user_id:
        return f"user_{user_id}_conv_{session_id}"
    else:
        return f"anon_conv_{session_id}"


def get_thread_config(user_id: Optional[str], session_id: str) -> dict:
    """Get the configuration dict for LangGraph with thread ID.

    Args:
        user_id: UUID of authenticated user (None for unauthenticated)
        session_id: Session/conversation ID

    Returns:
        Config dict with thread_id for checkpointer
    """
    return {
        "configurable": {
            "thread_id": generate_thread_id(user_id, session_id),
            "checkpoint_ns": "itsm_chat"
        }
    }


async def close_checkpointer():
    """Close the checkpointer connection."""
    global _checkpointer
    if _checkpointer is not None:
        try:
            # AsyncPostgresSaver may have a close method
            if hasattr(_checkpointer, 'conn') and _checkpointer.conn:
                await _checkpointer.conn.close()
        except Exception:
            pass
        _checkpointer = None
