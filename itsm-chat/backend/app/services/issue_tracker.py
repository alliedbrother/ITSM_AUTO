"""Issue tracking service for user-created issues."""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from ..models.user_issue import UserIssue
from ..schemas.issue import UserIssueCreate
from ..config.settings import get_settings


async def track_issue(
    db: AsyncSession,
    user_id: UUID,
    issue_data: UserIssueCreate
) -> UserIssue:
    """Track a newly created issue for a user.

    Args:
        db: Database session
        user_id: ID of the user who created the issue
        issue_data: Issue tracking data

    Returns:
        Created UserIssue record
    """
    user_issue = UserIssue(
        user_id=user_id,
        issue_id=issue_data.issue_id,
        issue_identifier=issue_data.issue_identifier,
        issue_title=issue_data.issue_title,
        issue_status=issue_data.issue_status or "todo"
    )

    db.add(user_issue)
    await db.commit()
    await db.refresh(user_issue)

    return user_issue


async def get_user_issues(
    db: AsyncSession,
    user_id: UUID,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20
) -> tuple[List[UserIssue], int]:
    """Get all issues created by a user.

    Args:
        db: Database session
        user_id: User ID
        status: Optional status filter
        page: Page number (1-indexed)
        per_page: Items per page

    Returns:
        Tuple of (issues list, total count)
    """
    # Base query
    query = select(UserIssue).where(UserIssue.user_id == user_id)

    # Apply status filter
    if status:
        query = query.where(UserIssue.issue_status == status)

    # Get total count
    count_query = select(func.count()).select_from(
        query.subquery()
    )
    total = await db.scalar(count_query) or 0

    # Apply pagination and ordering
    query = query.order_by(UserIssue.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    issues = list(result.scalars().all())

    return issues, total


async def get_user_issue(
    db: AsyncSession,
    user_id: UUID,
    issue_id: UUID
) -> Optional[UserIssue]:
    """Get a specific issue for a user.

    Args:
        db: Database session
        user_id: User ID
        issue_id: Paperclip issue ID

    Returns:
        UserIssue if found, None otherwise
    """
    result = await db.execute(
        select(UserIssue)
        .where(UserIssue.user_id == user_id)
        .where(UserIssue.issue_id == issue_id)
    )
    return result.scalar_one_or_none()


async def get_issue_by_paperclip_id(
    db: AsyncSession,
    issue_id: UUID
) -> Optional[UserIssue]:
    """Get a user issue by Paperclip issue ID (for WebSocket updates).

    Args:
        db: Database session
        issue_id: Paperclip issue ID

    Returns:
        UserIssue if found, None otherwise
    """
    result = await db.execute(
        select(UserIssue).where(UserIssue.issue_id == issue_id)
    )
    return result.scalar_one_or_none()


async def update_issue_status(
    db: AsyncSession,
    issue_id: UUID,
    new_status: str
) -> Optional[UserIssue]:
    """Update the cached status of a tracked issue.

    Args:
        db: Database session
        issue_id: Paperclip issue ID
        new_status: New status value

    Returns:
        Updated UserIssue if found, None otherwise
    """
    result = await db.execute(
        select(UserIssue).where(UserIssue.issue_id == issue_id)
    )
    user_issue = result.scalar_one_or_none()

    if user_issue:
        user_issue.issue_status = new_status
        user_issue.last_updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user_issue)

    return user_issue


async def mark_issue_notified(
    db: AsyncSession,
    issue_id: UUID
) -> Optional[UserIssue]:
    """Mark an issue as notified to the user.

    Args:
        db: Database session
        issue_id: Paperclip issue ID

    Returns:
        Updated UserIssue if found, None otherwise
    """
    result = await db.execute(
        select(UserIssue).where(UserIssue.issue_id == issue_id)
    )
    user_issue = result.scalar_one_or_none()

    if user_issue:
        user_issue.notified_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user_issue)

    return user_issue


def get_issue_url(issue_identifier: str) -> str:
    """Generate the URL for viewing an issue."""
    settings = get_settings()
    return f"{settings.itsm_base_url}/issues/{issue_identifier}"
