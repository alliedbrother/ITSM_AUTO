"""Issue history schemas."""

from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class UserIssueBase(BaseModel):
    """Base user issue schema."""
    issue_id: UUID
    issue_identifier: Optional[str] = None
    issue_title: Optional[str] = None
    issue_status: Optional[str] = "todo"


class UserIssueCreate(UserIssueBase):
    """Schema for creating a user issue tracking entry."""
    pass


class UserIssueResponse(UserIssueBase):
    """Schema for user issue response."""
    id: UUID
    user_id: UUID
    created_at: datetime
    last_updated_at: Optional[datetime] = None
    notified_at: Optional[datetime] = None
    issue_url: Optional[str] = None

    class Config:
        from_attributes = True


class UserIssueListResponse(BaseModel):
    """Schema for paginated issue list."""
    issues: List[UserIssueResponse]
    total: int
    page: int = 1
    per_page: int = 20


class IssueStatusUpdate(BaseModel):
    """Schema for issue status update (from WebSocket)."""
    issue_id: UUID
    new_status: str
    updated_at: datetime


class IssueNotification(BaseModel):
    """Schema for issue notification to frontend."""
    type: str = "issue.updated"
    issue_id: UUID
    issue_identifier: Optional[str] = None
    issue_title: Optional[str] = None
    old_status: Optional[str] = None
    new_status: str
    message: str
