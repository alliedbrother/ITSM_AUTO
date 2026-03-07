"""Paperclip WebSocket client for listening to issue updates."""

import json
import asyncio
from typing import Optional, Callable, Awaitable
import websockets
from websockets.exceptions import ConnectionClosed

from ..config.settings import get_settings
from ..config.database import get_db_context
from ..services.issue_tracker import get_issue_by_paperclip_id, update_issue_status, mark_issue_notified
from ..services.websocket_manager import manager
from ..schemas.issue import IssueNotification


class PaperclipWebSocketClient:
    """WebSocket client for receiving Paperclip events."""

    def __init__(self):
        self.settings = get_settings()
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.running = False
        self._reconnect_delay = 1  # Start with 1 second
        self._max_reconnect_delay = 60  # Max 60 seconds

    async def connect(self) -> bool:
        """Connect to Paperclip WebSocket.

        Returns:
            True if connected successfully
        """
        try:
            ws_url = self.settings.paperclip_websocket_url
            headers = {}
            if self.settings.paperclip_api_token:
                headers["Authorization"] = f"Bearer {self.settings.paperclip_api_token}"

            self.websocket = await websockets.connect(
                ws_url,
                additional_headers=headers,
                ping_interval=30,
                ping_timeout=10
            )
            self._reconnect_delay = 1  # Reset on successful connection
            print(f"Connected to Paperclip WebSocket: {ws_url}")
            return True

        except Exception as e:
            print(f"Failed to connect to Paperclip WebSocket: {e}")
            return False

    async def disconnect(self) -> None:
        """Disconnect from Paperclip WebSocket."""
        self.running = False
        if self.websocket:
            await self.websocket.close()
            self.websocket = None

    async def listen(self) -> None:
        """Listen for events from Paperclip and process them."""
        self.running = True

        while self.running:
            try:
                if not self.websocket or self.websocket.closed:
                    connected = await self.connect()
                    if not connected:
                        # Exponential backoff for reconnection
                        await asyncio.sleep(self._reconnect_delay)
                        self._reconnect_delay = min(
                            self._reconnect_delay * 2,
                            self._max_reconnect_delay
                        )
                        continue

                # Listen for messages
                async for message in self.websocket:
                    await self._handle_message(message)

            except ConnectionClosed:
                print("Paperclip WebSocket connection closed, reconnecting...")
                self.websocket = None
                await asyncio.sleep(self._reconnect_delay)

            except Exception as e:
                print(f"Error in Paperclip WebSocket listener: {e}")
                self.websocket = None
                await asyncio.sleep(self._reconnect_delay)

    async def _handle_message(self, message: str) -> None:
        """Handle an incoming WebSocket message.

        Args:
            message: The raw message string
        """
        try:
            data = json.loads(message)
            event_type = data.get("type", "")

            # Handle issue status changes
            if event_type == "activity.logged":
                activity = data.get("data", {})
                if activity.get("type") == "status_change":
                    await self._handle_status_change(activity)

            # Handle heartbeat
            elif event_type == "heartbeat":
                pass  # Ignore heartbeats

        except json.JSONDecodeError:
            print(f"Invalid JSON from Paperclip WebSocket: {message[:100]}")
        except Exception as e:
            print(f"Error handling Paperclip WebSocket message: {e}")

    async def _handle_status_change(self, activity: dict) -> None:
        """Handle an issue status change event.

        Args:
            activity: The activity data
        """
        issue_id = activity.get("issueId")
        if not issue_id:
            return

        new_status = activity.get("newValue")
        old_status = activity.get("oldValue")

        # Check if this issue was created by a chat user
        async with get_db_context() as db:
            user_issue = await get_issue_by_paperclip_id(db, issue_id)

            if not user_issue:
                # Not a chat-created issue, ignore
                return

            # Update cached status
            await update_issue_status(db, issue_id, new_status)

            # Send notification to user
            user_id = str(user_issue.user_id)

            if manager.is_user_connected(user_id):
                # Build notification
                notification = IssueNotification(
                    type="issue.updated",
                    issue_id=issue_id,
                    issue_identifier=user_issue.issue_identifier,
                    issue_title=user_issue.issue_title,
                    old_status=old_status,
                    new_status=new_status,
                    message=self._build_notification_message(
                        user_issue.issue_identifier,
                        old_status,
                        new_status
                    )
                )

                await manager.send_to_user(user_id, notification.model_dump())

                # Mark as notified
                await mark_issue_notified(db, issue_id)

    def _build_notification_message(
        self,
        identifier: str,
        old_status: str,
        new_status: str
    ) -> str:
        """Build a human-readable notification message."""
        status_messages = {
            "done": f"Issue {identifier} has been resolved!",
            "in_progress": f"Issue {identifier} is now being worked on.",
            "backlog": f"Issue {identifier} has been moved to backlog.",
            "todo": f"Issue {identifier} is ready to be worked on."
        }

        return status_messages.get(
            new_status,
            f"Issue {identifier} status changed from {old_status} to {new_status}"
        )


# Global client instance
paperclip_ws_client = PaperclipWebSocketClient()


async def start_paperclip_listener() -> None:
    """Start the Paperclip WebSocket listener as a background task."""
    asyncio.create_task(paperclip_ws_client.listen())


async def stop_paperclip_listener() -> None:
    """Stop the Paperclip WebSocket listener."""
    await paperclip_ws_client.disconnect()
