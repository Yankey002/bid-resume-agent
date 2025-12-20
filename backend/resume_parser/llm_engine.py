"""LLM layer for semantic checks and report generation (Ollama)."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class OllamaGenerateOptions:
    """Options for Ollama generation."""

    num_ctx: int = 4096
    temperature: float = 0.1
    timeout_s: int = 120


class OllamaClient:
    """Client for interacting with Ollama API."""

    def __init__(self, *, base_url: str = "http://localhost:11434") -> None:
        """Initialize OllamaClient with base URL."""
        self._base_url = base_url.rstrip("/")

    def generate_json(
        self,
        *,
        model: str,
        prompt: str,
        options: OllamaGenerateOptions,
    ) -> dict[str, Any]:
        """Generate JSON response from Ollama model."""
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "num_ctx": int(options.num_ctx),
                "temperature": float(options.temperature),
            },
        }

        req = urllib.request.Request(
            f"{self._base_url}/api/generate",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=options.timeout_s) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return json.loads(raw)


def render_human_report(
    semantic_report: dict[str, Any],
    *,
    extracted_work_experience: dict[str, Any],
    rule_report: dict[str, Any],
    resume_sections: Optional[dict[str, str]] = None,
) -> str:
    """Render a full Chinese human-readable report from the structured JSON report."""
    if not isinstance(semantic_report, dict):
        return "报告生成失败：语义报告不是对象。"
    if resume_sections is None:
        resume_sections = {}

    score = semantic_report.get("score", 0)
    severity = str(semantic_report.get("severity", "low") or "low")
    meta = (
        semantic_report.get("meta", {})
        if isinstance(semantic_report.get("meta", {}), dict)
        else {}
    )
    llm_used = bool(meta.get("llm_used", False))
    llm_model = str(meta.get("llm_model", "") or "")
    llm_elapsed_ms = int(meta.get("llm_elapsed_ms", 0) or 0)

    rule_summary = (
        rule_report.get("summary", {})
        if isinstance(rule_report.get("summary", {}), dict)
        else {}
    )
    err = int(rule_summary.get("error", 0) or 0)
    warn = int(rule_summary.get("warning", 0) or 0)
    info = int(rule_summary.get("info", 0) or 0)

    fmt_issues = semantic_report.get("format_issues", [])
    if not isinstance(fmt_issues, list):
        fmt_issues = []
    logic_issues = semantic_report.get("logic_issues", [])
    if not isinstance(logic_issues, list):
        logic_issues = []
    rewrite = semantic_report.get("rewrite_suggestions", {})
    if not isinstance(rewrite, dict):
        rewrite = {}

    lines: list[str] = []
    lines.append("简历质检报告（语义与报告）")
    lines.append("")
    lines.append(
        f"总览：评分 {int(score) if isinstance(score, (int, float)) else 0}/100｜风险 {_severity_cn(severity)}"
    )
    lines.append(f"规则问题：错误 {err}｜警告 {warn}｜提示 {info}")
    lines.append(
        "模型："
        + ("已调用" if llm_used else "未调用")
        + (f"｜{llm_model}" if llm_model else "")
        + (f"｜耗时 {llm_elapsed_ms}ms" if llm_elapsed_ms else "")
    )

    we_items = extracted_work_experience.get("items", [])
    if not isinstance(we_items, list):
        we_items = []
    lines.append(f"工作经历条目数：{len(we_items)}")

    sec_info = _sections_presence_cn(resume_sections)
    if sec_info:
        lines.append(f"文本版块：{sec_info}")

    lines.append("")
    lines.extend(
        _render_issue_block("一、格式/字段问题（确定性 + 语义补充）", fmt_issues, is_logic=False)
    )
    lines.append("")
    lines.extend(_render_issue_block("二、逻辑一致性问题（语义）", logic_issues, is_logic=True))
    lines.append("")
    lines.extend(_render_rewrite_block("三、改写建议（可读版）", rewrite))

    return "\n".join([ln.rstrip() for ln in lines]).strip() + "\n"


def generate_semantic_report(
    *,
    extracted_work_experience: dict[str, Any],
    rule_report: dict[str, Any],
    resume_sections: Optional[dict[str, str]] = None,
    base_url: str = "http://localhost:11434",
    model_main: str = "qwen2.5:7b-instruct",
    model_reasoner: str = "deepseek-r1:7b",
    model_fallback: str = "qwen2.5:14b-instruct",
    timeline_conflict_threshold: int = 2,
    options: Optional[OllamaGenerateOptions] = None,
) -> dict[str, Any]:
    """Generate a semantic report using LLM based on extracted data and rules."""
    if options is None:
        options = OllamaGenerateOptions()

    items = extracted_work_experience.get("items", [])
    if not isinstance(items, list):
        items = []

    format_issues = _rule_issues_to_format_issues(rule_report.get("issues", []))
    has_fatal = _has_fatal_rule_error(rule_report)
    timeline_conflicts = _timeline_conflict_count(rule_report)

    base_report: dict[str, Any] = {
        "score": _score_from_rule_report(rule_report),
        "severity": _severity_from_rule_report(rule_report),
        "format_issues": format_issues,
        "logic_issues": [],
        "rewrite_suggestions": {
            "summary": "",
            "project_bullets": [],
            "skill_section": "",
        },
        "meta": {
            "llm_used": False,
            "llm_model": "",
            "llm_attempts": 0,
            "llm_elapsed_ms": 0,
            "timeline_conflicts": timeline_conflicts,
            "has_fatal_rule_error": has_fatal,
        },
    }

    if has_fatal:
        return base_report

    client = OllamaClient(base_url=base_url)
    model_sequence = _route_models(
        timeline_conflicts=timeline_conflicts,
        threshold=timeline_conflict_threshold,
        model_main=model_main,
        model_reasoner=model_reasoner,
        model_fallback=model_fallback,
    )

    prompt = _build_semantic_prompt(
        work_experience_items=_redact_work_experience_items(items),
        resume_sections=_redact_resume_sections(resume_sections or {}),
        rule_summary=rule_report.get("summary", {}),
        rule_issues=_redact_rule_issues(rule_report.get("issues", [])),
    )

    started = time.time()
    attempts = 0
    last_error: str = ""
    for model in model_sequence:
        for pass_idx in range(2):
            attempts += 1
            strict = pass_idx > 0
            try:
                resp = client.generate_json(
                    model=model,
                    prompt=_tighten_prompt(prompt) if strict else prompt,
                    options=_options_for_model(model=model, options=options),
                )
                llm_obj = _parse_ollama_response_json(resp)
                _validate_semantic_schema(llm_obj)
                elapsed_ms = int((time.time() - started) * 1000)
                merged = _merge_llm_into_base(
                    base_report=base_report,
                    llm=llm_obj,
                    llm_model=model,
                    llm_attempts=attempts,
                    llm_elapsed_ms=elapsed_ms,
                )
                return merged
            except Exception as e:  # noqa: BLE001
                last_error = f"{type(e).__name__}: {e}"
                continue

    elapsed_ms = int((time.time() - started) * 1000)
    base_report["meta"]["llm_used"] = False
    base_report["meta"]["llm_model"] = ",".join(model_sequence)
    base_report["meta"]["llm_attempts"] = attempts
    base_report["meta"]["llm_elapsed_ms"] = elapsed_ms
    base_report["meta"]["llm_error"] = last_error
    return base_report


def _options_for_model(
    *, model: str, options: OllamaGenerateOptions
) -> OllamaGenerateOptions:
    if "14b" in model or "32b" in model:
        return OllamaGenerateOptions(
            num_ctx=min(int(options.num_ctx), 2048),
            temperature=float(options.temperature),
            timeout_s=int(options.timeout_s),
        )
    return options


def _route_models(
    *,
    timeline_conflicts: int,
    threshold: int,
    model_main: str,
    model_reasoner: str,
    model_fallback: str,
) -> list[str]:
    if timeline_conflicts >= int(threshold):
        return [model_reasoner, model_fallback]
    return [model_main, model_reasoner, model_fallback]


def _parse_ollama_response_json(resp: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(resp, dict):
        raise ValueError("Ollama 响应不是对象")
    text = resp.get("response", "")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Ollama 响应缺少 response 文本")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        s = text.strip()
        start = s.find("{")
        end = s.rfind("}")
        if start >= 0 and end > start:
            return json.loads(s[start : end + 1])
        raise


def _validate_semantic_schema(obj: dict[str, Any]) -> None:
    if not isinstance(obj, dict):
        raise ValueError("语义报告不是对象")

    required = [
        "score",
        "severity",
        "format_issues",
        "logic_issues",
        "rewrite_suggestions",
    ]
    for k in required:
        if k not in obj:
            raise ValueError(f"语义报告缺少字段：{k}")

    if not isinstance(obj.get("format_issues"), list):
        raise ValueError("format_issues 必须是数组")
    if not isinstance(obj.get("logic_issues"), list):
        raise ValueError("logic_issues 必须是数组")
    if not isinstance(obj.get("rewrite_suggestions"), dict):
        raise ValueError("rewrite_suggestions 必须是对象")

    sev = obj.get("severity")
    if sev not in {"low", "medium", "high"}:
        raise ValueError("severity 必须是 low/medium/high")


def _merge_llm_into_base(
    *,
    base_report: dict[str, Any],
    llm: dict[str, Any],
    llm_model: str,
    llm_attempts: int,
    llm_elapsed_ms: int,
) -> dict[str, Any]:
    merged = json.loads(json.dumps(base_report, ensure_ascii=False))

    merged["meta"]["llm_used"] = True
    merged["meta"]["llm_model"] = llm_model
    merged["meta"]["llm_attempts"] = llm_attempts
    merged["meta"]["llm_elapsed_ms"] = llm_elapsed_ms

    merged["logic_issues"] = (
        llm.get("logic_issues", []) if isinstance(llm.get("logic_issues"), list) else []
    )
    merged["rewrite_suggestions"] = (
        llm.get("rewrite_suggestions", {})
        if isinstance(llm.get("rewrite_suggestions"), dict)
        else merged["rewrite_suggestions"]
    )

    llm_score = llm.get("score", None)
    if isinstance(llm_score, (int, float)):
        rule_score = int(base_report.get("score", 0) or 0)
        semantic_score = int(round(float(llm_score)))
        merged["score"] = int(round(rule_score * 0.6 + semantic_score * 0.4))

    llm_sev = llm.get("severity", None)
    if isinstance(llm_sev, str) and llm_sev in {"low", "medium", "high"}:
        merged["severity"] = _max_severity(
            str(base_report.get("severity", "low")), llm_sev
        )

    llm_format = llm.get("format_issues", None)
    if isinstance(llm_format, list) and llm_format:
        merged["format_issues"] = merged.get("format_issues", []) + llm_format

    return merged


def _max_severity(a: str, b: str) -> str:
    order = {"low": 0, "medium": 1, "high": 2}
    return a if order.get(a, 0) >= order.get(b, 0) else b


def _score_from_rule_report(rule_report: dict[str, Any]) -> int:
    summary = rule_report.get("summary", {})
    if not isinstance(summary, dict):
        summary = {}
    err = int(summary.get("error", 0) or 0)
    warn = int(summary.get("warning", 0) or 0)
    info = int(summary.get("info", 0) or 0)
    score = 100 - err * 10 - warn * 3 - info * 1
    return max(0, min(100, int(score)))


def _severity_from_rule_report(rule_report: dict[str, Any]) -> str:
    summary = rule_report.get("summary", {})
    if not isinstance(summary, dict):
        summary = {}
    if int(summary.get("error", 0) or 0) > 0:
        return "high"
    if int(summary.get("warning", 0) or 0) > 0:
        return "medium"
    return "low"


def _has_fatal_rule_error(rule_report: dict[str, Any]) -> bool:
    summary = rule_report.get("summary", {})
    if not isinstance(summary, dict):
        return False
    return int(summary.get("error", 0) or 0) > 0


def _timeline_conflict_count(rule_report: dict[str, Any]) -> int:
    issues = rule_report.get("issues", [])
    if not isinstance(issues, list):
        return 0
    cnt = 0
    for it in issues:
        if not isinstance(it, dict):
            continue
        if it.get("code") in {"EXP_TIME_OVERLAP", "EXP_TIME_RANGE_INVERTED"}:
            cnt += 1
    return cnt


def _rule_issues_to_format_issues(rule_issues: Any) -> list[dict[str, Any]]:
    if not isinstance(rule_issues, list):
        return []
    out: list[dict[str, Any]] = []
    for it in rule_issues:
        if not isinstance(it, dict):
            continue
        code = str(it.get("code", "") or "")
        sev = str(it.get("severity", "") or "")
        msg = str(it.get("message", "") or "")
        loc = it.get("location", {}) if isinstance(it.get("location", {}), dict) else {}
        fix = str(it.get("suggest_fix", "") or "")
        if not code and not msg:
            continue
        mapped_code = _map_rule_issue_code(code=code, severity=sev)
        out.append(
            {
                "code": mapped_code,
                "message": msg,
                "location": json.dumps(loc, ensure_ascii=False),
                "fix": fix,
            }
        )
    return out


def _map_rule_issue_code(*, code: str, severity: str) -> str:
    if code.startswith("EXP_TIME_"):
        return "TIMELINE_CONFLICT" if severity == "error" else "DATE_FORMAT"
    if "MISSING" in code:
        return "MISSING_FIELD"
    if "CONTACT" in code:
        return "LAYOUT"
    return "LAYOUT"


def _redact_work_experience_items(items: list[Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for raw in items:
        if not isinstance(raw, dict):
            continue
        item: dict[str, Any] = {}
        for k in ("time_raw", "time_start", "time_end", "project", "role"):
            item[k] = raw.get(k, "")
        contact_raw = str(raw.get("contact_raw", "") or "")
        item["contact_hint"] = _redact_pii(contact_raw)
        out.append(item)
    return out


def _redact_resume_sections(sections: dict[str, str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for k, v in sections.items():
        if not isinstance(k, str):
            continue
        if not isinstance(v, str):
            continue
        out[k] = _redact_pii(v)
    return out


def _redact_rule_issues(rule_issues: Any) -> list[dict[str, Any]]:
    if not isinstance(rule_issues, list):
        return []
    out: list[dict[str, Any]] = []
    for it in rule_issues:
        if not isinstance(it, dict):
            continue
        out.append(
            {
                "code": it.get("code", ""),
                "severity": it.get("severity", ""),
                "message": it.get("message", ""),
                "location": it.get("location", {}),
            }
        )
    return out


def _redact_pii(text: str) -> str:
    s = str(text or "")
    s = re.sub(r"1\d{10}", "[PHONE]", s)
    s = re.sub(r"[\w.+-]+@[\w-]+\.[\w.-]+", "[EMAIL]", s)
    return s


def _tighten_prompt(prompt: str) -> str:
    return prompt + "\n\n" + "重要：只输出一个 JSON 对象，不要输出任何解释文字、不使用 markdown 代码块。"


def _build_semantic_prompt(
    *,
    work_experience_items: list[dict[str, Any]],
    resume_sections: dict[str, str],
    rule_summary: Any,
    rule_issues: list[dict[str, Any]],
) -> str:
    input_obj = {
        "resume_sections": resume_sections,
        "work_experience_items": work_experience_items,
        "rule_summary": rule_summary if isinstance(rule_summary, dict) else {},
        "rule_issues": rule_issues,
    }
    schema = {
        "score": 0,
        "severity": "low | medium | high",
        "format_issues": [
            {
                "code": "MISSING_FIELD | DATE_FORMAT | LAYOUT | TYPO",
                "message": "",
                "location": "",
                "fix": "",
            }
        ],
        "logic_issues": [
            {
                "code": "TIMELINE_CONFLICT | INCONSISTENCY | SKILL_MISMATCH",
                "message": "",
                "evidence": [""],
                "fix": "",
            }
        ],
        "rewrite_suggestions": {
            "summary": "",
            "project_bullets": [""],
            "skill_section": "",
        },
    }
    return (
        "你是中文简历质检系统的大模型语义层。你的目标是：基于输入中的结构化结果与规则引擎输出，"
        "做一致性检查、冲突解释、并给出可执行的改写建议。"
        "\n\n"
        "约束：\n"
        "1) 只能依据输入给出的内容，不要编造不存在的事实。\n"
        "2) 证据必须来自输入字段的原文片段（可简短引用）。\n"
        "3) 输出必须严格是 JSON，字段齐全，且不要包含额外字段。\n"
        "4) 当缺少技能/项目/自我评价等信息时，不要强行给出对应问题，可留空。\n"
        "5) 需要重点检查：技能与工作内容关联性、项目经历与工作经历匹配、自我评价与整体一致性。\n"
        "\n\n"
        f"输入数据（JSON）：\n{json.dumps(input_obj, ensure_ascii=False)}\n\n"
        f"输出 schema（示例，不是要照抄内容）：\n{json.dumps(schema, ensure_ascii=False)}\n"
    )


def _severity_cn(sev: str) -> str:
    s = str(sev or "low")
    if s == "high":
        return "高"
    if s == "medium":
        return "中"
    return "低"


def _sections_presence_cn(sections: dict[str, str]) -> str:
    if not isinstance(sections, dict):
        return ""
    mapping = {"skills": "技能", "projects": "项目经历", "self_evaluation": "自我评价"}
    present: list[str] = []
    for key, cn in mapping.items():
        v = sections.get(key, "")
        if isinstance(v, str) and v.strip():
            present.append(f"{cn}✓")
        else:
            present.append(f"{cn}×")
    return "｜".join(present)


def _render_issue_block(title: str, issues: list[Any], *, is_logic: bool) -> list[str]:
    lines: list[str] = [title]
    if not issues:
        lines.append("未发现。")
        return lines

    limit = 30
    shown = 0
    for idx, raw in enumerate(issues):
        if shown >= limit:
            break
        if not isinstance(raw, dict):
            continue
        code = str(raw.get("code", "") or "")
        msg = str(raw.get("message", "") or "")
        fix = str(raw.get("fix", "") or "")
        if not code and not msg:
            continue
        shown += 1
        prefix = f"{shown}. [{code}]" if code else f"{shown}."
        lines.append(f"{prefix} {msg}".rstrip())
        if is_logic:
            evidence = raw.get("evidence", [])
            if isinstance(evidence, list):
                ev = [str(x) for x in evidence if isinstance(x, str) and str(x).strip()]
                if ev:
                    lines.append(f"证据：{_join_short(ev, 3)}")
        loc = str(raw.get("location", "") or "")
        if loc and not is_logic:
            lines.append(f"位置：{loc}")
        if fix:
            lines.append(f"建议：{fix}")
    if len(issues) > shown:
        lines.append(f"……其余 {len(issues) - shown} 条略。")
    return lines


def _render_rewrite_block(title: str, rewrite: dict[str, Any]) -> list[str]:
    lines: list[str] = [title]
    summary = rewrite.get("summary", "")
    if isinstance(summary, str) and summary.strip():
        lines.append("自我总结建议：")
        lines.append(summary.strip())
    project_bullets = rewrite.get("project_bullets", [])
    if isinstance(project_bullets, list):
        bullets = [
            str(x).strip()
            for x in project_bullets
            if isinstance(x, str) and str(x).strip()
        ]
        if bullets:
            lines.append("项目要点改写：")
            for b in bullets[:12]:
                lines.append(f"- {b}")
            if len(bullets) > 12:
                lines.append(f"- ……其余 {len(bullets) - 12} 条略。")
    skill_section = rewrite.get("skill_section", "")
    if isinstance(skill_section, str) and skill_section.strip():
        lines.append("技能段建议：")
        lines.append(skill_section.strip())

    if len(lines) == 1:
        lines.append("暂无。")
    return lines


def _join_short(items: list[str], max_items: int) -> str:
    xs = [x.strip() for x in items if x.strip()]
    if not xs:
        return ""
    if len(xs) <= max_items:
        return "；".join(xs)
    return "；".join(xs[:max_items]) + f"；……其余 {len(xs) - max_items} 条"
