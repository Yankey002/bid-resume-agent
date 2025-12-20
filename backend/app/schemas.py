"""Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class UserPublic(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str
    is_active: bool
    created_at: Optional[datetime] = None


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=256)
    role: Literal["admin", "user"] = "user"
    is_active: bool = True


class RawResumePublic(BaseModel):
    id: uuid.UUID
    original_filename: str
    content_type: str
    size_bytes: int
    sha256: str
    storage_path: str
    uploaded_by_user_id: uuid.UUID
    uploaded_at: Optional[datetime] = None
