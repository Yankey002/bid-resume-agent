"""Parse a DOCX resume into structured JSON and extract key tables."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable, Iterator, Literal, Optional, Tuple, Union

from docx import Document
from docx.document import Document as DocxDocument
from docx.oxml.ns import qn
from docx.parts.image import ImagePart
from docx.section import Section
from docx.table import Table
from docx.text.paragraph import Paragraph

from .llm_engine import (
    OllamaGenerateOptions,
    generate_semantic_report,
    render_human_report,
)
from .rule_engine import validate_work_experience

BlockKind = Literal["paragraph", "table"]
LocationKind = Literal["body", "header", "footer"]


def parse_docx(path: Union[str, Path]) -> dict[str, Any]:
    """Parse a .docx file into a structured JSON-compatible dictionary."""
    input_path = Path(path)
    doc = Document(str(input_path))

    sections = []
    for idx, section in enumerate(doc.sections):
        sections.append(
            {
                "index": idx,
                "page_setup": _extract_page_setup(section),
                "header": {"blocks": list(_iter_container_blocks(doc, section.header))},
                "footer": {"blocks": list(_iter_container_blocks(doc, section.footer))},
            }
        )

    body_blocks = list(_iter_body_blocks(doc))
    images = _collect_unique_images(body_blocks, sections)

    return {
        "meta": {
            "source_path": str(input_path),
            "core_properties": _extract_core_properties(doc),
        },
        "sections": sections,
        "blocks": body_blocks,
        "images": images,
    }


def main(argv: Optional[list[str]] = None) -> int:
    """Run the CLI for DOCX parsing and optional work experience extraction."""
    parser = argparse.ArgumentParser(prog="python -m resume_parser.docx_parser")
    parser.add_argument("input", help="输入 docx 文件路径")
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="美化 JSON 输出（更易读，体积更大）",
    )
    parser.add_argument(
        "-o",
        "--output",
        dest="output",
        help="输出 JSON 文件路径（使用 UTF-8 编码）",
    )
    parser.add_argument(
        "--extract-work-experience",
        action="store_true",
        help="抽取工作经历表并输出结构化结果（输入可为 .docx 或解析后的 .json）",
    )
    parser.add_argument(
        "--experience-only",
        action="store_true",
        help="仅输出工作经历 items 列表（需配合 --extract-work-experience）",
    )
    parser.add_argument(
        "--validate-work-experience",
        action="store_true",
        help="运行规则引擎：检查工作经历时间线/必填项/联系方式（输入可为 .docx、解析后的 .json、或抽取后的结果）",
    )
    parser.add_argument(
        "--llm-work-experience-report",
        action="store_true",
        help="运行大模型语义层：基于工作经历抽取+规则结果生成结构化检查报告（Ollama 本地）",
    )
    parser.add_argument(
        "--ollama-base-url",
        default="http://localhost:11434",
        help="Ollama 服务地址（默认 http://localhost:11434）",
    )
    parser.add_argument(
        "--llm-model-main",
        default="qwen2.5:7b-instruct",
        help="主力模型（默认 qwen2.5:7b-instruct）",
    )
    parser.add_argument(
        "--llm-model-reasoner",
        default="deepseek-r1:7b",
        help="推理增强模型（默认 deepseek-r1:7b）",
    )
    parser.add_argument(
        "--llm-model-fallback",
        default="qwen2.5:14b-instruct",
        help="兜底模型（默认 qwen2.5:14b-instruct）",
    )
    parser.add_argument(
        "--llm-num-ctx",
        type=int,
        default=4096,
        help="推理上下文长度（默认 4096；兜底模型自动降到 2048）",
    )
    parser.add_argument(
        "--llm-temperature",
        type=float,
        default=0.1,
        help="采样温度（默认 0.1，用于提升 JSON 稳定性）",
    )
    parser.add_argument(
        "--llm-timeout",
        type=int,
        default=120,
        help="单次调用超时时间（秒，默认 120）",
    )
    parser.add_argument(
        "--llm-timeline-threshold",
        type=int,
        default=2,
        help="时间线冲突升级阈值（默认 2）",
    )
    parser.add_argument(
        "--human-report-only",
        action="store_true",
        help="仅输出中文可读报告（需配合 --llm-work-experience-report）",
    )
    parser.add_argument(
        "--human-report-output",
        help="中文可读报告输出路径（.txt，需配合 --human-report-only）",
    )

    args = parser.parse_args(argv)
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"文件不存在：{input_path}", file=sys.stderr)
        return 2
    if input_path.suffix.lower() not in {".docx", ".json"}:
        print(f"仅支持 .docx 或 .json：{input_path}", file=sys.stderr)
        return 2
    if args.experience_only and args.validate_work_experience:
        print(
            "--experience-only 不能与 --validate-work-experience 同时使用",
            file=sys.stderr,
        )
        return 2
    if args.experience_only and args.llm_work_experience_report:
        print(
            "--experience-only 不能与 --llm-work-experience-report 同时使用",
            file=sys.stderr,
        )
        return 2
    if args.validate_work_experience and args.llm_work_experience_report:
        print(
            "--validate-work-experience 不能与 --llm-work-experience-report 同时使用",
            file=sys.stderr,
        )
        return 2
    if args.experience_only and not args.extract_work_experience:
        print("--experience-only 需配合 --extract-work-experience 使用", file=sys.stderr)
        return 2
    if args.human_report_only and not args.llm_work_experience_report:
        print(
            "--human-report-only 需配合 --llm-work-experience-report 使用",
            file=sys.stderr,
        )
        return 2
    if args.human_report_output and not args.human_report_only:
        print("--human-report-output 需配合 --human-report-only 使用", file=sys.stderr)
        return 2

    data = _load_input_data(input_path)
    if args.llm_work_experience_report:
        resume_sections = _extract_resume_sections(data)
        extracted = _coerce_work_experience(data)
        rule_report = validate_work_experience(extracted, source_path=str(input_path))
        opts = OllamaGenerateOptions(
            num_ctx=int(args.llm_num_ctx),
            temperature=float(args.llm_temperature),
            timeout_s=int(args.llm_timeout),
        )
        data = generate_semantic_report(
            extracted_work_experience=extracted,
            rule_report=rule_report,
            resume_sections=resume_sections,
            base_url=str(args.ollama_base_url),
            model_main=str(args.llm_model_main),
            model_reasoner=str(args.llm_model_reasoner),
            model_fallback=str(args.llm_model_fallback),
            timeline_conflict_threshold=int(args.llm_timeline_threshold),
            options=opts,
        )
        human_report = render_human_report(
            data,
            extracted_work_experience=extracted,
            rule_report=rule_report,
            resume_sections=resume_sections,
        )
        if args.human_report_only:
            if args.human_report_output:
                out_path = Path(str(args.human_report_output))
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_text(human_report, encoding="utf-8")
                return 0
            if hasattr(sys.stdout, "reconfigure"):
                sys.stdout.reconfigure(encoding="utf-8")
            sys.stdout.write(human_report)
            return 0
        data["human_report"] = human_report
    elif args.validate_work_experience:
        extracted = _coerce_work_experience(data)
        data = validate_work_experience(extracted, source_path=str(input_path))
    elif args.extract_work_experience:
        extracted = _coerce_work_experience(data)
        data = extracted["items"] if args.experience_only else extracted
    json_kwargs: dict[str, Any] = {
        "ensure_ascii": False,
        "sort_keys": False,
        "indent": 2 if args.pretty else None,
    }
    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as f:
            f.write(json.dumps(data, **json_kwargs))
            f.write("\n")
    else:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        sys.stdout.write(json.dumps(data, **json_kwargs))
        sys.stdout.write("\n")
    return 0


def _extract_resume_sections(data: Any) -> dict[str, str]:
    if not isinstance(data, dict):
        return {}
    blocks = data.get("blocks", [])
    if not isinstance(blocks, list):
        return {}

    keywords = {
        "skills": {"技能", "专业技能", "技能清单", "技术栈", "技能栈", "核心技能"},
        "projects": {"项目经历", "项目经验", "主要项目", "代表项目"},
        "self_evaluation": {
            "自我评价",
            "个人总结",
            "个人评价",
            "自我总结",
            "个人优势",
            "自我描述",
        },
    }

    def norm(s: str) -> str:
        return _normalize_text(str(s or ""))

    def match_section(title: str) -> str:
        t = norm(title)
        if not t:
            return ""
        for sec, kws in keywords.items():
            for kw in kws:
                if t == kw or (kw in t and len(t) <= 24):
                    return sec
        return ""

    def is_heading(text: str, style: Any) -> bool:
        t = norm(text)
        if not t:
            return False
        style_name = ""
        if isinstance(style, dict):
            style_name = str(style.get("paragraph_style", "") or "")
        if style_name and ("Heading" in style_name or "标题" in style_name):
            if len(t) <= 30:
                return True
        return match_section(t) != ""

    current = ""
    acc: dict[str, list[str]] = {"skills": [], "projects": [], "self_evaluation": []}

    para_blocks: list[dict[str, Any]] = []
    for b in blocks:
        if not isinstance(b, dict):
            continue
        if b.get("type") == "paragraph":
            para_blocks.append(b)
        elif b.get("type") == "table":
            cps = b.get("cell_paragraphs", [])
            if isinstance(cps, list):
                para_blocks.extend([x for x in cps if isinstance(x, dict)])

    for b in para_blocks:
        if not isinstance(b, dict):
            continue
        if b.get("type") != "paragraph":
            continue
        text = norm(b.get("text", ""))
        if not text:
            continue
        style = b.get("style", {})
        if is_heading(text, style):
            current = match_section(text)
            continue
        if not current:
            continue
        acc[current].append(text)

    out: dict[str, str] = {}
    for sec, lines in acc.items():
        if not lines:
            continue
        joined = "\n".join(lines)
        out[sec] = joined[:4000]
    return out


def _extract_core_properties(doc: DocxDocument) -> dict[str, Any]:
    """Extract DOCX core properties into a JSON-friendly dictionary."""
    props = doc.core_properties
    return {
        "title": props.title or "",
        "author": props.author or "",
        "last_modified_by": props.last_modified_by or "",
        "created": props.created.isoformat() if props.created else "",
        "modified": props.modified.isoformat() if props.modified else "",
        "revision": props.revision or "",
        "subject": props.subject or "",
        "keywords": props.keywords or "",
        "comments": props.comments or "",
        "category": props.category or "",
        "language": props.language or "",
        "identifier": props.identifier or "",
        "version": props.version or "",
    }


def _extract_page_setup(section: Section) -> dict[str, Any]:
    """Extract section page setup information."""
    return {
        "orientation": str(section.orientation),
        "page_width_twips": int(section.page_width) if section.page_width else None,
        "page_height_twips": int(section.page_height) if section.page_height else None,
        "margin_top_twips": int(section.top_margin) if section.top_margin else None,
        "margin_bottom_twips": (
            int(section.bottom_margin) if section.bottom_margin else None
        ),
        "margin_left_twips": int(section.left_margin) if section.left_margin else None,
        "margin_right_twips": (
            int(section.right_margin) if section.right_margin else None
        ),
    }


def _iter_body_blocks(doc: DocxDocument) -> Iterator[dict[str, Any]]:
    """Iterate blocks in the document body in order."""
    for kind, obj in _iter_doc_body_nodes(doc):
        if kind == "paragraph":
            assert isinstance(obj, Paragraph)
            yield _paragraph_to_block(doc, obj, location="body")
        else:
            assert isinstance(obj, Table)
            yield _table_to_block(doc, obj, location="body")


def _iter_container_blocks(
    doc: DocxDocument, container: Any
) -> Iterator[dict[str, Any]]:
    """Iterate blocks inside a header/footer container in order."""
    element = getattr(container, "element", None) or getattr(
        container, "_element", None
    )
    if element is None:
        for p in getattr(container, "paragraphs", []):
            yield _paragraph_to_block(doc, p, location=_container_location(container))
        for t in getattr(container, "tables", []):
            yield _table_to_block(doc, t, location=_container_location(container))
        return

    for child in element.iterchildren():
        if child.tag.endswith("}p"):
            yield _paragraph_to_block(
                doc,
                Paragraph(child, container),
                location=_container_location(container),
            )
        elif child.tag.endswith("}tbl"):
            yield _table_to_block(
                doc,
                Table(child, container),
                location=_container_location(container),
            )


def _container_location(container: Any) -> LocationKind:
    """Infer a block location label for a given container."""
    name = container.__class__.__name__.lower()
    if "header" in name:
        return "header"
    if "footer" in name:
        return "footer"
    return "body"


def _iter_doc_body_nodes(
    doc: DocxDocument,
) -> Iterable[Tuple[BlockKind, Union[Paragraph, Table]]]:
    """Yield paragraph/table nodes from the underlying DOCX body XML."""
    body = doc.element.body
    for child in body.iterchildren():
        if child.tag.endswith("}p"):
            yield ("paragraph", Paragraph(child, doc))
        elif child.tag.endswith("}tbl"):
            yield ("table", Table(child, doc))


def _paragraph_to_block(
    doc: DocxDocument,
    paragraph: Paragraph,
    *,
    location: LocationKind,
    in_table: bool = False,
    table_pos: Optional[dict[str, int]] = None,
) -> dict[str, Any]:
    """Convert a DOCX paragraph into a JSON-compatible block."""
    fmt = paragraph.paragraph_format
    style_name = paragraph.style.name if paragraph.style is not None else ""
    runs = [_run_to_dict(doc, r) for r in paragraph.runs]
    images = _extract_images_from_paragraph(doc, paragraph)

    return {
        "type": "paragraph",
        "location": location,
        "in_table": in_table,
        "table_pos": table_pos,
        "text": paragraph.text,
        "style": {
            "paragraph_style": style_name,
            "alignment": (
                str(paragraph.alignment) if paragraph.alignment is not None else ""
            ),
            "line_spacing": fmt.line_spacing,
            "space_before_twips": int(fmt.space_before) if fmt.space_before else None,
            "space_after_twips": int(fmt.space_after) if fmt.space_after else None,
            "left_indent_twips": int(fmt.left_indent) if fmt.left_indent else None,
            "right_indent_twips": int(fmt.right_indent) if fmt.right_indent else None,
            "first_line_indent_twips": (
                int(fmt.first_line_indent) if fmt.first_line_indent else None
            ),
        },
        "runs": runs,
        "images": images,
    }


def _run_to_dict(doc: DocxDocument, run: Any) -> dict[str, Any]:
    """Convert a DOCX run into a JSON-compatible dictionary."""
    font = run.font
    color = ""
    if font.color is not None and font.color.rgb is not None:
        color = str(font.color.rgb)

    return {
        "text": run.text,
        "style": {
            "font_name": font.name or "",
            "font_size_pt": float(font.size.pt) if font.size is not None else None,
            "bold": bool(font.bold) if font.bold is not None else None,
            "italic": bool(font.italic) if font.italic is not None else None,
            "underline": bool(font.underline) if font.underline is not None else None,
            "color_rgb": color,
        },
        "images": _extract_images_from_run(doc, run),
    }


def _table_to_block(
    doc: DocxDocument,
    table: Table,
    *,
    location: LocationKind,
) -> dict[str, Any]:
    """Convert a DOCX table into a JSON-compatible block with merge metadata."""
    rows: list[list[dict[str, Any]]] = []
    cell_blocks: list[dict[str, Any]] = []
    images: list[dict[str, Any]] = []
    seen_tc: dict[Any, tuple[int, int]] = {}

    for r_idx, row in enumerate(table.rows):
        row_cells: list[dict[str, Any]] = []
        for c_idx, cell in enumerate(row.cells):
            tc = getattr(cell, "_tc", None)
            tc_key: Any = tc if tc is not None else ("cell", r_idx, c_idx)
            is_duplicate = tc_key in seen_tc
            origin = seen_tc.get(tc_key)
            if not is_duplicate:
                seen_tc[tc_key] = (r_idx, c_idx)

            cell_text = ""
            if not is_duplicate:
                cell_text = "\n".join([p.text for p in cell.paragraphs]).strip()

            cell_info: dict[str, Any] = {"row": r_idx, "col": c_idx, "text": cell_text}
            merge = _extract_cell_merge_info(tc)
            if merge:
                cell_info["merge"] = merge
            if is_duplicate and origin is not None:
                cell_info["merged_to"] = {"row": origin[0], "col": origin[1]}

            row_cells.append(cell_info)

            if not is_duplicate:
                for p in cell.paragraphs:
                    block = _paragraph_to_block(
                        doc,
                        p,
                        location=location,
                        in_table=True,
                        table_pos={"row": r_idx, "col": c_idx},
                    )
                    cell_blocks.append(block)
                    images.extend(block.get("images", []))

        rows.append(row_cells)

    return {
        "type": "table",
        "location": location,
        "rows": rows,
        "cell_paragraphs": cell_blocks,
        "images": images,
    }


def _extract_cell_merge_info(tc: Any) -> dict[str, Any]:
    """Extract horizontal/vertical merge info from a DOCX table cell XML node."""
    if tc is None:
        return {}

    grid_span_nodes = tc.xpath("./w:tcPr/w:gridSpan")
    vmerge_nodes = tc.xpath("./w:tcPr/w:vMerge")

    colspan: Optional[int] = None
    if grid_span_nodes:
        val = grid_span_nodes[0].get(qn("w:val"))
        if val:
            try:
                colspan = int(val)
            except ValueError:
                colspan = None

    vmerge: str = ""
    if vmerge_nodes:
        val = vmerge_nodes[0].get(qn("w:val"))
        vmerge = val if val else "continue"

    out: dict[str, Any] = {}
    if colspan is not None and colspan > 1:
        out["colspan"] = colspan
    if vmerge:
        out["vmerge"] = vmerge
    return out


def _extract_images_from_paragraph(
    doc: DocxDocument, paragraph: Paragraph
) -> list[dict[str, Any]]:
    """Extract image references from all runs in a paragraph."""
    images: list[dict[str, Any]] = []
    for run in paragraph.runs:
        images.extend(_extract_images_from_run(doc, run))
    return images


def _extract_images_from_run(doc: DocxDocument, run: Any) -> list[dict[str, Any]]:
    """Extract image references from a single run."""
    results: list[dict[str, Any]] = []
    blips = run.element.xpath(".//a:blip")
    for blip in blips:
        r_id = blip.get(qn("r:embed"))
        if not r_id:
            continue
        part = doc.part.related_parts.get(r_id)
        if not isinstance(part, ImagePart):
            continue
        blob = part.blob
        partname = str(getattr(part, "partname", ""))
        filename = partname.split("/")[-1] if "/" in partname else partname
        results.append(
            {
                "rId": r_id,
                "content_type": getattr(part, "content_type", ""),
                "filename": filename,
                "bytes_len": len(blob),
                "bytes_sha256": hashlib.sha256(blob).hexdigest(),
            }
        )
    return results


def _collect_unique_images(
    body_blocks: list[dict[str, Any]], sections: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Collect unique images (by sha256) from body and sections."""
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []

    def iter_images() -> Iterator[dict[str, Any]]:
        for b in body_blocks:
            for img in b.get("images", []):
                yield img
        for s in sections:
            for img in _images_from_section(s):
                yield img

    for img in iter_images():
        key = img.get("bytes_sha256", "")
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(img)
    return unique


def _images_from_section(section: dict[str, Any]) -> Iterator[dict[str, Any]]:
    """Iterate images found in header/footer blocks of a section."""
    for block in section.get("header", {}).get("blocks", []):
        for img in block.get("images", []):
            yield img
    for block in section.get("footer", {}).get("blocks", []):
        for img in block.get("images", []):
            yield img


def _load_input_data(input_path: Path) -> Any:
    """Load parsed document data from a .docx input or a JSON file."""
    if input_path.suffix.lower() == ".docx":
        return parse_docx(input_path)
    with input_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def _coerce_work_experience(data: Any) -> dict[str, Any]:
    """Coerce input into the standard extracted work experience structure."""
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        tables = data.get("tables", [])
        if not isinstance(tables, list):
            tables = []
        return {"tables": tables, "items": data.get("items", [])}
    if isinstance(data, list):
        items = [x for x in data if isinstance(x, dict)]
        return {"tables": [], "items": items}
    if isinstance(data, dict):
        return extract_work_experience(data)
    raise ValueError("无法识别的输入结构：需要 docx 解析结果、抽取结果，或 items 列表。")


def extract_work_experience(doc_json: dict[str, Any]) -> dict[str, Any]:
    """Extract work experience items from parsed document JSON."""
    tables: list[dict[str, Any]] = []
    items: list[dict[str, Any]] = []

    for table_block, ref in _iter_all_table_blocks(doc_json):
        header_row = _find_experience_header_row(table_block)
        if header_row is None:
            continue
        column_map = _build_experience_column_map(table_block, header_row)
        if not column_map:
            continue

        table_meta = {
            **ref,
            "header_row": header_row,
            "columns": column_map,
        }
        tables.append(table_meta)

        extracted_rows = _extract_experience_rows(table_block, header_row, column_map)
        for r in extracted_rows:
            r["table_ref"] = ref
        items.extend(extracted_rows)

    return {"tables": tables, "items": items}


def _iter_all_table_blocks(
    doc_json: dict[str, Any],
) -> Iterator[tuple[dict[str, Any], dict[str, Any]]]:
    """Iterate all table blocks from body and sections, with references."""
    for idx, b in enumerate(doc_json.get("blocks", [])):
        if isinstance(b, dict) and b.get("type") == "table":
            yield b, {
                "scope": "body",
                "block_index": idx,
                "location": b.get("location", "body"),
            }

    for s_idx, section in enumerate(doc_json.get("sections", [])):
        for area in ("header", "footer"):
            blocks = section.get(area, {}).get("blocks", [])
            for b_idx, b in enumerate(blocks):
                if isinstance(b, dict) and b.get("type") == "table":
                    yield b, {
                        "scope": "section",
                        "section_index": s_idx,
                        "area": area,
                        "block_index": b_idx,
                        "location": b.get("location", area),
                    }


def _find_experience_header_row(table_block: dict[str, Any]) -> Optional[int]:
    """Find the header row index for a work experience table, if any."""
    rows = table_block.get("rows", [])
    if not isinstance(rows, list) or not rows:
        return None

    max_scan = min(len(rows), 12)
    for r_idx in range(max_scan):
        row_cells = rows[r_idx]
        if not isinstance(row_cells, list) or not row_cells:
            continue
        row_text = " ".join(
            t
            for t in (
                _normalize_text(_cell_text_resolved(table_block, r_idx, c_idx))
                for c_idx in range(len(row_cells))
            )
            if t
        )
        if not row_text:
            continue
        if "时间" not in row_text:
            continue
        if not any(k in row_text for k in ("项目", "类似", "参加", "经历")):
            continue
        if not any(k in row_text for k in ("职务", "岗位", "担任")):
            continue
        return r_idx
    return None


def _build_experience_column_map(
    table_block: dict[str, Any], header_row: int
) -> dict[str, dict[str, Any]]:
    """Build a semantic column map from the header row."""
    header_cells = table_block.get("rows", [])[header_row]
    if not isinstance(header_cells, list) or not header_cells:
        return {}

    labels: list[str] = []
    last = ""
    for c_idx in range(len(header_cells)):
        t = _normalize_text(_cell_text_resolved(table_block, header_row, c_idx))
        if not t:
            t = last
        if t:
            last = t
        labels.append(t)

    segments = _build_header_segments(labels)
    mapped: dict[str, dict[str, Any]] = {}
    for start, end, label in segments:
        kind = _classify_experience_header(label)
        if not kind:
            continue
        if kind in mapped:
            continue
        mapped[kind] = {"label": label, "start_col": start, "end_col": end}
    return mapped


def _extract_experience_rows(
    table_block: dict[str, Any],
    header_row: int,
    column_map: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Extract structured work experience rows after the header row."""
    rows = table_block.get("rows", [])
    if not isinstance(rows, list) or not rows:
        return []

    out: list[dict[str, Any]] = []
    empty_streak = 0
    for r_idx in range(header_row + 1, len(rows)):
        row_cells = rows[r_idx]
        if not isinstance(row_cells, list) or not row_cells:
            continue

        row_visible = " ".join(
            _normalize_text(_cell_text_original(table_block, r_idx, c_idx))
            for c_idx in range(len(row_cells))
        ).strip()
        if not row_visible:
            empty_streak += 1
            if empty_streak >= 2:
                break
            continue
        empty_streak = 0

        time_raw = _extract_segment_text(table_block, r_idx, column_map.get("time"))
        project = _extract_segment_text(table_block, r_idx, column_map.get("project"))
        role = _extract_segment_text(table_block, r_idx, column_map.get("role"))
        contact_raw = _extract_segment_text(
            table_block, r_idx, column_map.get("contact")
        )

        if not any([time_raw, project, role, contact_raw]):
            continue

        time_parsed = _parse_time_range(time_raw)
        contact = _extract_contact(contact_raw)

        out.append(
            {
                "row_index": r_idx,
                "time_raw": time_raw,
                "time_start": time_parsed.get("start", ""),
                "time_end": time_parsed.get("end", ""),
                "project": project,
                "role": role,
                "contact_raw": contact_raw,
                "contact_name": contact.get("name", ""),
                "contact_phones": contact.get("phones", []),
            }
        )
    return out


def _build_header_segments(labels: list[str]) -> list[tuple[int, int, str]]:
    """Build contiguous segments based on label changes across columns."""
    if not labels:
        return []
    segments: list[tuple[int, int, str]] = []
    start = 0
    current = labels[0]
    for idx in range(1, len(labels)):
        if labels[idx] != current:
            segments.append((start, idx - 1, current))
            start = idx
            current = labels[idx]
    segments.append((start, len(labels) - 1, current))
    return segments


def _classify_experience_header(label: str) -> str:
    """Classify a header label into a semantic column kind."""
    t = _normalize_text(label)
    if not t:
        return ""
    if "时间" in t or "起止" in t or "日期" in t:
        return "time"
    if any(k in t for k in ("项目", "类似", "参加", "经历", "业绩")):
        return "project"
    if any(k in t for k in ("职务", "岗位", "担任", "角色", "职位")):
        return "role"
    if any(k in t for k in ("采购人", "联系人", "联系电话", "电话", "手机", "联系方式")):
        return "contact"
    return ""


def _extract_segment_text(
    table_block: dict[str, Any], row_index: int, seg: Optional[dict[str, Any]]
) -> str:
    """Extract text for a semantic segment within a row."""
    if not seg:
        return ""
    start = int(seg.get("start_col", 0))
    end = int(seg.get("end_col", start))
    parts: list[str] = []
    for c_idx in range(start, end + 1):
        t = _normalize_text(_cell_text_original(table_block, row_index, c_idx))
        if t:
            parts.append(t)
    if parts:
        return " ".join(parts).strip()
    return _normalize_text(_cell_text_resolved(table_block, row_index, start))


def _cell_text_original(
    table_block: dict[str, Any], row_index: int, col_index: int
) -> str:
    """Get the raw text stored for a table cell."""
    cell = _get_cell(table_block, row_index, col_index)
    if not isinstance(cell, dict):
        return ""
    return str(cell.get("text", "") or "")


def _cell_text_resolved(
    table_block: dict[str, Any], row_index: int, col_index: int
) -> str:
    """Get the resolved text for a cell, following merged cell references."""
    cell = _get_cell(table_block, row_index, col_index)
    if not isinstance(cell, dict):
        return ""
    merged_to = cell.get("merged_to")
    if isinstance(merged_to, dict) and "row" in merged_to and "col" in merged_to:
        origin = _get_cell(table_block, int(merged_to["row"]), int(merged_to["col"]))
        if isinstance(origin, dict):
            return str(origin.get("text", "") or "")
    return str(cell.get("text", "") or "")


def _get_cell(table_block: dict[str, Any], row_index: int, col_index: int) -> Any:
    """Safely get a cell dictionary from a table block."""
    rows = table_block.get("rows", [])
    if not isinstance(rows, list):
        return None
    if row_index < 0 or row_index >= len(rows):
        return None
    row = rows[row_index]
    if not isinstance(row, list):
        return None
    if col_index < 0 or col_index >= len(row):
        return None
    return row[col_index]


def _normalize_text(text: str) -> str:
    """Normalize whitespace and punctuation in extracted text."""
    s = str(text or "").strip()
    s = s.replace("\u3000", " ")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def _parse_time_range(raw: str) -> dict[str, str]:
    """Parse a time range like '2024-07 至 2025-04' into start/end."""
    s = _normalize_text(raw)
    if not s:
        return {"start": "", "end": ""}

    s = s.replace("—", "-").replace("－", "-").replace("–", "-").replace("~", "-")
    s = s.replace("到", "至")
    s = re.sub(r"\s*至\s*", "至", s)

    if "至今" in s or s.endswith("至今") or s.endswith("至 今") or s.endswith("至今"):
        matches = re.findall(r"(\d{4})[-./年](\d{1,2})", s)
        if matches:
            y, mth = matches[0]
            y_i = int(y)
            m_i = int(mth)
            return {"start": f"{y_i:04d}-{m_i:02d}", "end": "present"}
        return {"start": "", "end": "present"}

    m = re.search(
        r"(?P<y1>\d{4})\s*[-./年]\s*(?P<m1>\d{1,2})"
        r"(?:\s*至\s*(?P<y2>\d{4})\s*[-./年]\s*(?P<m2>\d{1,2}))?",
        s,
    )
    if not m:
        return {"start": s, "end": ""}

    y1 = int(m.group("y1"))
    m1 = int(m.group("m1"))
    start = f"{y1:04d}-{m1:02d}"
    if m.group("y2") and m.group("m2"):
        y2 = int(m.group("y2"))
        m2 = int(m.group("m2"))
        end = f"{y2:04d}-{m2:02d}"
        return {"start": start, "end": end}
    return {"start": start, "end": ""}


def _extract_contact(raw: str) -> dict[str, Any]:
    """Extract contact name and phone numbers from a cell."""
    s = _normalize_text(raw)
    if not s:
        return {"name": "", "phones": []}

    phones = re.findall(r"1\d{10}", s)
    name = s
    for p in phones:
        name = name.replace(p, " ")
    name = re.sub(r"[()（）\-—]", " ", name)
    name = _normalize_text(name)
    return {"name": name, "phones": phones}


if __name__ == "__main__":
    raise SystemExit(main())
