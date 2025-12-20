"""FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import User
from .security import decode_token

_bearer = HTTPBearer(auto_error=False)


def _get_user_by_email(*, db: Session, email: str) -> Optional[User]:
    """Fetch a user by email."""
    return db.query(User).filter(User.email == email).one_or_none()


def get_current_user(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Return the authenticated user, or raise 401."""
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录")
    settings = get_settings()
    try:
        payload = decode_token(settings=settings, token=creds.credentials)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 无效")
    email = str(payload.get("sub") or "")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 无效")
    user = _get_user_by_email(db=db, email=email)
    if user is None or not bool(user.is_active):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号不可用")
    return user


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Ensure the current user is an admin."""
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员权限")
    return user
