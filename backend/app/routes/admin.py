"""Admin routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import require_admin
from ..models import User
from ..schemas import AdminCreateUserRequest, UserPublic
from ..security import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _user_to_public(user: User) -> UserPublic:
    """Convert a User model to public schema."""
    return UserPublic(
        id=user.id,
        email=user.email,
        role=user.role,
        is_active=bool(user.is_active),
        created_at=user.created_at,
    )


@router.get("/users", response_model=list[UserPublic])
def list_users(
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> list[UserPublic]:
    """List all users (admin only)."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [_user_to_public(u) for u in users]


@router.post("/users", response_model=UserPublic)
def create_user(
    payload: AdminCreateUserRequest,
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> UserPublic:
    """Create a new user (admin only)."""
    email = str(payload.email)
    existed = db.query(User).filter(User.email == email).one_or_none()
    if existed is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="邮箱已存在")
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        role=str(payload.role),
        is_active=1 if bool(payload.is_active) else 0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_to_public(user)


@router.patch("/users/{user_id}/status", response_model=UserPublic)
def set_user_status(
    user_id: str,
    is_active: bool,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> UserPublic:
    """Enable or disable a user (admin only)."""
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    if user.email == admin.email and not is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不能禁用自己")
    user.is_active = 1 if is_active else 0
    db.commit()
    db.refresh(user)
    return _user_to_public(user)
