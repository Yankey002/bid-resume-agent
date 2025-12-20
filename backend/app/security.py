"""Authentication and authorization utilities."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import jwt
from passlib.context import CryptContext

from .config import Settings

_pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain-text password."""
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plain-text password against a hash."""
    return _pwd_context.verify(password, password_hash)


def create_access_token(
    *, settings: Settings, subject: str, extra: Optional[dict[str, Any]] = None
) -> str:
    """Create a signed JWT access token."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=int(settings.jwt_access_token_exp_minutes))
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def decode_token(*, settings: Settings, token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token."""
    return jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )
