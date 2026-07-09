"""Adapter between persisted CVContent and AI slot-filling prompt schema."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from backend.models import CVContent, ExperienceItem, EducationItem, LanguageItem

# Top-level keys allowed in an extraction patch from Qwen.
SLOT_TOP_LEVEL_KEYS = frozenset({
    "name",
    "jobTitle",
    "experienceLevel",
    "fieldType",
    "phone",
    "email",
    "city",
    "linkedin",
    "summary",
    "experience",
    "education",
    "skills",
    "languages",
})

EXPERIENCE_ITEM_KEYS = frozenset({
    "title", "company", "startDate", "endDate", "city", "bullets",
})

EDUCATION_ITEM_KEYS = frozenset({
    "degree", "institute", "year", "city",
})


def _short_id() -> str:
    return str(uuid4())[:8]


def _is_nonempty(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return len(value) > 0
    if isinstance(value, dict):
        return any(_is_nonempty(v) for v in value.values())
    return True


def _lang_to_slot(lang: Any) -> Dict[str, str]:
    if isinstance(lang, dict):
        return {
            "name": (lang.get("name") or "").strip(),
            "proficiency": (lang.get("proficiency") or "").strip(),
        }
    if isinstance(lang, str):
        return {"name": lang.strip(), "proficiency": ""}
    return {"name": "", "proficiency": ""}


def cv_content_to_slot_view(
    content: CVContent,
    slot_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Map persisted CVContent → prompt-friendly slot JSON."""
    c = content
    contact = c.contact
    meta = slot_meta or {}

    experience: List[Dict[str, Any]] = []
    for exp in c.experience or []:
        experience.append({
            "title": exp.role or None,
            "company": exp.company or None,
            "startDate": exp.start_date or None,
            "endDate": exp.end_date or None,
            "city": exp.location or None,
            "bullets": list(exp.bullets or []) if exp.bullets else [],
        })

    education: List[Dict[str, Any]] = []
    for edu in c.education or []:
        education.append({
            "degree": edu.degree or None,
            "institute": edu.institution or None,
            "year": edu.end_date or None,
            "city": None,
        })

    languages: List[Dict[str, str]] = []
    for lang in c.languages or []:
        entry = _lang_to_slot(lang.model_dump() if hasattr(lang, "model_dump") else lang)
        if entry["name"]:
            languages.append(entry)

    return {
        "name": c.full_name or None,
        "jobTitle": c.job_title or None,
        "experienceLevel": meta.get("experience_level") or meta.get("experienceLevel") or None,
        "fieldType": meta.get("field_type") or meta.get("fieldType") or None,
        "phone": contact.phone or None,
        "email": contact.email or None,
        "city": contact.location or None,
        "linkedin": contact.linkedin or None,
        "summary": c.summary or None,
        "experience": experience,
        "education": education,
        "skills": list(c.skills or []) if c.skills else [],
        "languages": languages,
    }


def _slot_exp_to_cv(item: Dict[str, Any]) -> Dict[str, Any]:
    bullets = item.get("bullets") or []
    if isinstance(bullets, str):
        bullets = [bullets]
    bullets = [b.strip() for b in bullets if isinstance(b, str) and b.strip()]
    end = (item.get("endDate") or "").strip()
    return ExperienceItem(
        id=_short_id(),
        company=(item.get("company") or "").strip(),
        role=(item.get("title") or "").strip(),
        location=(item.get("city") or "").strip(),
        start_date=(item.get("startDate") or "").strip(),
        end_date=end,
        current=bool(end and "present" in end.lower()),
        bullets=bullets,
    ).model_dump()


def _slot_edu_to_cv(item: Dict[str, Any]) -> Dict[str, Any]:
    return EducationItem(
        id=_short_id(),
        degree=(item.get("degree") or "").strip(),
        institution=(item.get("institute") or "").strip(),
        field="",
        start_date="",
        end_date=(item.get("year") or "").strip(),
        gpa="",
        highlights=[],
    ).model_dump()


def _exp_signature(exp: Dict[str, Any]) -> str:
    return f"{(exp.get('role') or '').lower()}|{(exp.get('company') or '').lower()}"


def _edu_signature(edu: Dict[str, Any]) -> str:
    return f"{(edu.get('degree') or '').lower()}|{(edu.get('institution') or '').lower()}"


def slot_patch_to_cv_content(
    patch: Dict[str, Any],
    base: CVContent,
) -> Tuple[CVContent, Dict[str, str]]:
    """
    Merge an extracted slot patch into existing CVContent.

    Returns (merged CVContent, slot_meta updates).
    Does not overwrite filled scalars with null/empty; does not clear arrays.
    """
    data = base.model_dump()
    slot_meta_updates: Dict[str, str] = {}

    if _is_nonempty(patch.get("name")):
        data["full_name"] = str(patch["name"]).strip()

    if _is_nonempty(patch.get("jobTitle")):
        data["job_title"] = str(patch["jobTitle"]).strip()

    contact = dict(data.get("contact") or {})
    if _is_nonempty(patch.get("email")):
        contact["email"] = str(patch["email"]).strip()
    if _is_nonempty(patch.get("phone")):
        contact["phone"] = str(patch["phone"]).strip()
    if _is_nonempty(patch.get("city")):
        contact["location"] = str(patch["city"]).strip()
    if _is_nonempty(patch.get("linkedin")):
        contact["linkedin"] = str(patch["linkedin"]).strip()
    data["contact"] = contact

    if _is_nonempty(patch.get("summary")):
        data["summary"] = str(patch["summary"]).strip()

    if _is_nonempty(patch.get("experienceLevel")):
        slot_meta_updates["experience_level"] = str(patch["experienceLevel"]).strip()
    if _is_nonempty(patch.get("fieldType")):
        slot_meta_updates["field_type"] = str(patch["fieldType"]).strip()

    if _is_nonempty(patch.get("skills")):
        existing = [s for s in (data.get("skills") or []) if isinstance(s, str)]
        new_skills = [str(s).strip() for s in patch["skills"] if _is_nonempty(s)]
        merged = list(dict.fromkeys(existing + new_skills))
        data["skills"] = merged
        if merged:
            data["skill_groups"] = [{"category": "Core Skills", "items": merged}]

    if _is_nonempty(patch.get("experience")):
        existing_exp = list(data.get("experience") or [])
        seen = {_exp_signature(e) for e in existing_exp if _exp_signature(e) != "|"}
        for item in patch["experience"]:
            if not isinstance(item, dict):
                continue
            entry = _slot_exp_to_cv(item)
            sig = _exp_signature(entry)
            if sig == "|" or sig in seen:
                continue
            existing_exp.append(entry)
            seen.add(sig)
        data["experience"] = existing_exp

    if _is_nonempty(patch.get("education")):
        existing_edu = list(data.get("education") or [])
        seen = {_edu_signature(e) for e in existing_edu if _edu_signature(e) != "|"}
        for item in patch["education"]:
            if not isinstance(item, dict):
                continue
            entry = _slot_edu_to_cv(item)
            sig = _edu_signature(entry)
            if sig == "|" or sig in seen:
                continue
            existing_edu.append(entry)
            seen.add(sig)
        data["education"] = existing_edu

    if _is_nonempty(patch.get("languages")):
        existing_langs = list(data.get("languages") or [])
        seen_names = {
            (lg.get("name") or "").lower()
            for lg in existing_langs
            if isinstance(lg, dict) and lg.get("name")
        }
        for lang in patch["languages"]:
            if isinstance(lang, str) and lang.strip():
                name = lang.strip()
                if name.lower() not in seen_names:
                    existing_langs.append(LanguageItem(name=name, proficiency="").model_dump())
                    seen_names.add(name.lower())
            elif isinstance(lang, dict) and _is_nonempty(lang.get("name")):
                name = str(lang["name"]).strip()
                if name.lower() not in seen_names:
                    existing_langs.append(
                        LanguageItem(
                            name=name,
                            proficiency=str(lang.get("proficiency") or "").strip(),
                        ).model_dump()
                    )
                    seen_names.add(name.lower())
        data["languages"] = existing_langs

    # Preserve photo and visibility — never touched by slot patch
    if base.profile_photo:
        data["profile_photo"] = base.profile_photo

    return CVContent(**data), slot_meta_updates
