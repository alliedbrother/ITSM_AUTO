"""WebSocket connection manager for real-time updates."""

import json
import asyncio
from typing import Dict, Set, Optional
from uuid import UUID
from fastapi import WebSocket
from dataclasses import dataclass, field


@dataclass
class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    # Map of user_id to their WebSocket connections (supports multiple tabs)
    active_connections: Dict[str, Set[WebSocket]] = field(default_factory=dict)

    # Lock for thread-safe operations
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        """Accept a new WebSocket connection.

        Args:
            websocket: The WebSocket connection
            user_id: The user's ID
        """
        await websocket.accept()

        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)

        # Send connected confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Real-time updates enabled"
        })

    async def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        """Remove a WebSocket connection.

        Args:
            websocket: The WebSocket connection
            user_id: The user's ID
        """
        async with self._lock:
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

    async def send_to_user(self, user_id: str, message: dict) -> None:
        """Send a message to all connections of a specific user.

        Args:
            user_id: The user's ID
            message: The message to send
        """
        async with self._lock:
            connections = self.active_connections.get(user_id, set()).copy()

        dead_connections = []
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                dead_connections.append(websocket)

        # Clean up dead connections
        if dead_connections:
            async with self._lock:
                for ws in dead_connections:
                    if user_id in self.active_connections:
                        self.active_connections[user_id].discard(ws)

    async def broadcast(self, message: dict, exclude_users: Optional[Set[str]] = None) -> None:
        """Broadcast a message to all connected users.

        Args:
            message: The message to send
            exclude_users: Set of user IDs to exclude
        """
        exclude = exclude_users or set()

        async with self._lock:
            users = list(self.active_connections.keys())

        for user_id in users:
            if user_id not in exclude:
                await self.send_to_user(user_id, message)

    def get_connected_users(self) -> Set[str]:
        """Get all connected user IDs."""
        return set(self.active_connections.keys())

    def is_user_connected(self, user_id: str) -> bool:
        """Check if a user has any active connections."""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Global connection manager instance
manager = ConnectionManager()
