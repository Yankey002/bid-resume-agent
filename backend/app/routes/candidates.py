"""Candidate routes."""

from __future__ import annotations

import os
from typing import Annotated, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..deps import get_current_user
from ..models import Candidate, RawResume, User
from ..schemas import CandidateCreate, CandidatePublic

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


def _generate_unique_id(db: Session) -> str:
    """Generate the next unique 6-digit ID sequentially."""
    # Find the current maximum unique_id
    max_id = db.query(func.max(Candidate.unique_id)).scalar()

    if not max_id:
        return "000001"

    try:
        next_val = int(max_id) + 1
        if next_val > 999999:
            raise ValueError("Max ID limit reached")
        return f"{next_val:06d}"
    except ValueError:
        # Fallback in case unique_id contains non-digits (though schema restricts it)
        return "000001"


@router.get("/search", response_model=List[CandidatePublic])
def search_candidates(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    name: Optional[str] = Query(None, min_length=0),
) -> List[CandidatePublic]:
    """Fuzzy search candidates by name. If name is empty, list all (limit 100)."""
    query = db.query(Candidate)
    if name:
        query = query.filter(Candidate.name.ilike(f"%{name}%"))

    # Limit to 100 for now to prevent huge payload
    candidates = query.order_by(Candidate.updated_at.desc()).limit(100).all()

    # We could attach resume count here efficiently
    results = []
    for c in candidates:
        count = (
            db.query(func.count(RawResume.id))
            .filter(RawResume.candidate_id == c.id)
            .scalar()
        )
        results.append(
            CandidatePublic(
                id=c.id,
                unique_id=c.unique_id,
                name=c.name,
                created_at=c.created_at,
                updated_at=c.updated_at,
                resumes_count=count or 0,
            )
        )
    return results


@router.get("/suggest-id", response_model=str)
def suggest_unique_id(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> str:
    """Generate a new unique 6-digit ID for preview."""
    return _generate_unique_id(db)


@router.post("", response_model=CandidatePublic)
def create_candidate(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    payload: CandidateCreate,
) -> CandidatePublic:
    """Create a new candidate profile."""
    # If ID provided, verify uniqueness. If not, generate.
    if payload.unique_id:
        exists = (
            db.query(Candidate).filter(Candidate.unique_id == payload.unique_id).first()
        )
        if exists:
            # If taken, generate a new sequential ID automatically
            unique_id = _generate_unique_id(db)
            # Double check if the generated one exists (rare race condition loop)
            while db.query(Candidate).filter(Candidate.unique_id == unique_id).first():
                # Force increment manually if somehow the max query was stale?
                # Or just rely on the fact that _generate_unique_id queries max again.
                # But if transaction hasn't committed, max might be same.
                # Let's trust _generate_unique_id for now as it queries DB.
                # A simple safety break could be added but let's keep it simple first.
                # To be safer against race conditions in parallel requests:
                try:
                    curr = int(unique_id)
                    unique_id = f"{curr + 1:06d}"
                except ValueError:
                    unique_id = _generate_unique_id(db)
        else:
            unique_id = payload.unique_id
    else:
        unique_id = _generate_unique_id(db)

    candidate = Candidate(name=payload.name, unique_id=unique_id)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    return CandidatePublic(
        id=candidate.id,
        unique_id=candidate.unique_id,
        name=candidate.name,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
        resumes_count=0,
    )


@router.delete("/batch", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidates(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    candidate_ids: List[str] = Body(..., embed=True),
) -> None:
    """Batch delete candidates and their associated files."""
    # Find candidates with resumes eagerly loaded
    candidates = (
        db.query(Candidate)
        .options(joinedload(Candidate.resumes))
        .filter(Candidate.id.in_(candidate_ids))
        .all()
    )

    if not candidates:
        return

    # Collect file paths to delete
    file_paths = []
    for candidate in candidates:
        for resume in candidate.resumes:
            if resume.storage_path:
                file_paths.append(resume.storage_path)

    # Delete from DB (Cascade will remove resumes)
    for candidate in candidates:
        db.delete(candidate)

    db.commit()

    # Delete physical files
    print(f"Deleting {len(file_paths)} files for {len(candidates)} candidates")
    for path in file_paths:
        try:
            if os.path.exists(path):
                os.remove(path)
                print(f"Deleted file: {path}")
            else:
                print(f"File not found: {path}")
        except OSError as e:
            # Log error but don't fail the request
            print(f"Error deleting file {path}: {e}")


@router.get("/{candidate_id}", response_model=CandidatePublic)
def get_candidate(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    candidate_id: str,
) -> CandidatePublic:
    """Get candidate details."""
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    count = (
        db.query(func.count(RawResume.id))
        .filter(RawResume.candidate_id == candidate.id)
        .scalar()
    )

    return CandidatePublic(
        id=candidate.id,
        unique_id=candidate.unique_id,
        name=candidate.name,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
        resumes_count=count or 0,
    )
