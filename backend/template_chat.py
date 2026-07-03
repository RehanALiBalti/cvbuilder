"""Parse template-related chat commands — switch, list, recommend, custom theme."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from backend.templates import TEMPLATES, get_template, list_templates

# keyword → template id (order matters — more specific first)
_TEMPLATE_KEYWORDS: List[tuple] = [
    ("fresh_graduate", r"\b(fresh\s*graduate|graduate|student|intern|fresher)\b"),
    ("international", r"\b(international|global)\b"),
    ("professional", r"\b(professional|classic|ats)\b"),
    ("corporate", r"\b(corporate|finance|consulting|business)\b"),
    ("executive", r"\b(executive|leadership|director|ceo|manager)\b"),
    ("academic", r"\b(academic|research|professor|phd|university)\b"),
    ("startup", r"\b(startup|product|growth)\b"),
    ("creative", r"\b(creative|designer|design|portfolio)\b"),
    ("minimal", r"\b(minimal|minimalist|simple|clean)\b"),
    ("elegant", r"\b(elegant|premium|formal|gold)\b"),
    ("modern", r"\b(modern|sidebar|side\s*bar)\b"),
    ("tech", r"\b(tech|developer|engineer|software|programmer|devops|coding)\b"),
]

_COLOR_NAMES = {
    "blue": "#1d4ed8",
    "navy": "#1e3a5f",
    "teal": "#0f766e",
    "green": "#15803d",
    "purple": "#7c3aed",
    "pink": "#ec4899",
    "red": "#b91c1c",
    "maroon": "#7f1d1d",
    "gold": "#c9a227",
    "orange": "#ea580c",
    "indigo": "#6366f1",
    "sky": "#0369a1",
    "black": "#0f172a",
    "grey": "#475569",
    "gray": "#475569",
}


def match_template_id(text: str) -> Optional[str]:
    m = (text or "").lower()
    for tid, pattern in _TEMPLATE_KEYWORDS:
        if re.search(pattern, m):
            return tid
    return None


def recommend_template(text: str) -> str:
    m = (text or "").lower()
    role_hints = [
        ("tech", r"\b(developer|engineer|software|programmer|devops|data\s*scientist|full\s*stack|backend|frontend)\b"),
        ("fresh_graduate", r"\b(student|graduate|fresher|intern|entry[\s-]?level|no\s+experience)\b"),
        ("academic", r"\b(research|professor|lecturer|phd|academic|scientist)\b"),
        ("executive", r"\b(ceo|cto|director|vp|vice\s+president|head\s+of|executive|leadership)\b"),
        ("creative", r"\b(designer|creative|artist|ux|ui|graphic|marketing\s+creative)\b"),
        ("corporate", r"\b(finance|accountant|consultant|banking|analyst|mba)\b"),
        ("startup", r"\b(startup|product\s+manager|growth|founder)\b"),
        ("international", r"\b(international|global|overseas|abroad)\b"),
        ("elegant", r"\b(lawyer|legal|diplomat|formal)\b"),
        ("modern", r"\b(manager|marketing|sales|hr)\b"),
    ]
    for tid, pattern in role_hints:
        if re.search(pattern, m):
            return tid
    return "professional"


def _is_list_templates(message: str) -> bool:
    m = (message or "").lower().strip()
    if m in {"templates", "list templates", "show templates", "all templates"}:
        return True
    return bool(
        re.search(r"\b(list|show|available|dekhao|dikhao|batao|saare|sab|tamam)\b", m)
        and re.search(r"\btemplates?\b", m)
    )


def _is_recommend(message: str) -> bool:
    m = (message or "").lower()
    return bool(
        re.search(r"\b(recommend|suggest|which|best|kon\s*sa|konsa|kya\s+template|template\s+for)\b", m)
        and re.search(r"\btemplates?\b", m)
    ) or bool(re.search(r"\bwhich\s+template\b", m))


def _is_custom_theme(message: str) -> bool:
    m = (message or "").lower()
    if re.search(r"\b(custom|apna|personal|personalized|naya\s+design)\b", m) and re.search(
        r"\b(template|theme|design|color|colour|rang)\b", m
    ):
        return True
    if re.search(r"\b(banao|banao|create|make)\b", m) and re.search(r"\btemplate\b", m):
        return True
    if re.search(r"\b(blue|navy|gold|green|purple|pink|red|teal|indigo)\b", m) and re.search(
        r"\b(template|theme|color|colour)\b", m
    ):
        return True
    return False


def _is_switch_intent(message: str) -> bool:
    m = (message or "").lower()
    if match_template_id(m) and re.search(
        r"\b(use|switch|change|apply|set|lagao|karo|badlo|template|design|layout)\b", m
    ):
        return True
    if re.search(r"\btemplate\s+(change|switch|badlo)\b", m):
        return True
    if re.search(r"\b(change|switch)\b.*\btemplate\b", m):
        return True
    return False


def _is_new_cv_with_template(message: str) -> bool:
    m = (message or "").lower()
    return bool(
        re.search(r"\b(new|naya|create|banao|banao)\b", m)
        and re.search(r"\b(cv|resume|curriculum)\b", m)
        and match_template_id(m)
    )


def parse_custom_theme(message: str) -> Dict[str, Any]:
    m = (message or "").lower()
    colors_found: List[str] = []
    for name, hex_val in _COLOR_NAMES.items():
        if re.search(rf"\b{re.escape(name)}\b", m):
            colors_found.append(hex_val)

    accent = colors_found[0] if colors_found else "#6366f1"
    header_bg = colors_found[1] if len(colors_found) > 1 else accent
    sidebar_bg = colors_found[0] if colors_found else "#1e293b"

    label_parts = [n for n in _COLOR_NAMES if re.search(rf"\b{re.escape(n)}\b", m)]
    name = f"Custom ({' + '.join(label_parts[:2])})" if label_parts else "Custom Theme"

    font = ""
    if re.search(r"\bserif\b", m):
        font = "Georgia, serif"
    elif re.search(r"\bmono|monospace\b", m):
        font = "Consolas, monospace"
    elif re.search(r"\bsans\b", m):
        font = "Arial, sans-serif"

    return {
        "name": name,
        "accent_color": accent,
        "header_bg": header_bg,
        "sidebar_bg": sidebar_bg,
        "font_family": font,
    }


def format_template_list() -> str:
    lines = ["Here are all 13 CV templates — say **use [name] template** to apply:\n"]
    for t in list_templates():
        lines.append(f"• **{t['name']}** (`{t['id']}`) — {t['description']}")
    lines.append(
        "\nYou can also say:\n"
        "• `recommend a template for software engineer`\n"
        "• `create custom template blue and gold`\n"
        "• `new CV with modern template`"
    )
    return "\n".join(lines)


def parse_chat_template_intent(message: str, current_template_id: str = "professional") -> Dict[str, Any]:
    """Return intent dict: action, template_id, theme_override, reply (optional)."""
    msg = (message or "").strip()
    if not msg:
        return {}

    if _is_list_templates(msg):
        return {"action": "list_templates", "reply": format_template_list()}

    if _is_custom_theme(msg):
        theme = parse_custom_theme(msg)
        return {
            "action": "custom_theme",
            "template_id": "custom",
            "theme_override": theme,
            "reply": (
                f"Created your custom template **{theme['name']}** with accent {theme['accent_color']}. "
                "Preview updated on the right — you can still say `use modern template` to switch to a preset."
            ),
        }

    if _is_recommend(msg):
        rec = recommend_template(msg)
        t = get_template(rec)
        return {
            "action": "recommend",
            "recommended_template": rec,
            "reply": (
                f"I recommend **{t['name']}** for your profile — {t['description']}. "
                f'Say **"use {rec} template"** to apply it.'
            ),
        }

    if _is_new_cv_with_template(msg):
        tid = match_template_id(msg)
        if tid:
            t = get_template(tid)
            return {
                "action": "switch",
                "template_id": tid,
                "reply": (
                    f"Using **{t['name']}** template. "
                    "Share your name, role, and experience to build your CV."
                ),
            }

    if _is_switch_intent(msg):
        tid = match_template_id(msg)
        if tid:
            t = get_template(tid)
            return {
                "action": "switch",
                "template_id": tid,
                "reply": f"Switched to **{t['name']}** template. Your CV content is unchanged — only the design updated.",
            }

    # Short commands: "modern template", "tech template"
    if re.search(r"\btemplates?\b", msg.lower()):
        tid = match_template_id(msg)
        if tid:
            t = get_template(tid)
            return {
                "action": "switch",
                "template_id": tid,
                "reply": f"Applied **{t['name']}** template.",
            }

    return {}
