"""Application configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def _project_backend_dir() -> Path:
    """Return the backend directory path."""
    return Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    """Application settings."""

    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_access_token_exp_minutes: int
    raw_resume_dir: Path
    template_dir: Path
    admin_email: str
    admin_password: str


def get_settings() -> Settings:
    """Load settings from environment variables with sensible defaults for development."""
    load_dotenv(dotenv_path=_project_backend_dir() / ".env", override=False)

    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/resume_pilot",
    )
    jwt_secret_key = os.getenv("JWT_SECRET_KEY", "change_me_in_production")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_access_token_exp_minutes = int(os.getenv("JWT_ACCESS_TOKEN_EXP_MINUTES", "720"))
    raw_resume_dir = Path(
        os.getenv(
            "RAW_RESUME_DIR", str(_project_backend_dir() / "storage" / "raw_resumes")
        )
    )
    template_dir = Path(
        os.getenv("TEMPLATE_DIR", str(_project_backend_dir() / "storage" / "templates"))
    )

    admin_email = os.getenv("ADMIN_EMAIL", "admin@qishirecord.cn")
    admin_password = os.getenv("ADMIN_PASSWORD", "yanky430")

    return Settings(
        database_url=database_url,
        jwt_secret_key=jwt_secret_key,
        jwt_algorithm=jwt_algorithm,
        jwt_access_token_exp_minutes=jwt_access_token_exp_minutes,
        raw_resume_dir=raw_resume_dir,
        template_dir=template_dir,
        admin_email=admin_email,
        admin_password=admin_password,
    )
