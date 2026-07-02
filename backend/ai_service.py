"""AI service — Ollama Qwen via local LLM module."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from backend import llm, prompts
from backend.config import OLLAMA_MODEL
from backend.models import AIResponse, CVContent, WritingTone


def check_ollama() -> Dict[str, Any]:
    return llm.check_ollama()


def get_model_name() -> str:
    return OLLAMA_MODEL


def _call_llm(prompt: str, max_tokens: int = 1200) -> str:
    return llm.generate_text(prompt, max_new_tokens=max_tokens)


def _extract_json(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    if not text:
        return {}

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError:
            pass

    brace = re.search(r"\{[\s\S]*\}", text)
    if brace:
        try:
            return json.loads(brace.group(0))
        except json.JSONDecodeError:
            pass

    return {"raw_text": text}


def _unwrap_section_value(section: str, value: Any) -> Any:
    """Fix nested LLM JSON (e.g. summary wrapped in an extra dict)."""
    if value is None:
        return value

    if isinstance(value, dict):
        if section in value and len(value) == 1:
            return _unwrap_section_value(section, value[section])
        for key in (section, "text", "content", "enhanced", "value"):
            if key in value:
                candidate = value[key]
                if section == "summary" and isinstance(candidate, str):
                    return candidate
                if section != "summary" and candidate is not None:
                    return _unwrap_section_value(section, candidate)

    return value


def _normalize_section_patch(section: str, parsed: Dict[str, Any]) -> Dict[str, Any]:
    """Turn section regeneration JSON into a flat CVContent field update."""
    if not parsed or ("raw_text" in parsed and len(parsed) == 1):
        return {}

    if section in parsed:
        value = _unwrap_section_value(section, parsed[section])
    elif len(parsed) == 1:
        value = _unwrap_section_value(section, next(iter(parsed.values())))
    else:
        value = _unwrap_section_value(section, parsed.get(section))

    if value is None and section in parsed:
        value = parsed[section]

    if section == "summary" and not isinstance(value, str):
        if isinstance(value, dict):
            value = str(value.get("summary") or value.get("text") or "")
        else:
            value = str(value or "")

    return {section: value}


def _coerce_cv_fields(data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize full CV JSON before Pydantic validation."""
    out = {k: v for k, v in data.items() if k in CVContent.model_fields}
    if isinstance(out.get("summary"), dict):
        out["summary"] = _unwrap_section_value("summary", out["summary"])
        if not isinstance(out["summary"], str):
            out["summary"] = str(out.get("summary") or "")
    return out


def _merge_content(base: CVContent, patch: Dict[str, Any]) -> CVContent:
    data = base.model_dump()
    patch = _coerce_cv_fields(patch)
    for key, value in patch.items():
        if value is None or key not in data:
            continue
        if key == "contact" and isinstance(value, dict):
            contact = dict(data.get("contact") or {})
            for k, v in value.items():
                if v:
                    contact[k] = v
            data["contact"] = contact
            continue
        if isinstance(value, list) and len(value) == 0:
            continue
        if isinstance(value, str) and not value.strip() and data.get(key):
            continue
        data[key] = value
    return CVContent(**data)



def _build_chat_context(history: List[Dict[str, str]], content: CVContent) -> str:
    lines: List[str] = []
    for item in history:
        if item.get("role") == "user":
            lines.append(item.get("content", ""))
    lines.append("\n--- Data already collected in CV ---")
    lines.append(json.dumps(content.model_dump(), indent=2, ensure_ascii=False))
    return "\n".join(p for p in lines if p.strip())


def generate_cv(
    raw_input: str,
    tone: WritingTone = WritingTone.PROFESSIONAL,
    target_role: str = "",
    industry: str = "",
) -> AIResponse:
    prompt = prompts.generate_cv_prompt(raw_input, tone, target_role, industry)
    raw = _call_llm(prompt, max_tokens=2500)
    parsed = _extract_json(raw)

    if "raw_text" in parsed and len(parsed) == 1:
        return AIResponse(success=False, message="AI did not return valid JSON", data={"raw": raw})

    try:
        content = CVContent(**_coerce_cv_fields(parsed))
    except Exception as exc:
        return AIResponse(success=False, message=str(exc), data={"raw": raw, "parsed": parsed})

    suggestions = _detect_missing_fields(content)
    return AIResponse(success=True, data={"content": content.model_dump()}, suggestions=suggestions)


def regenerate_section(
    section: str,
    content: CVContent,
    tone: WritingTone = WritingTone.PROFESSIONAL,
    instructions: str = "",
) -> AIResponse:
    prompt = prompts.regenerate_section_prompt(section, content, tone, instructions)
    raw = _call_llm(prompt, max_tokens=1000)
    parsed = _extract_json(raw)

    if "raw_text" in parsed and len(parsed) == 1:
        return AIResponse(success=False, message="AI did not return valid JSON", data={"raw": raw})

    patch = _normalize_section_patch(section, parsed)
    if section not in patch:
        return AIResponse(
            success=False,
            message=f"AI response missing '{section}' field",
            data={"raw": raw, "parsed": parsed},
        )

    try:
        updated = _merge_content(content, patch)
    except Exception as exc:
        return AIResponse(success=False, message=str(exc), data={"raw": raw, "parsed": parsed})

    return AIResponse(success=True, data={"content": updated.model_dump(), "section": section})


def enhance_text(text: str, context: str = "", tone: WritingTone = WritingTone.PROFESSIONAL) -> AIResponse:
    prompt = prompts.enhance_text_prompt(text, context, tone)
    raw = _call_llm(prompt, max_tokens=600)
    parsed = _extract_json(raw)
    enhanced = parsed.get("enhanced", text)
    changes = parsed.get("changes", [])
    return AIResponse(
        success=True,
        data={"enhanced": enhanced, "original": text},
        suggestions=changes if isinstance(changes, list) else [],
    )


def analyze_cv(content: CVContent, target_role: str = "") -> AIResponse:
    prompt = prompts.analyze_cv_prompt(content, target_role)
    raw = _call_llm(prompt, max_tokens=1000)
    parsed = _extract_json(raw)
    return AIResponse(success=True, data=parsed, suggestions=parsed.get("suggestions", []))


def optimize_for_job(
    content: CVContent,
    job_description: str,
    tone: WritingTone = WritingTone.PROFESSIONAL,
) -> AIResponse:
    prompt = prompts.optimize_job_prompt(content, job_description, tone)
    raw = _call_llm(prompt, max_tokens=1200)
    parsed = _extract_json(raw)
    return AIResponse(success=True, data=parsed, suggestions=parsed.get("ats_tips", []))


def generate_cover_letter(
    content: CVContent,
    job_title: str,
    company: str,
    job_description: str = "",
    tone: WritingTone = WritingTone.PROFESSIONAL,
) -> AIResponse:
    prompt = prompts.cover_letter_prompt(content, job_title, company, job_description, tone)
    raw = _call_llm(prompt, max_tokens=1000)
    parsed = _extract_json(raw)
    return AIResponse(success=True, data=parsed)


def career_guidance(
    content: CVContent,
    target_role: str = "",
    years_experience: str = "",
) -> AIResponse:
    prompt = prompts.career_guidance_prompt(content, target_role, years_experience)
    raw = _call_llm(prompt, max_tokens=1000)
    parsed = _extract_json(raw)
    return AIResponse(success=True, data=parsed)


def linkedin_content(content: CVContent, tone: WritingTone = WritingTone.PROFESSIONAL) -> AIResponse:
    prompt = prompts.linkedin_prompt(content, tone)
    raw = _call_llm(prompt, max_tokens=800)
    parsed = _extract_json(raw)
    return AIResponse(success=True, data=parsed)


def _apply_generated_cv(base: CVContent, generated: Dict[str, Any]) -> CVContent:
    """Apply full CV generation output, preserving contact fields not re-mentioned."""
    new = _coerce_cv_fields(generated)
    data = base.model_dump()
    for key, value in new.items():
        if value is None:
            continue
        if key == "contact" and isinstance(value, dict):
            contact = dict(data.get("contact") or {})
            for k, v in value.items():
                if v:
                    contact[k] = v
            data["contact"] = contact
        elif isinstance(value, list) and len(value) == 0:
            continue
        elif isinstance(value, str) and not value.strip() and data.get(key):
            continue
        else:
            data[key] = value
    return CVContent(**data)


def _make_chat_reply(before: CVContent, after: CVContent) -> str:
    parts: List[str] = []
    if after.full_name and after.full_name != before.full_name:
        parts.append("added your name and header")
    if after.summary and not before.summary.strip():
        parts.append("written a professional summary")
    elif after.summary and after.summary != before.summary:
        parts.append("refined your summary")
    if after.experience and not before.experience:
        parts.append("built your work experience with achievement bullets")
    elif len(after.experience) > len(before.experience):
        parts.append("updated your experience")
    if after.education and not before.education:
        parts.append("added education")
    if after.skills and len(after.skills) > len(before.skills or []):
        parts.append("expanded your skills")
    if parts:
        return f"I've {', '.join(parts)}. Your CV preview on the right is updated — keep chatting to refine it."
    return "Your CV is updated with everything you've shared so far. Keep adding details or say 'download PDF' when ready."


def _is_export_only(message: str) -> bool:
    t = (message or "").strip().lower()
    if len(t) > 60:
        return False
    return bool(re.search(r"\b(download|export|save|get)\b.*\b(pdf|docx|word)\b", t)) or t in {"pdf", "docx"}


def chat_cv(
    message: str,
    history: List[Dict[str, str]],
    content: CVContent,
    tone: WritingTone = WritingTone.PROFESSIONAL,
) -> AIResponse:
    action = None
    if re.search(r"export_pdf|download.*pdf|\bpdf\b", message or "", re.I):
        action = "export_pdf"
    elif re.search(r"export_docx|download.*(docx|word)", message or "", re.I):
        action = "export_docx"

    if action and _is_export_only(message):
        reply = "Your download is starting now."
        return AIResponse(
            success=True,
            message=reply,
            data={"reply": reply, "content": content.model_dump(), "action": action},
        )

    # Every message: rebuild full CV from entire conversation (from first message onward)
    context = _build_chat_context(history, content)
    context += (
        f"\n\nLatest user message: {message}\n\n"
        "Build the most complete professional CV possible from ALL messages above. "
        "Fill summary, experience bullets, skills, and education immediately — do not wait for more info."
    )
    gen = generate_cv(context, tone, content.job_title or "", "")

    if gen.success and gen.data.get("content"):
        updated = _apply_generated_cv(content, gen.data["content"])
        reply = _make_chat_reply(content, updated)
        return AIResponse(
            success=True,
            message=reply,
            data={
                "reply": reply,
                "content": updated.model_dump(),
                "action": action or gen.data.get("action"),
            },
            suggestions=gen.suggestions,
        )

    return AIResponse(
        success=False,
        message=gen.message or "Could not update CV. Please try again.",
        data=gen.data,
    )


def _detect_missing_fields(content: CVContent) -> List[str]:
    missing: List[str] = []
    if not content.full_name.strip():
        missing.append("Full name is missing")
    if not content.contact.email.strip():
        missing.append("Email is missing")
    if not content.summary.strip():
        missing.append("Professional summary is missing")
    if not content.experience:
        missing.append("Work experience section is empty")
    if not content.skills:
        missing.append("Skills section is empty")
    if not content.education:
        missing.append("Education section is empty")
    return missing
