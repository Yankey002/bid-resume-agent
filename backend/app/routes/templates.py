"""Template routes."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..deps import get_current_user
from ..models import Template, User
from ..schemas import TemplatePublic, TemplateUpdate

router = APIRouter(prefix="/api/templates", tags=["templates"])


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


def _save_upload(*, file: UploadFile, target_dir: Path) -> tuple[Path, int]:
    """Save uploaded file to disk and return (path, size_bytes)."""
    _ensure_dir(target_dir)
    file_id = uuid.uuid4()
    suffix = _safe_suffix(file.filename or "")
    target_path = target_dir / f"{file_id}{suffix}"

    size = 0
    with target_path.open("wb") as f:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            f.write(chunk)
    return target_path, size


def _template_to_public(t: Template) -> TemplatePublic:
    """Convert a Template model to public schema."""
    return TemplatePublic(
        id=t.id,
        name=t.name,
        original_filename=t.original_filename,
        content_type=t.content_type,
        size_bytes=t.size_bytes,
        storage_path=t.storage_path,
        uploaded_at=t.uploaded_at,
        updated_at=t.updated_at,
    )


@router.post("/upload", response_model=TemplatePublic)
def upload_template(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    file: Annotated[UploadFile, File(...)],
) -> TemplatePublic:
    """Upload a template file."""
    settings = get_settings()
    target_path, size_bytes = _save_upload(file=file, target_dir=settings.template_dir)

    template = Template(
        name=file.filename or "unknown",
        original_filename=file.filename or "unknown",
        content_type=(file.content_type or ""),
        size_bytes=int(size_bytes),
        storage_path=str(target_path),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return _template_to_public(template)


@router.get("", response_model=list[TemplatePublic])
def list_templates(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[TemplatePublic]:
    """List all templates."""
    rows = db.query(Template).order_by(Template.uploaded_at.desc()).all()
    return [_template_to_public(t) for t in rows]


@router.patch("/{template_id}", response_model=TemplatePublic)
def update_template(
    template_id: uuid.UUID,
    update_data: TemplateUpdate,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TemplatePublic:
    """Update a template."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if update_data.name is not None:
        template.name = update_data.name

    db.commit()
    db.refresh(template)
    return _template_to_public(template)


@router.delete("/{template_id}")
def delete_template(
    template_id: uuid.UUID,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """Delete a template."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Try to delete file from disk
    try:
        path = Path(template.storage_path)
        if path.exists():
            path.unlink()
    except Exception:
        pass  # Log error ideally

    db.delete(template)
    db.commit()
    return {"status": "ok"}


@router.get("/{template_id}/file")
def get_template_file(
    template_id: uuid.UUID,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Get template file content."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    path = Path(template.storage_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path,
        filename=template.original_filename,
        media_type=template.content_type or "application/octet-stream",
    )
