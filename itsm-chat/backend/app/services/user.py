"""User CRUD service."""

from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..models.user import User
from ..schemas.auth import UserCreate
from ..services.auth import hash_password
from ..config.settings import get_settings


class UserExistsError(Exception):
    """Raised when trying to create a user that already exists."""
    pass


async def create_user(
    db: AsyncSession,
    user_data: UserCreate
) -> User:
    """Create a new user.

    Args:
        db: Database session
        user_data: User creation data

    Returns:
        Created user

    Raises:
        UserExistsError: If user with email already exists
    """
    settings = get_settings()

    # Use provided company_id or default
    company_id = user_data.company_id or UUID(settings.default_company_id)

    # Create user with hashed password
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        name=user_data.name,
        company_id=company_id
    )

    try:
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    except IntegrityError:
        await db.rollback()
        raise UserExistsError(f"User with email {user_data.email} already exists")


async def get_user(db: AsyncSession, user_id: UUID) -> Optional[User]:
    """Get a user by ID."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get a user by email."""
    result = await db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()


async def update_user(
    db: AsyncSession,
    user: User,
    **kwargs
) -> User:
    """Update user fields."""
    for key, value in kwargs.items():
        if hasattr(user, key):
            setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user: User) -> None:
    """Delete a user."""
    await db.delete(user)
    await db.commit()
