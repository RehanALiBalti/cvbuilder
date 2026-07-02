"""CV template definitions."""

from __future__ import annotations

from typing import Any, Dict, List

TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "professional",
        "name": "Professional",
        "category": "ats",
        "description": "Clean ATS-friendly layout with clear section headers",
        "preview_color": "#1d4ed8",
        "font": "Georgia, serif",
    },
    {
        "id": "modern",
        "name": "Modern",
        "category": "modern",
        "description": "Contemporary design with accent sidebar styling",
        "preview_color": "#0f766e",
        "font": "Plus Jakarta Sans, sans-serif",
    },
    {
        "id": "executive",
        "name": "Executive",
        "category": "executive",
        "description": "Premium layout for senior leadership roles",
        "preview_color": "#0f2744",
        "font": "Times New Roman, serif",
    },
    {
        "id": "minimal",
        "name": "Minimal",
        "category": "minimal",
        "description": "Simple, whitespace-focused one-column design",
        "preview_color": "#475569",
        "font": "Arial, sans-serif",
    },
    {
        "id": "fresh_graduate",
        "name": "Fresh Graduate",
        "category": "fresh_graduate",
        "description": "Education-first layout for early-career candidates",
        "preview_color": "#7c3aed",
        "font": "Verdana, sans-serif",
    },
]


def list_templates() -> List[Dict[str, Any]]:
    return TEMPLATES


def get_template(template_id: str) -> Dict[str, Any]:
    for t in TEMPLATES:
        if t["id"] == template_id:
            return t
    return TEMPLATES[0]
