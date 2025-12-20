"""FastAPI application entrypoint."""

from __future__ import annotations

import uuid
from typing import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import engine
from .models import Base, User
from .routes import admin, auth, resumes
from .security import hash_password


def _create_app() -> FastAPI:
    """Create the FastAPI application."""
    app = FastAPI(title="Resume Pilot API", version="0.1.0")

    app.add_middleware(  # type: ignore[call-arg, arg-type]
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_request_id(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Attach a request id header for tracing."""
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response

    app.include_router(auth.router)
    app.include_router(admin.router)
    app.include_router(resumes.router)

    return app


app = _create_app()


@app.on_event("startup")
def on_startup() -> None:
    """Initialize database schema and bootstrap admin user."""
    settings = get_settings()
    settings.raw_resume_dir.mkdir(parents=True, exist_ok=True)

    Base.metadata.create_all(bind=engine)

    from sqlalchemy.orm import Session

    with Session(engine) as db:
        existed = (
            db.query(User).filter(User.email == settings.admin_email).one_or_none()
        )
        if existed is None:
            admin_user = User(
                email=settings.admin_email,
                password_hash=hash_password(settings.admin_password),
                role="admin",
                is_active=1,
            )
            db.add(admin_user)
            db.commit()
