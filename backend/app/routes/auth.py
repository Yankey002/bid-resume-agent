"""Authentication routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import LoginRequest, TokenResponse, UserPublic
from ..security import create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_to_public(user: User) -> UserPublic:
    """Convert a User model to public schema."""
    return UserPublic(
        id=user.id,
        email=user.email,
        role=user.role,
        is_active=bool(user.is_active),
        created_at=user.created_at,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest, db: Annotated[Session, Depends(get_db)]
) -> TokenResponse:
    """Authenticate a user and return a JWT."""
    user = db.query(User).filter(User.email == str(payload.email)).one_or_none()
    if user is None or not bool(user.is_active):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号或密码错误")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号或密码错误")
    settings = get_settings()
    token = create_access_token(
        settings=settings, subject=user.email, extra={"role": user.role}
    )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserPublic)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserPublic:
    """Return current authenticated user info."""
    return _user_to_public(user)
