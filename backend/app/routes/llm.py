"""LLM control center routes."""

from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from resume_parser.llm_engine import OllamaClient, OllamaGenerateOptions

from ..db import get_db
from ..deps import get_current_user
from ..models import AppConfig, User

router = APIRouter(prefix="/api/llm", tags=["llm"])

DEFAULT_LLM_CONFIG = {
    "model": "qwen2.5:7b-instruct",
    "prompt_template": "请从以下文件名中提取候选人姓名，只返回姓名，不要包含其他字符。文件名：{filename}",
}


class LLMConfig(BaseModel):
    """LLM configuration schema."""

    model: str
    prompt_template: str


class ExtractNameRequest(BaseModel):
    """Request schema for name extraction."""

    filename: str


class ExtractNameResponse(BaseModel):
    """Response schema for name extraction."""

    name: str


@router.get("/models")
def list_models(
    _: Annotated[User, Depends(get_current_user)],
) -> list[str]:
    """List available Ollama models."""
    # We use OllamaClient but we need a method to list tags.
    # Since OllamaClient doesn't have it, we'll implement a simple request here
    # or extend OllamaClient. For simplicity, extending here.
    import urllib.request

    try:
        with urllib.request.urlopen("http://localhost:11434/api/tags") as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return [m["name"] for m in data.get("models", [])]
    except Exception as e:
        print(f"Error fetching models: {e}")
        return []


@router.get("/config", response_model=LLMConfig)
def get_config(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> LLMConfig:
    """Get current LLM configuration."""
    cfg = db.query(AppConfig).filter(AppConfig.key == "llm_settings").first()
    if not cfg:
        return LLMConfig(**DEFAULT_LLM_CONFIG)

    try:
        data = json.loads(cfg.value)
        return LLMConfig(**{**DEFAULT_LLM_CONFIG, **data})
    except Exception:
        return LLMConfig(**DEFAULT_LLM_CONFIG)


@router.post("/config", response_model=LLMConfig)
def update_config(
    config: LLMConfig,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> LLMConfig:
    """Update LLM configuration."""
    # Optionally check if user is admin, but for now allow any user

    cfg = db.query(AppConfig).filter(AppConfig.key == "llm_settings").first()
    if not cfg:
        cfg = AppConfig(key="llm_settings", value=json.dumps(config.dict()))
        db.add(cfg)
    else:
        cfg.value = json.dumps(config.dict())

    db.commit()
    db.refresh(cfg)
    return config


@router.post("/extract-name", response_model=ExtractNameResponse)
def extract_name(
    req: ExtractNameRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ExtractNameResponse:
    """Extract candidate name from filename using LLM."""
    # 1. Get config
    cfg_record = db.query(AppConfig).filter(AppConfig.key == "llm_settings").first()
    config = DEFAULT_LLM_CONFIG
    if cfg_record:
        try:
            config = {**config, **json.loads(cfg_record.value)}
        except Exception:
            pass

    model = config.get("model", "qwen2.5:7b-instruct")
    template = config.get("prompt_template", "{filename}")

    prompt = template.replace("{filename}", req.filename)

    client = OllamaClient()
    options = OllamaGenerateOptions(temperature=0.1)

    try:
        name = client.generate_text(model=model, prompt=prompt, options=options)
        return ExtractNameResponse(name=name.strip())
    except Exception as e:
        print(f"Error extracting name: {e}")
        # If it's a 404, it might mean the model is not found/downloaded
        if "404" in str(e):
            print(f"Model {model} not found. Please pull it first: ollama pull {model}")

        # Fallback to empty string or original filename?
        # Requirement says "support user manual secondary modification", so empty is better than error
        return ExtractNameResponse(name="")
