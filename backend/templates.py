"""CV template definitions — each maps to a unique frontend HTML/CSS layout."""

from __future__ import annotations

import random
from typing import Any, Dict, List

TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "professional",
        "name": "Professional",
        "category": "ats",
        "layout": "single_column",
        "description": "Classic ATS-friendly single column with blue accents",
        "preview_color": "#1d4ed8",
        "font": "Georgia, serif",
    },
    {
        "id": "modern",
        "name": "Modern Sidebar",
        "category": "modern",
        "layout": "sidebar",
        "description": "Teal sidebar with contact & skills, white main content",
        "preview_color": "#0f766e",
        "font": "Plus Jakarta Sans, sans-serif",
    },
    {
        "id": "executive",
        "name": "Executive",
        "category": "executive",
        "layout": "banner",
        "description": "Navy centered banner with gold rule — leadership roles",
        "preview_color": "#0f2744",
        "font": "Times New Roman, serif",
    },
    {
        "id": "minimal",
        "name": "Minimal",
        "category": "minimal",
        "layout": "minimal",
        "description": "Clean whitespace, light typography, subtle dividers",
        "preview_color": "#475569",
        "font": "Arial, sans-serif",
    },
    {
        "id": "fresh_graduate",
        "name": "Fresh Graduate",
        "category": "fresh_graduate",
        "layout": "education_first",
        "description": "Education-first layout with purple accent header",
        "preview_color": "#7c3aed",
        "font": "Verdana, sans-serif",
    },
    {
        "id": "creative",
        "name": "Creative",
        "category": "creative",
        "layout": "card_grid",
        "description": "Gradient hero with card-based sections — designers & creatives",
        "preview_color": "#ec4899",
        "font": "Plus Jakarta Sans, sans-serif",
    },
    {
        "id": "tech",
        "name": "Tech / Developer",
        "category": "tech",
        "layout": "tech_bar",
        "description": "Dark header bar, monospace skills — software engineers",
        "preview_color": "#0f172a",
        "font": "Segoe UI, system-ui, sans-serif",
    },
    {
        "id": "elegant",
        "name": "Elegant",
        "category": "elegant",
        "layout": "elegant",
        "description": "Serif typography with gold accents — formal & premium",
        "preview_color": "#c9a227",
        "font": "Georgia, serif",
    },
    {
        "id": "corporate",
        "name": "Corporate",
        "category": "corporate",
        "layout": "two_column",
        "description": "Structured two-column layout — finance, consulting, corporate",
        "preview_color": "#1e3a5f",
        "font": "Calibri, Arial, sans-serif",
    },
    {
        "id": "startup",
        "name": "Startup",
        "category": "startup",
        "layout": "bold_header",
        "description": "Bold accent header with clean sections — product & growth roles",
        "preview_color": "#6366f1",
        "font": "Inter, system-ui, sans-serif",
    },
    {
        "id": "academic",
        "name": "Academic",
        "category": "academic",
        "layout": "academic",
        "description": "Research-focused layout — publications, education emphasis",
        "preview_color": "#7f1d1d",
        "font": "Times New Roman, serif",
    },
    {
        "id": "international",
        "name": "International",
        "category": "international",
        "layout": "intl",
        "description": "Global CV style with clear section blocks and neutral palette",
        "preview_color": "#0369a1",
        "font": "Helvetica Neue, Arial, sans-serif",
    },
    {
        "id": "portfolio",
        "name": "Portfolio",
        "category": "creative",
        "layout": "single_column",
        "description": "Project-forward layout for designers and freelancers",
        "preview_color": "#db2777",
        "font": "Plus Jakarta Sans, sans-serif",
    },
    {
        "id": "simple",
        "name": "Simple",
        "category": "minimal",
        "layout": "minimal",
        "description": "Ultra-clean single column for any industry",
        "preview_color": "#334155",
        "font": "Arial, sans-serif",
    },
    {
        "id": "bold",
        "name": "Bold",
        "category": "modern",
        "layout": "bold_header",
        "description": "Strong header and clear hierarchy for impact roles",
        "preview_color": "#b91c1c",
        "font": "Inter, system-ui, sans-serif",
    },
    {
        "id": "custom",
        "name": "Custom",
        "category": "custom",
        "layout": "themed",
        "description": "Your own colors — say e.g. create custom template blue and gold",
        "preview_color": "#6366f1",
        "font": "Georgia, serif",
    },
]


def list_templates() -> List[Dict[str, Any]]:
    return TEMPLATES


def list_templates_for_plan(plan: str) -> List[Dict[str, Any]]:
    """Basic: none (picker hidden). Pro: up to 15 presets. Business: all."""
    if plan == "business":
        return TEMPLATES
    if plan == "pro":
        return [t for t in TEMPLATES if t["id"] != "custom"][:15]
    return []


def plan_allows_template(plan: str, template_id: str) -> bool:
    if plan == "business":
        return True
    if plan == "pro":
        allowed = {t["id"] for t in list_templates_for_plan("pro")}
        return template_id in allowed
    # Basic keeps whatever default was assigned at create time
    return False


def get_template(template_id: str) -> Dict[str, Any]:
    for t in TEMPLATES:
        if t["id"] == template_id:
            return t
    return TEMPLATES[0]


def preset_template_ids() -> List[str]:
    return [t["id"] for t in TEMPLATES if t["id"] != "custom"]


def random_template_id() -> str:
    return random.choice(preset_template_ids())
