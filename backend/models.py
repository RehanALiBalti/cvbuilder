"""Pydantic models for CV Builder API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
import re
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator


class WritingTone(str, Enum):
    PROFESSIONAL = "professional"
    MODERN = "modern"
    EXECUTIVE = "executive"
    FRESH_GRADUATE = "fresh_graduate"


class CVSection(str, Enum):
    SUMMARY = "summary"
    EXPERIENCE = "experience"
    EDUCATION = "education"
    PROJECTS = "projects"
    SKILLS = "skills"
    CERTIFICATIONS = "certifications"
    LANGUAGES = "languages"
    AWARDS = "awards"


class ContactInfo(BaseModel):
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    website: str = ""
    github: str = ""


class ExperienceItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4())[:8])
    company: str = ""
    role: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    current: bool = False
    bullets: List[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4())[:8])
    institution: str = ""
    degree: str = ""
    field: str = ""
    start_date: str = ""
    end_date: str = ""
    gpa: str = ""
    highlights: List[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4())[:8])
    name: str = ""
    url: str = ""
    technologies: List[str] = Field(default_factory=list)
    description: str = ""
    bullets: List[str] = Field(default_factory=list)


class SkillGroup(BaseModel):
    category: str = ""
    items: List[str] = Field(default_factory=list)


class LanguageItem(BaseModel):
    name: str = ""
    proficiency: str = ""  # Native, Fluent, Professional, Intermediate, Basic


class CertificationItem(BaseModel):
    name: str = ""
    issuer: str = ""
    date: str = ""


class SectionVisibility(BaseModel):
    summary: bool = True
    experience: bool = True
    education: bool = True
    projects: bool = True
    skills: bool = True
    certifications: bool = False
    languages: bool = True
    awards: bool = True


class CVContent(BaseModel):
    full_name: str = ""
    job_title: str = ""
    profile_photo: str = ""
    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary: str = ""
    experience: List[ExperienceItem] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    skill_groups: List[SkillGroup] = Field(default_factory=list)
    certifications: List[CertificationItem] = Field(default_factory=list)
    languages: List[LanguageItem] = Field(default_factory=list)
    awards: List[str] = Field(default_factory=list)
    section_order: List[str] = Field(
        default_factory=lambda: [
            "summary", "experience", "education", "projects",
            "skills", "certifications", "languages", "awards",
        ]
    )
    section_visibility: SectionVisibility = Field(default_factory=SectionVisibility)

    @model_validator(mode="before")
    @classmethod
    def coerce_legacy_lists(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        certs = data.get("certifications") or []
        if certs and isinstance(certs[0], str):
            data["certifications"] = [{"name": c, "issuer": "", "date": ""} for c in certs]
        langs = data.get("languages") or []
        if langs and isinstance(langs[0], str):
            parsed = []
            for lang in langs:
                if "—" in lang or " - " in lang:
                    parts = re.split(r"\s*[—\-]\s*", lang, maxsplit=1)
                    parsed.append({"name": parts[0].strip(), "proficiency": parts[1].strip() if len(parts) > 1 else ""})
                else:
                    parsed.append({"name": lang, "proficiency": ""})
            data["languages"] = parsed
        return data


class CustomTheme(BaseModel):
    name: str = "Custom Theme"
    accent_color: str = "#6366f1"
    header_bg: str = ""
    sidebar_bg: str = ""
    font_family: str = ""


class CVDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = "Untitled CV"
    template_id: str = "professional"
    tone: WritingTone = WritingTone.PROFESSIONAL
    content: CVContent = Field(default_factory=CVContent)
    theme_override: Optional[CustomTheme] = None
    share_token: Optional[str] = None
    is_public: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CVVersion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    cv_id: str
    label: str = ""
    snapshot: CVDocument
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CVListItem(BaseModel):
    id: str
    name: str
    template_id: str
    job_title: str = ""
    updated_at: str


class CreateCVRequest(BaseModel):
    name: str = "Untitled CV"
    template_id: str = "random"
    tone: WritingTone = WritingTone.PROFESSIONAL
    content: Optional[CVContent] = None


class UpdateCVRequest(BaseModel):
    name: Optional[str] = None
    template_id: Optional[str] = None
    tone: Optional[WritingTone] = None
    content: Optional[CVContent] = None
    theme_override: Optional[CustomTheme] = None
    save_version: bool = False
    version_label: str = ""


class RenameCVRequest(BaseModel):
    name: str


class AIGenerateRequest(BaseModel):
    raw_input: str = ""
    tone: WritingTone = WritingTone.PROFESSIONAL
    target_role: str = ""
    industry: str = ""


class AIRegenerateSectionRequest(BaseModel):
    cv_id: Optional[str] = None
    section: CVSection
    content: CVContent
    tone: WritingTone = WritingTone.PROFESSIONAL
    instructions: str = ""


class AIEnhanceRequest(BaseModel):
    text: str
    context: str = ""
    tone: WritingTone = WritingTone.PROFESSIONAL


class AIAnalyzeRequest(BaseModel):
    content: CVContent
    target_role: str = ""


class AIOptimizeJobRequest(BaseModel):
    content: CVContent
    job_description: str
    tone: WritingTone = WritingTone.PROFESSIONAL


class AICoverLetterRequest(BaseModel):
    content: CVContent
    job_title: str
    company: str
    job_description: str = ""
    tone: WritingTone = WritingTone.PROFESSIONAL


class AICareerGuidanceRequest(BaseModel):
    content: CVContent
    target_role: str = ""
    years_experience: str = ""


class AILinkedInRequest(BaseModel):
    content: CVContent
    tone: WritingTone = WritingTone.PROFESSIONAL


class ChatMessage(BaseModel):
    role: str
    content: str


class AIChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = Field(default_factory=list)
    content: CVContent = Field(default_factory=CVContent)
    tone: WritingTone = WritingTone.PROFESSIONAL
    template_id: str = "professional"
    theme_override: Optional[CustomTheme] = None


class SlotMeta(BaseModel):
    """Session-only slot metadata (not persisted to Firestore in Phase 1)."""
    experience_level: str = ""
    field_type: str = ""


class AISlotFillRequest(BaseModel):
    message: str
    content: CVContent = Field(default_factory=CVContent)
    slot_meta: Optional[SlotMeta] = None


class AIPolishRequest(BaseModel):
    """One-shot polish after guided section-wise data collection."""
    content: CVContent = Field(default_factory=CVContent)
    tone: WritingTone = WritingTone.PROFESSIONAL


class StyledExportRequest(BaseModel):
    html: str


class CheckoutRequest(BaseModel):
    plan_id: str = Field(..., pattern=r"^(pro|business)$")
    interval: str = Field(..., pattern=r"^(monthly|yearly)$")
    email: Optional[str] = None


class ContactSubmissionRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=200)
    category: str = Field(
        default="general",
        pattern=r"^(complaint|bug|billing|feature|general)$",
    )
    subject: str = Field(default="", max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)


class AIResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any] = Field(default_factory=dict)
    suggestions: List[str] = Field(default_factory=list)
    message: str = ""
