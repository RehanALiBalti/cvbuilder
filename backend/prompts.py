"""AI prompt templates for CV Builder."""

from __future__ import annotations

import json
from typing import Any, Dict, List

from backend.models import CVContent, WritingTone

TONE_GUIDE = {
    WritingTone.PROFESSIONAL: "formal, concise, achievement-focused professional tone",
    WritingTone.MODERN: "contemporary, dynamic, impact-driven modern tone",
    WritingTone.EXECUTIVE: "strategic, leadership-oriented executive tone",
    WritingTone.FRESH_GRADUATE: "enthusiastic, potential-focused tone for early-career candidates",
}


def _tone(tone: WritingTone) -> str:
    return TONE_GUIDE.get(tone, TONE_GUIDE[WritingTone.PROFESSIONAL])


def _content_json(content: CVContent) -> str:
    return json.dumps(content.model_dump(), indent=2, ensure_ascii=False)


def generate_cv_prompt(raw_input: str, tone: WritingTone, target_role: str, industry: str) -> str:
    return f"""You are an expert CV/resume writer. Create a complete professional CV from the user input.

Writing tone: {_tone(tone)}
Target role: {target_role or "general"}
Industry: {industry or "general"}

User input:
{raw_input}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{{
  "full_name": "",
  "job_title": "",
  "contact": {{"email":"","phone":"","location":"","linkedin":"","website":"","github":""}},
  "summary": "",
  "experience": [{{"company":"","role":"","location":"","start_date":"","end_date":"","current":false,"bullets":["",""]}}],
  "education": [{{"institution":"","degree":"","field":"","start_date":"","end_date":"","gpa":"","highlights":[""]}}],
  "projects": [{{"name":"","url":"","technologies":[],"description":"","bullets":[""]}}],
  "skills": ["skill1","skill2"],
  "certifications": [],
  "languages": [],
  "awards": []
}}

Rules:
- Use strong action verbs and quantified achievements where possible
- ATS-friendly keywords
- Fix grammar and improve weak wording
- Detect and fill missing fields from context
- Keep bullets concise (1-2 lines each)
"""


def regenerate_section_prompt(
    section: str,
    content: CVContent,
    tone: WritingTone,
    instructions: str,
) -> str:
    return f"""You are an expert CV writer. Regenerate ONLY the "{section}" section.

Writing tone: {_tone(tone)}
Extra instructions: {instructions or "none"}

Current CV context:
{_content_json(content)}

Return ONLY valid JSON for the section:
- summary: {{"summary": "..."}}
- experience: {{"experience": [{{"company":"","role":"","location":"","start_date":"","end_date":"","current":false,"bullets":[]}}]}}
- education: {{"education": [...]}}
- projects: {{"projects": [...]}}
- skills: {{"skills": ["..."]}}
- certifications: {{"certifications": ["..."]}}
- languages: {{"languages": ["..."]}}
- awards: {{"awards": ["..."]}}

Improve content with action verbs, metrics, and ATS keywords. No markdown."""


def enhance_text_prompt(text: str, context: str, tone: WritingTone) -> str:
    return f"""Improve this CV text. Tone: {_tone(tone)}.
Context: {context or "general CV content"}

Original:
{text}

Return ONLY valid JSON:
{{"enhanced": "improved text", "changes": ["change 1", "change 2"]}}
"""


def analyze_cv_prompt(content: CVContent, target_role: str) -> str:
    return f"""Analyze this CV for quality, ATS compatibility, and missing information.
Target role: {target_role or "general"}

CV:
{_content_json(content)}

Return ONLY valid JSON:
{{
  "score": 0-100,
  "ats_score": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missing_fields": ["..."],
  "weak_wording": ["original phrase -> better phrase"],
  "keyword_recommendations": ["..."],
  "suggestions": ["..."]
}}
"""


def optimize_job_prompt(content: CVContent, job_description: str, tone: WritingTone) -> str:
    return f"""Optimize this CV for the job description below.
Tone: {_tone(tone)}

CV:
{_content_json(content)}

Job description:
{job_description}

Return ONLY valid JSON:
{{
  "match_score": 0-100,
  "missing_skills": ["..."],
  "keyword_gaps": ["..."],
  "optimized_summary": "...",
  "experience_improvements": [{{"role":"","bullets":["..."]}}],
  "recommended_skills": ["..."],
  "ats_tips": ["..."]
}}
"""


def cover_letter_prompt(
    content: CVContent,
    job_title: str,
    company: str,
    job_description: str,
    tone: WritingTone,
) -> str:
    return f"""Write a tailored cover letter.
Tone: {_tone(tone)}
Job: {job_title} at {company}
Job description: {job_description or "not provided"}

Candidate CV:
{_content_json(content)}

Return ONLY valid JSON:
{{
  "subject": "Application for ...",
  "body": "full cover letter text with paragraphs separated by \\n\\n",
  "highlights": ["key point 1", "key point 2"]
}}
"""


def career_guidance_prompt(content: CVContent, target_role: str, years_experience: str) -> str:
    return f"""Provide career guidance based on this CV.
Target role: {target_role or "next career step"}
Experience level: {years_experience or "infer from CV"}

CV:
{_content_json(content)}

Return ONLY valid JSON:
{{
  "career_objectives": ["..."],
  "progression_paths": ["..."],
  "skill_development": ["..."],
  "learning_paths": [{{"skill":"","resources":["..."]}}],
  "certification_recommendations": ["..."]
}}
"""


def linkedin_prompt(content: CVContent, tone: WritingTone) -> str:
    return f"""Create LinkedIn and portfolio content from this CV.
Tone: {_tone(tone)}

CV:
{_content_json(content)}

Return ONLY valid JSON:
{{
  "headline": "...",
  "about": "...",
  "portfolio_summary": "...",
  "bio": "...",
  "profile_recommendations": ["..."]
}}
"""


def chat_cv_prompt(
    message: str,
    history: List[Dict[str, str]],
    content: CVContent,
    tone: WritingTone,
) -> str:
    history_lines = []
    for item in history[-8:]:
        role = item.get("role", "user")
        text = (item.get("content") or "")[:600]
        history_lines.append(f"{role.upper()}: {text}")
    history_text = "\n".join(history_lines) if history_lines else "(no prior messages)"

    return f"""You are an AI CV builder assistant. The user chats with you to build and update their CV in real time.

Writing tone: {_tone(tone)}

Conversation so far:
{history_text}

Current CV JSON:
{_content_json(content)}

User message:
{message}

Update the CV based on the user message. Merge new info into existing CV — do not remove data unless asked.

Return ONLY valid JSON (no markdown):
{{
  "reply": "Short friendly reply explaining what you changed (2-4 sentences)",
  "content": {{
    "full_name": "",
    "job_title": "",
    "contact": {{"email":"","phone":"","location":"","linkedin":"","website":"","github":""}},
    "summary": "",
    "experience": [],
    "education": [],
    "projects": [],
    "skills": [],
    "certifications": [],
    "languages": [],
    "awards": []
  }},
  "action": null
}}

For action use only when user explicitly asks to download/export:
- "export_pdf" for PDF download
- "export_docx" for Word download
- null otherwise

Rules:
- summary must be a plain string, never nested object
- Keep all existing CV data and add/update from user message
- Use strong action verbs and ATS-friendly wording
- If user shares background for first time, build a complete CV
"""
