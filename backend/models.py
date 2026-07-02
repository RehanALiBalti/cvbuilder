"""Pydantic models for CV Builder API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


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


class SectionVisibility(BaseModel):
    summary: bool = True
    experience: bool = True
    education: bool = True
    projects: bool = True
    skills: bool = True
    certifications: bool = True
    languages: bool = True
    awards: bool = True


class CVContent(BaseModel):
    full_name: str = ""
    job_title: str = ""
    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary: str = ""
    experience: List[ExperienceItem] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    awards: List[str] = Field(default_factory=list)
    section_order: List[str] = Field(
        default_factory=lambda: [
            "summary", "experience", "education", "projects",
            "skills", "certifications", "languages", "awards",
        ]
    )
    section_visibility: SectionVisibility = Field(default_factory=SectionVisibility)


class CVDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = "Untitled CV"
    template_id: str = "professional"
    tone: WritingTone = WritingTone.PROFESSIONAL
    content: CVContent = Field(default_factory=CVContent)
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
    template_id: str = "professional"
    tone: WritingTone = WritingTone.PROFESSIONAL
    content: Optional[CVContent] = None


class UpdateCVRequest(BaseModel):
    name: Optional[str] = None
    template_id: Optional[str] = None
    tone: Optional[WritingTone] = None
    content: Optional[CVContent] = None
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


class AIResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any] = Field(default_factory=dict)
    suggestions: List[str] = Field(default_factory=list)
    message: str = ""
