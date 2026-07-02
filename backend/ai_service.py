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


def _merge_content(base: CVContent, patch: Dict[str, Any]) -> CVContent:
    data = base.model_dump()
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
        content = CVContent(**{k: v for k, v in parsed.items() if k in CVContent.model_fields})
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

    updated = _merge_content(content, parsed)
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
