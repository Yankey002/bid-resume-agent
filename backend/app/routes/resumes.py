"""Resume upload and metadata routes."""

from __future__ import annotations

import hashlib
import uuid
from pathlib import Path
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import get_current_user
from ..models import RawResume, User
from ..schemas import RawResumePublic

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


def _ensure_dir(path: Path) -> None:
    """Ensure a directory exists."""
    path.mkdir(parents=True, exist_ok=True)


def _safe_suffix(filename: str) -> str:
    """Extract a safe suffix from the original filename."""
    name = (filename or "").strip()
    if "." not in name:
        return ""
    suffix = "." + name.split(".")[-1].lower()
    if len(suffix) > 12:
        return ""
    return "".join(ch for ch in suffix if ch.isalnum() or ch == ".")


def _save_upload(*, file: UploadFile, target_dir: Path) -> tuple[Path, str, int]:
    """Save uploaded file to disk and return (path, sha256, size_bytes)."""
    _ensure_dir(target_dir)
    file_id = uuid.uuid4()
    suffix = _safe_suffix(file.filename or "")
    target_path = target_dir / f"{file_id}{suffix}"

    h = hashlib.sha256()
    size = 0
    with target_path.open("wb") as f:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            h.update(chunk)
            f.write(chunk)
    return target_path, h.hexdigest(), size


def _resume_to_public(r: RawResume) -> RawResumePublic:
    """Convert a RawResume model to public schema."""
    return RawResumePublic(
        id=r.id,
        original_filename=r.original_filename,
        content_type=r.content_type,
        size_bytes=r.size_bytes,
        sha256=r.sha256,
        storage_path=r.storage_path,
        uploaded_by_user_id=r.uploaded_by_user_id,
        uploaded_at=r.uploaded_at,
        candidate_name=r.candidate_name,
        candidate_id=r.candidate_id,
    )


@router.post("/upload", response_model=RawResumePublic)
def upload_resume(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File(...)],
    candidate_name: Annotated[Optional[str], Form()] = None,
    candidate_id: Annotated[Optional[str], Form()] = None,
) -> RawResumePublic:
    """Upload a resume file and store metadata."""
    settings = get_settings()
    target_path, sha256, size_bytes = _save_upload(
        file=file, target_dir=settings.raw_resume_dir
    )

    rr = RawResume(
        original_filename=file.filename or "unknown",
        content_type=(file.content_type or ""),
        size_bytes=int(size_bytes),
        sha256=sha256,
        storage_path=str(target_path),
        uploaded_by_user_id=user.id,
        candidate_name=candidate_name,
        candidate_id=uuid.UUID(candidate_id) if candidate_id else None,
    )
    db.add(rr)
    db.commit()
    db.refresh(rr)
    return _resume_to_public(rr)


@router.get("", response_model=list[RawResumePublic])
def list_resumes(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    candidate_id: Optional[str] = None,
) -> list[RawResumePublic]:
    """List raw resume metadata. Optionally filter by candidate_id."""
    query = db.query(RawResume)
    if candidate_id:
        query = query.filter(RawResume.candidate_id == candidate_id)

    rows = query.order_by(RawResume.uploaded_at.desc()).all()
    return [_resume_to_public(r) for r in rows]
