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
        if value is not None and key in data:
            data[key] = value
    return CVContent(**data)


def generate_cv(
    raw_input: str,
    tone: WritingTone = WritingTone.PROFESSIONAL,
    target_role: str = "",
    industry: str = "",
) -> AIResponse:
    prompt = prompts.generate_cv_prompt(raw_input, tone, target_role, industry)
    raw = _call_llm(prompt, max_tokens=1500)
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


def chat_cv(
    message: str,
    history: List[Dict[str, str]],
    content: CVContent,
    tone: WritingTone = WritingTone.PROFESSIONAL,
) -> AIResponse:
    prompt = prompts.chat_cv_prompt(message, history, content, tone)
    raw = _call_llm(prompt, max_tokens=2000)
    parsed = _extract_json(raw)

    if "raw_text" in parsed and len(parsed) == 1:
        return AIResponse(success=False, message="AI did not return valid JSON", data={"raw": raw})

    reply = parsed.get("reply") or parsed.get("message") or "CV updated."
    cv_data = parsed.get("content") or parsed
    action = parsed.get("action")

    if isinstance(cv_data, dict) and "reply" in cv_data and "content" in cv_data:
        reply = cv_data.get("reply", reply)
        cv_data = cv_data.get("content", content.model_dump())
    elif isinstance(cv_data, dict) and "full_name" not in cv_data and "content" in parsed:
        cv_data = parsed["content"]

    try:
        if isinstance(cv_data, dict) and cv_data:
            updated = _merge_content(content, cv_data)
        else:
            updated = content
    except Exception as exc:
        return AIResponse(
            success=False,
            message=str(exc),
            data={"raw": raw, "parsed": parsed, "reply": reply},
        )

    return AIResponse(
        success=True,
        message=reply,
        data={
            "reply": reply,
            "content": updated.model_dump(),
            "action": action,
        },
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
