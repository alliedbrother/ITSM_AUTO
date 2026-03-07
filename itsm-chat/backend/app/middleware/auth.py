"""JWT authentication middleware."""

from typing import Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status, WebSocket, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from ..config.database import get_db
from ..services.auth import decode_token, get_user_by_id
from ..models.user import User


# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token.

    Raises:
        HTTPException: If token is missing, invalid, or user not found
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if payload.type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        user_id = UUID(payload.sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = await get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get the current user if authenticated, None otherwise.

    This is useful for endpoints that work both authenticated and unauthenticated.
    """
    if not credentials:
        return None

    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.type != "access":
        return None

    try:
        user_id = UUID(payload.sub)
    except ValueError:
        return None

    return await get_user_by_id(db, user_id)


async def get_current_user_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get the current authenticated user for WebSocket connections.

    Token is passed as a query parameter since WebSocket doesn't support headers well.

    Raises:
        WebSocketException: If token is invalid or user not found
    """
    from fastapi import WebSocketException

    payload = decode_token(token)

    if not payload:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    if payload.type != "access":
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    try:
        user_id = UUID(payload.sub)
    except ValueError:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    user = await get_user_by_id(db, user_id)

    if not user:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    return user
