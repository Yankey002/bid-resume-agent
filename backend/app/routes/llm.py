"""LLM control center routes."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from resume_parser.llm_engine import OllamaClient, OllamaGenerateOptions

from ..db import get_db
from ..deps import get_current_user
from ..models import AppConfig, User

router = APIRouter(prefix="/api/llm", tags=["llm"])

DEFAULT_MODEL = "qwen2.5:7b-instruct"
DEFAULT_RESUME_PROMPT = "请从以下文件名中提取候选人姓名，只返回姓名，不要包含其他字符。文件名：{filename}"
DEFAULT_TEMPLATE_PROMPT = (
    "你是 Word 模板标注助手。你的任务是：在模板中需要填写候选人信息的位置，插入占位符，格式为[变量名]。"
    "\n\n规则："
    "\n1) 不改动任何固定文案与标题，只在需要填写内容的位置插入占位符。"
    "\n2) 占位符用方括号包裹，例如：姓名位置插入[姓名]，手机号位置插入[手机号]。"
    "\n3) 对于列举式/重复填写的模块（如项目经历、证书、工作经历），请标注两组示例：字段名后加序号1/2，例如[项目名称1]、[项目名称2]。"
    "\n4) 对于表格：每个需要填写的单元格都必须放入对应占位符；表头不改。"
    "\n5) 输出仅包含标注后的结果，不要添加额外解释。"
)

DEFAULT_LLM_CONFIG = {
    "resume_parsing": {
        "model": DEFAULT_MODEL,
        "prompt": DEFAULT_RESUME_PROMPT,
    },
    "template_annotation": {
        "model": DEFAULT_MODEL,
        "prompt": DEFAULT_TEMPLATE_PROMPT,
    },
}


class ModuleConfig(BaseModel):
    """Configuration for a specific LLM module."""

    model: str
    prompt: str


class LLMConfig(BaseModel):
    """LLM configuration schema."""

    resume_parsing: ModuleConfig
    template_annotation: ModuleConfig


class ExtractNameRequest(BaseModel):
    """Request schema for name extraction."""

    filename: str


class ExtractNameResponse(BaseModel):
    """Response schema for name extraction."""

    name: str


def _load_llm_config(db: Session) -> LLMConfig:
    """从数据库读取并合并默认值，返回完整的 LLMConfig."""
    cfg = db.query(AppConfig).filter(AppConfig.key == "llm_settings").first()
    if not cfg:
        return LLMConfig(**DEFAULT_LLM_CONFIG)

    try:
        data = json.loads(cfg.value)

        if isinstance(data, dict) and "model" in data and "prompt_template" in data:
            return LLMConfig(
                resume_parsing=ModuleConfig(
                    model=str(data.get("model", DEFAULT_MODEL) or DEFAULT_MODEL),
                    prompt=str(
                        data.get("prompt_template", DEFAULT_RESUME_PROMPT)
                        or DEFAULT_RESUME_PROMPT
                    ),
                ),
                template_annotation=ModuleConfig(
                    model=DEFAULT_MODEL,
                    prompt=DEFAULT_TEMPLATE_PROMPT,
                ),
            )

        import copy

        merged = copy.deepcopy(DEFAULT_LLM_CONFIG)
        if isinstance(data, dict) and isinstance(data.get("resume_parsing"), dict):
            merged["resume_parsing"] = {
                **merged["resume_parsing"],
                **data["resume_parsing"],
            }
        if isinstance(data, dict) and isinstance(data.get("template_annotation"), dict):
            merged["template_annotation"] = {
                **merged["template_annotation"],
                **data["template_annotation"],
            }
        return LLMConfig(**merged)
    except Exception:
        return LLMConfig(**DEFAULT_LLM_CONFIG)


def _clean_extracted_name(text: str) -> str:
    """清洗大模型输出，尽量得到一个可用的姓名字符串."""
    s = str(text or "").strip()
    s = s.replace("\n", " ").replace("\r", " ").strip()
    s = s.strip("`\"'“”‘’（）()[]{}<>，,。.!！?？:：;；")

    m = re.search(r"[\u4e00-\u9fff·]{2,20}", s)
    if m:
        return m.group(0).strip()

    m2 = re.search(r"[A-Za-z][A-Za-z .'-]{1,40}", s)
    if m2:
        return m2.group(0).strip()

    return ""


def _heuristic_name_from_filename(filename: str) -> str:
    """当大模型不可用时，从文件名做一个保守的姓名猜测（尽量不误伤）."""
    stem = Path(str(filename or "")).stem
    stem = re.sub(r"[_\-]+", " ", stem)

    cn = re.findall(r"[\u4e00-\u9fff·]{2,20}", stem)
    if cn:
        cn_sorted = sorted(cn, key=len, reverse=True)
        return cn_sorted[0].strip()

    en = re.findall(r"[A-Za-z][A-Za-z .'-]{1,40}", stem)
    if en:
        return en[0].strip()

    return ""


@router.get("/models")
def list_models(
    _: Annotated[User, Depends(get_current_user)],
) -> list[str]:
    """List available Ollama models."""
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
    return _load_llm_config(db)


@router.post("/config", response_model=LLMConfig)
def update_config(
    config: LLMConfig,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> LLMConfig:
    """Update LLM configuration."""
    cfg = db.query(AppConfig).filter(AppConfig.key == "llm_settings").first()

    # Serialize with dict() to get nested dicts
    value_str = json.dumps(config.dict())

    if not cfg:
        cfg = AppConfig(key="llm_settings", value=value_str)
        db.add(cfg)
    else:
        cfg.value = value_str

    db.commit()
    db.refresh(cfg)
    return config


@router.post("/extract-name", response_model=ExtractNameResponse)
def extract_name(
    req: ExtractNameRequest,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ExtractNameResponse:
    """使用文件名识别配置，从文件名提取候选人姓名."""
    cfg = _load_llm_config(db)
    prompt_template = str(cfg.resume_parsing.prompt or DEFAULT_RESUME_PROMPT)
    model = str(cfg.resume_parsing.model or DEFAULT_MODEL)
    prompt = prompt_template.format(filename=req.filename)

    client = OllamaClient(base_url="http://localhost:11434")
    options = OllamaGenerateOptions(num_ctx=1024, temperature=0.1, timeout_s=30)

    name = ""
    try:
        raw = client.generate_text(model=model, prompt=prompt, options=options)
        name = _clean_extracted_name(raw)
    except Exception:
        name = ""

    if not name:
        name = _heuristic_name_from_filename(req.filename)
    return ExtractNameResponse(name=name)
