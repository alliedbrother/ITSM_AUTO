"""UserIssue model for tracking issues created by users."""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from ..config.database import Base


class UserIssue(Base):
    """Track issues created by each user through chat."""

    __tablename__ = "user_issues"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    issue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True
    )
    issue_identifier: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )
    issue_title: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )
    issue_status: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        default="todo"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    last_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        onupdate=func.now()
    )
    notified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="issues")

    def __repr__(self) -> str:
        return f"<UserIssue {self.issue_identifier}>"


# Import here to avoid circular imports
from .user import User
