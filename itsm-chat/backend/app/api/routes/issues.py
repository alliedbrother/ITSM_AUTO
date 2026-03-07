"""Issue history routes."""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ...config.database import get_db
from ...config.settings import get_settings
from ...schemas.issue import UserIssueResponse, UserIssueListResponse
from ...services.issue_tracker import get_user_issues, get_user_issue, get_issue_url
from ...services.paperclip import get_issue_details, get_issue_activity
from ...middleware.auth import get_current_user
from ...models.user import User


router = APIRouter(prefix="/issues", tags=["issues"])


@router.get("", response_model=UserIssueListResponse)
async def list_issues(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all issues created by the current user."""
    issues, total = await get_user_issues(
        db,
        user_id=current_user.id,
        status=status,
        page=page,
        per_page=per_page
    )

    # Add issue URLs
    issue_responses = []
    for issue in issues:
        response = UserIssueResponse.model_validate(issue)
        if issue.issue_identifier:
            response.issue_url = get_issue_url(issue.issue_identifier)
        issue_responses.append(response)

    return UserIssueListResponse(
        issues=issue_responses,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/{issue_id}")
async def get_issue(
    issue_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific issue.

    Fetches the latest data from Paperclip API.
    """
    # Verify user owns this issue
    user_issue = await get_user_issue(db, current_user.id, issue_id)

    if not user_issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    # Fetch latest details from Paperclip
    try:
        issue_details = await get_issue_details(issue_id)
    except Exception as e:
        # Return cached data if Paperclip is unavailable
        return {
            "tracked": UserIssueResponse.model_validate(user_issue),
            "details": None,
            "error": "Unable to fetch latest details"
        }

    return {
        "tracked": UserIssueResponse.model_validate(user_issue),
        "details": issue_details
    }


@router.get("/{issue_id}/activity")
async def get_issue_activity_route(
    issue_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get activity log for a specific issue."""
    # Verify user owns this issue
    user_issue = await get_user_issue(db, current_user.id, issue_id)

    if not user_issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    # Fetch activity from Paperclip
    try:
        activity = await get_issue_activity(issue_id)
        return {"activity": activity}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to fetch issue activity"
        )
