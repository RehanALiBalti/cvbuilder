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

    certs = out.get("certifications") or []
    if certs and isinstance(certs[0], str):
        out["certifications"] = [{"name": c, "issuer": "", "date": ""} for c in certs]

    langs = out.get("languages") or []
    if langs and isinstance(langs[0], str):
        coerced = []
        for lang in langs:
            if isinstance(lang, str):
                if "—" in lang or " - " in lang:
                    parts = re.split(r"\s*[—\-]\s*", lang, maxsplit=1)
                    coerced.append({"name": parts[0].strip(), "proficiency": parts[1].strip() if len(parts) > 1 else ""})
                else:
                    coerced.append({"name": lang, "proficiency": ""})
            else:
                coerced.append(lang)
        out["languages"] = coerced

    groups = out.get("skill_groups") or []
    if groups and not out.get("skills"):
        flat: List[str] = []
        for g in groups:
            if isinstance(g, dict):
                flat.extend(g.get("items") or [])
        out["skills"] = flat
    elif out.get("skills") and not groups:
        out["skill_groups"] = [{"category": "Core Skills", "items": out["skills"]}]

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


def _make_chat_reply(before: CVContent, after: CVContent, _suggestions: List[str] | None = None) -> str:
    parts: List[str] = []
    if after.full_name and after.full_name != before.full_name:
        parts.append("updated your header")
    if after.summary and not before.summary.strip():
        parts.append("written a professional summary")
    elif after.summary and after.summary != before.summary:
        parts.append("improved your summary")
    if after.experience and not before.experience:
        parts.append("built achievement-oriented experience bullets")
    elif after.experience and after.experience != before.experience:
        parts.append("enhanced your experience section")
    if after.projects and not before.projects:
        parts.append("added project descriptions with impact")
    if after.skill_groups and not before.skill_groups:
        parts.append("organized skills by category")
    elif after.skills and len(after.skills or []) > len(before.skills or []):
        parts.append("expanded your skills")
    if after.education and not before.education:
        parts.append("added education")
    if after.certifications and not before.certifications:
        parts.append("formatted certifications")
    if after.languages and not before.languages:
        parts.append("added languages with proficiency levels")

    if parts:
        return f"I've {', '.join(parts)}. Check the live preview on the right."
    return "Your CV is updated. Keep sharing details or say 'download PDF' when ready."


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
        "Build the most complete modern professional CV from ALL messages above. "
        "Improve summary, achievement-oriented experience bullets, categorized skills, "
        "project impact, formatted certifications and languages. "
        "Never fabricate employers, degrees, or credentials not mentioned by the user."
    )
    gen = generate_cv(context, tone, content.job_title or "", "")

    if gen.success and gen.data.get("content"):
        updated = _apply_generated_cv(content, gen.data["content"])
        suggestions = _suggest_missing_sections(updated)
        reply = _make_chat_reply(content, updated, suggestions)
        return AIResponse(
            success=True,
            message=reply,
            data={
                "reply": reply,
                "content": updated.model_dump(),
                "action": action or gen.data.get("action"),
                "missing_sections": suggestions,
            },
            suggestions=suggestions,
        )

    return AIResponse(
        success=False,
        message=gen.message or "Could not update CV. Please try again.",
        data=gen.data,
    )


def _suggest_missing_sections(content: CVContent) -> List[str]:
    """Suggest missing sections — never fabricate data, only guide the user."""
    suggestions: List[str] = []
    if not content.full_name.strip():
        suggestions.append("Add your full name.")
    if not content.contact.email.strip():
        suggestions.append("Add your email address for recruiters to contact you.")
    if not content.contact.phone.strip():
        suggestions.append("Add a phone number (optional but recommended).")
    if not content.summary.strip():
        suggestions.append("Add a Professional Summary — share your role, years of experience, and top strengths.")
    if not content.experience:
        suggestions.append("Add Work Experience — company name, job title, dates, and key responsibilities.")
    else:
        for exp in content.experience:
            if not exp.bullets or all(len(b.strip()) < 20 for b in exp.bullets):
                suggestions.append(f"Add achievement bullets for {exp.role or 'your role'} at {exp.company or 'your company'}.")
    if not content.education:
        suggestions.append("Add Education — degree, institution, and graduation year.")
    if not content.skills and not content.skill_groups:
        suggestions.append("Add Skills — technical and soft skills relevant to your target role.")
    if not content.projects:
        role = (content.job_title or "").lower()
        if any(k in role for k in ("developer", "engineer", "software", "data", "devops")):
            suggestions.append("Consider adding Projects — share 1-2 projects with tech stack and impact.")
    if not content.certifications:
        suggestions.append("Add Certifications if you have any (e.g. AWS, PMP) — only real ones.")
    if not content.languages:
        suggestions.append("Add Languages with proficiency (e.g. English — Fluent, Urdu — Native).")
    if not content.contact.linkedin.strip() and not content.contact.github.strip():
        suggestions.append("Add LinkedIn or GitHub profile URL for a stronger professional presence.")
    return suggestions


def _detect_missing_fields(content: CVContent) -> List[str]:
    return _suggest_missing_sections(content)
