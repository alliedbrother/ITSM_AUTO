"""WebSocket endpoint for real-time updates."""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...services.websocket_manager import manager
from ...services.auth import decode_token, get_user_by_id
from ...config.database import get_db_context

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """WebSocket endpoint for real-time updates.

    Clients connect with their JWT token as a query parameter.
    They receive notifications when their issues are updated.

    Usage: ws://host/api/ws?token=<jwt_token>
    """
    # Validate token
    payload = decode_token(token)

    if not payload or payload.type != "access":
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    user_id = payload.sub

    # Verify user exists
    async with get_db_context() as db:
        user = await get_user_by_id(db, user_id)
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return

    # Accept connection
    await manager.connect(websocket, user_id)

    try:
        while True:
            # Keep connection alive and handle incoming messages
            try:
                data = await websocket.receive_text()

                # Handle ping/pong for keep-alive
                if data == "ping":
                    await websocket.send_text("pong")
                else:
                    # Handle other client messages if needed
                    try:
                        message = json.loads(data)
                        await handle_client_message(websocket, user_id, message)
                    except json.JSONDecodeError:
                        pass

            except WebSocketDisconnect:
                break

    finally:
        await manager.disconnect(websocket, user_id)


async def handle_client_message(
    websocket: WebSocket,
    user_id: str,
    message: dict
) -> None:
    """Handle incoming client messages.

    Args:
        websocket: The WebSocket connection
        user_id: The user's ID
        message: The parsed message
    """
    msg_type = message.get("type", "")

    if msg_type == "subscribe":
        # Client wants to subscribe to specific issue updates
        issue_id = message.get("issue_id")
        if issue_id:
            await websocket.send_json({
                "type": "subscribed",
                "issue_id": issue_id
            })

    elif msg_type == "unsubscribe":
        # Client wants to unsubscribe from issue updates
        issue_id = message.get("issue_id")
        if issue_id:
            await websocket.send_json({
                "type": "unsubscribed",
                "issue_id": issue_id
            })

    elif msg_type == "ping":
        await websocket.send_json({"type": "pong"})
