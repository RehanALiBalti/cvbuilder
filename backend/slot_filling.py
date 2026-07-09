"""Slot-filling CV extraction — extraction-only Qwen call, safe JSON merge, missing-field questions."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from backend import llm, prompts
from backend.config import SLOT_FILLING_MODE
from backend.models import AIResponse, CVContent
from backend.slot_schema import (
    EDUCATION_ITEM_KEYS,
    EXPERIENCE_ITEM_KEYS,
    SLOT_TOP_LEVEL_KEYS,
    cv_content_to_slot_view,
    slot_patch_to_cv_content,
)

logger = logging.getLogger(__name__)

# --- Missing-field definitions (priority order) --------------------------------

FIELD_TYPE_OPTIONS = [
    "Software Development",
    "Marketing",
    "Sales",
    "Design",
    "Finance",
    "Healthcare",
    "Education",
    "Other",
]

EXPERIENCE_LEVEL_OPTIONS = [
    "Student / Fresh Graduate",
    "Junior",
    "Mid-Level",
    "Senior",
]

MISSING_FIELD_DEFS: List[Dict[str, Any]] = [
    {
        "key": "name",
        "cv_key": "full_name",
        "label": "Full name",
        "type": "text",
        "priority": 1,
        "question": "What is your full name?",
    },
    {
        "key": "jobTitle",
        "cv_key": "job_title",
        "label": "Target job title",
        "type": "text",
        "priority": 2,
        "question": "What job title are you targeting?",
    },
    {
        "key": "fieldType",
        "label": "Field type",
        "type": "choice",
        "priority": 3,
        "question": "Which field are you targeting?",
        "options": FIELD_TYPE_OPTIONS,
        "meta_only": True,
    },
    {
        "key": "experienceLevel",
        "label": "Experience level",
        "type": "choice",
        "priority": 4,
        "question": "What is your experience level?",
        "options": EXPERIENCE_LEVEL_OPTIONS,
        "meta_only": True,
    },
    {
        "key": "email",
        "cv_key": "contact.email",
        "label": "Email address",
        "type": "text",
        "priority": 5,
        "question": "What email should recruiters use to contact you?",
        "group": "contact",
    },
    {
        "key": "phone",
        "cv_key": "contact.phone",
        "label": "Phone number",
        "type": "text",
        "priority": 6,
        "question": "What is your phone number?",
        "group": "contact",
    },
    {
        "key": "city",
        "cv_key": "contact.location",
        "label": "City / location",
        "type": "text",
        "priority": 7,
        "question": "Which city or country are you based in?",
    },
    {
        "key": "skills",
        "cv_key": "skills",
        "label": "Skills",
        "type": "text",
        "priority": 8,
        "question": "What are your main skills? List them separated by commas.",
    },
    {
        "key": "experienceOrEducation",
        "label": "Experience or education",
        "type": "text",
        "priority": 9,
        "question": "Share your work experience or education (degree, school, year).",
        "composite": True,
    },
]


def is_slot_filling_enabled() -> bool:
    return SLOT_FILLING_MODE


def parse_qwen_json_response(response: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Parse Qwen output into a dict. Returns (data, error_message).
    Rejects markdown-only failures and raw_text fallbacks.
    """
    text = (response or "").strip()
    if not text:
        return None, "AI returned an empty response. Please try again."

    if text.startswith("Error calling Ollama"):
        logger.warning("Ollama error: %s", text[:200])
        return None, "AI is temporarily unavailable. Please try again in a moment."

    try:
        data = json.loads(text)
        if isinstance(data, dict):
            if "raw_text" in data and len(data) == 1:
                return None, "AI did not return valid JSON. Please try again."
            return data, None
    except json.JSONDecodeError:
        pass

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fence:
        try:
            data = json.loads(fence.group(1).strip())
            if isinstance(data, dict):
                return data, None
        except json.JSONDecodeError:
            pass

    brace = re.search(r"\{[\s\S]*\}", text)
    if brace:
        try:
            data = json.loads(brace.group(0))
            if isinstance(data, dict):
                return data, None
        except json.JSONDecodeError:
            pass

    logger.debug("Failed to parse Qwen JSON (first 300 chars): %s", text[:300])
    return None, "AI did not return valid JSON. Please try again."


def validate_slot_schema(data: Any) -> Tuple[bool, Optional[str]]:
    """Validate extracted slot JSON shape before merging."""
    if not isinstance(data, dict):
        return False, "AI response is not a JSON object."

    if "raw_text" in data:
        return False, "AI response is not valid structured JSON."

    unknown = set(data.keys()) - SLOT_TOP_LEVEL_KEYS
    if unknown:
        return False, f"AI response contains unknown fields: {', '.join(sorted(unknown))}"

    for key, value in data.items():
        if value is None:
            continue
        if key in ("experience", "education", "skills", "languages"):
            if not isinstance(value, list):
                return False, f"Field '{key}' must be an array."
            continue
        if key in ("name", "jobTitle", "experienceLevel", "fieldType", "phone", "email", "city", "linkedin", "summary"):
            if not isinstance(value, str):
                return False, f"Field '{key}' must be a string."

    for item in data.get("experience") or []:
        if not isinstance(item, dict):
            return False, "Each experience item must be an object."
        bad = set(item.keys()) - EXPERIENCE_ITEM_KEYS
        if bad:
            return False, f"Experience item has unknown keys: {', '.join(sorted(bad))}"

    for item in data.get("education") or []:
        if not isinstance(item, dict):
            return False, "Each education item must be an object."
        bad = set(item.keys()) - EDUCATION_ITEM_KEYS
        if bad:
            return False, f"Education item has unknown keys: {', '.join(sorted(bad))}"

    return True, None


def merge_cv_data(existing: CVContent, extracted_patch: Dict[str, Any]) -> Tuple[CVContent, Dict[str, str]]:
    """Merge validated slot patch into CVContent. Alias for slot_patch_to_cv_content."""
    return slot_patch_to_cv_content(extracted_patch, existing)


def _cv_field_filled(content: CVContent, cv_key: str) -> bool:
    c = content
    if cv_key == "full_name":
        return bool(c.full_name.strip())
    if cv_key == "job_title":
        return bool(c.job_title.strip())
    if cv_key == "contact.email":
        return bool(c.contact.email.strip())
    if cv_key == "contact.phone":
        return bool(c.contact.phone.strip())
    if cv_key == "contact.location":
        return bool(c.contact.location.strip())
    if cv_key == "skills":
        return bool(c.skills) or bool(c.skill_groups)
    return False


def _meta_filled(slot_meta: Optional[Dict[str, Any]], key: str) -> bool:
    if not slot_meta:
        return False
    snake = "experience_level" if key == "experienceLevel" else "field_type"
    return bool((slot_meta.get(key) or slot_meta.get(snake) or "").strip())


def get_missing_cv_fields(
    content: CVContent,
    slot_meta: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Return structured missing-field objects sorted by priority."""
    missing: List[Dict[str, Any]] = []
    meta = slot_meta or {}

    has_contact = bool(content.contact.email.strip() or content.contact.phone.strip())
    has_exp_or_edu = bool(content.experience) or bool(content.education)

    for field_def in MISSING_FIELD_DEFS:
        key = field_def["key"]

        if field_def.get("meta_only"):
            if not _meta_filled(meta, key):
                missing.append(dict(field_def))
            continue

        if field_def.get("group") == "contact":
            if has_contact:
                continue
            cv_key = field_def.get("cv_key", "")
            if cv_key and _cv_field_filled(content, cv_key):
                continue
            if key not in {m["key"] for m in missing}:
                missing.append(dict(field_def))
            continue

        if field_def.get("composite"):
            if not has_exp_or_edu:
                missing.append(dict(field_def))
            continue

        cv_key = field_def.get("cv_key")
        if cv_key and not _cv_field_filled(content, cv_key):
            missing.append(dict(field_def))

    # De-duplicate contact group: if neither email nor phone, ask email first only
    contact_missing = [m for m in missing if m.get("group") == "contact"]
    if len(contact_missing) > 1 and not has_contact:
        missing = [m for m in missing if m.get("group") != "contact" or m["key"] == "email"]
        if not any(m["key"] == "email" for m in missing):
            email_def = next(d for d in MISSING_FIELD_DEFS if d["key"] == "email")
            missing.append(dict(email_def))

    missing.sort(key=lambda x: x.get("priority", 99))
    return missing


def build_next_questions(
    missing: List[Dict[str, Any]],
    max_questions: int = 2,
) -> Tuple[str, List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Build reply text and up to max_questions follow-ups.
    Returns (reply_text, question_objects, guided_choices_for_first_choice_field).
    """
    if not missing:
        return (
            "Your CV has the recommended details. Review the preview, or tap Polish CV when you're ready.",
            [],
            None,
        )

    batch = missing[:max_questions]
    lines = ["Let's add a few more details to complete your CV:"]
    guided_choices: Optional[Dict[str, Any]] = None

    for i, field in enumerate(batch):
        lines.append(f"{i + 1}. {field['question']}")

    first = batch[0]
    if first.get("type") == "choice" and first.get("options"):
        guided_choices = {
            "stepId": first["key"],
            "title": first["question"],
            "page": 1,
            "totalPages": 1,
            "options": [
                {"id": opt.lower().replace(" ", "_").replace("/", "_"), "label": opt, "value": opt}
                for opt in first["options"]
            ],
        }

    reply = "\n".join(lines)
    return reply, batch, guided_choices


def _format_field_list(labels: List[str]) -> str:
    """Join field labels for a natural English list (Oxford comma)."""
    if not labels:
        return ""
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]} and {labels[1]}"
    return ", ".join(labels[:-1]) + f", and {labels[-1]}"


def _skills_snapshot(content: CVContent) -> List[str]:
    return [s.strip().lower() for s in (content.skills or []) if isinstance(s, str) and s.strip()]


def _experience_snapshot(content: CVContent) -> List[str]:
    rows: List[str] = []
    for exp in content.experience or []:
        bullets = "|".join(b.strip() for b in (exp.bullets or []) if b.strip())
        rows.append(f"{exp.role.strip().lower()}|{exp.company.strip().lower()}|{bullets}")
    return rows


def _education_snapshot(content: CVContent) -> List[str]:
    rows: List[str] = []
    for edu in content.education or []:
        rows.append(
            f"{edu.degree.strip().lower()}|{edu.institution.strip().lower()}|{edu.end_date.strip().lower()}"
        )
    return rows


def _languages_snapshot(content: CVContent) -> List[str]:
    rows: List[str] = []
    for lang in content.languages or []:
        name = (lang.name if hasattr(lang, "name") else lang.get("name", "")).strip().lower()
        prof = (lang.proficiency if hasattr(lang, "proficiency") else lang.get("proficiency", "")).strip().lower()
        if name:
            rows.append(f"{name}|{prof}")
    return sorted(rows)


def _meta_value(meta: Dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = meta.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def detect_changed_field_labels(
    before: CVContent,
    after: CVContent,
    meta_before: Optional[Dict[str, Any]] = None,
    meta_after: Optional[Dict[str, Any]] = None,
) -> List[str]:
    """Return human-readable labels for fields newly added or updated by this merge."""
    meta_before = meta_before or {}
    meta_after = meta_after or {}
    changed: List[str] = []

    if before.full_name.strip() != after.full_name.strip() and after.full_name.strip():
        changed.append("name")
    if before.job_title.strip() != after.job_title.strip() and after.job_title.strip():
        changed.append("job title")

    field_before = _meta_value(meta_before, "field_type", "fieldType")
    field_after = _meta_value(meta_after, "field_type", "fieldType")
    if field_before != field_after and field_after:
        changed.append("field type")

    level_before = _meta_value(meta_before, "experience_level", "experienceLevel")
    level_after = _meta_value(meta_after, "experience_level", "experienceLevel")
    if level_before != level_after and level_after:
        changed.append("experience level")

    if before.contact.email.strip() != after.contact.email.strip() and after.contact.email.strip():
        changed.append("email")
    if before.contact.phone.strip() != after.contact.phone.strip() and after.contact.phone.strip():
        changed.append("phone")
    if before.contact.location.strip() != after.contact.location.strip() and after.contact.location.strip():
        changed.append("location")
    if before.contact.linkedin.strip() != after.contact.linkedin.strip() and after.contact.linkedin.strip():
        changed.append("linkedin")
    if before.summary.strip() != after.summary.strip() and after.summary.strip():
        changed.append("summary")

    if _skills_snapshot(before) != _skills_snapshot(after) and _skills_snapshot(after):
        changed.append("skills")
    if _experience_snapshot(before) != _experience_snapshot(after) and _experience_snapshot(after):
        changed.append("experience")
    if _education_snapshot(before) != _education_snapshot(after) and _education_snapshot(after):
        changed.append("education")
    if _languages_snapshot(before) != _languages_snapshot(after) and _languages_snapshot(after):
        changed.append("languages")

    return changed


def build_extraction_ack(changed_labels: List[str]) -> str:
    """Build the human reply summarizing fields saved in this request."""
    if not changed_labels:
        return (
            "I could not find new CV details in that message. "
            "Please share your job title, skills, work experience, or education."
        )
    return f"Saved your {_format_field_list(changed_labels)} to your CV."


def _build_extraction_ack(
    before: CVContent,
    after: CVContent,
    meta_before: Optional[Dict[str, Any]] = None,
    meta_after: Optional[Dict[str, Any]] = None,
) -> str:
    """Short acknowledgment of fields actually changed by this merge."""
    return build_extraction_ack(
        detect_changed_field_labels(before, after, meta_before, meta_after)
    )


def extract_cv_slots(
    current_content: CVContent,
    user_message: str,
    slot_meta: Optional[Dict[str, Any]] = None,
) -> AIResponse:
    """
    Slot-filling extraction flow (Call A only — no summary/bullet generation).

    1. Convert CVContent → slot view
    2. Qwen extraction on latest message only
    3. Parse + validate + merge
    4. Detect missing fields + build 1–2 questions
    """
    if not is_slot_filling_enabled():
        return AIResponse(
            success=False,
            message="Slot-filling mode is disabled. Set SLOT_FILLING_MODE=true to enable.",
            data={"slot_filling_enabled": False},
        )

    meta = dict(slot_meta or {})
    slot_view = cv_content_to_slot_view(current_content, meta)

    prompt = prompts.extract_cv_slots_prompt(slot_view, user_message)
    raw = llm.generate_text(prompt, max_new_tokens=1200)

    parsed, parse_err = parse_qwen_json_response(raw)
    if parse_err:
        return AIResponse(
            success=False,
            message=parse_err,
            data={"slot_filling_enabled": True},
        )

    valid, val_err = validate_slot_schema(parsed)
    if not valid:
        logger.debug("Slot schema validation failed: %s", val_err)
        return AIResponse(
            success=False,
            message=val_err or "AI returned an invalid CV structure. Please try again.",
            data={"slot_filling_enabled": True},
        )

    try:
        merged, meta_updates = merge_cv_data(current_content, parsed)
    except Exception as exc:
        logger.exception("merge_cv_data failed")
        return AIResponse(
            success=False,
            message="Could not apply extracted data. Please try again.",
            data={"slot_filling_enabled": True},
        )

    updated_meta = {**meta, **meta_updates}
    missing = get_missing_cv_fields(merged, updated_meta)
    questions_reply, question_objs, guided_choices = build_next_questions(missing)

    ack = _build_extraction_ack(current_content, merged, meta, updated_meta)
    reply = f"{ack}\n\n{questions_reply}" if missing else ack

    return AIResponse(
        success=True,
        message=reply,
        data={
            "content": merged.model_dump(),
            "reply": reply,
            "missing_fields": missing,
            "questions": question_objs,
            "guided_choices": guided_choices,
            "slot_meta": updated_meta,
            "slot_filling_enabled": True,
        },
        suggestions=[f["label"] for f in missing[:4]],
    )
