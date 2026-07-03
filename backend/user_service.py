"""User profiles and plan limits via Firestore."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from backend.firebase_app import get_db, is_enabled

PLAN_LIMITS: Dict[str, Dict[str, int]] = {
    "starter": {"max_cvs": 1, "max_ai_messages_month": 50},
    "pro": {"max_cvs": 100, "max_ai_messages_month": 100_000},
    "business": {"max_cvs": 100, "max_ai_messages_month": 100_000},
}


def _month_key() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def _users():
    return get_db().collection("users")


def get_user_doc(uid: str) -> Dict[str, Any]:
    if not is_enabled():
        return {"plan": "starter", "ai_usage_month": _month_key(), "ai_messages_used": 0}
    snap = _users().document(uid).get()
    if not snap.exists:
        return {"plan": "starter", "ai_usage_month": _month_key(), "ai_messages_used": 0}
    data = snap.to_dict() or {}
    data.setdefault("plan", "starter")
    return data


def get_user_plan(uid: str) -> str:
    return get_user_doc(uid).get("plan", "starter")


def get_user_profile(uid: str) -> Dict[str, Any]:
    data = get_user_doc(uid)
    plan = data.get("plan", "starter")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["starter"])
    usage_month = data.get("ai_usage_month", "")
    messages_used = data.get("ai_messages_used", 0) if usage_month == _month_key() else 0
    return {
        "uid": uid,
        "plan": plan,
        "subscription_status": data.get("subscription_status", "active" if plan != "starter" else "free"),
        "stripe_customer_id": data.get("stripe_customer_id", ""),
        "stripe_subscription_id": data.get("stripe_subscription_id", ""),
        "limits": limits,
        "ai_messages_used": messages_used,
        "ai_messages_limit": limits["max_ai_messages_month"],
        "max_cvs": limits["max_cvs"],
    }


def set_user_plan(
    uid: str,
    plan: str,
    *,
    subscription_id: str = "",
    customer_id: str = "",
    status: str = "active",
) -> None:
    if not is_enabled():
        return
    payload: Dict[str, Any] = {
        "plan": plan,
        "subscription_status": status,
        "plan_updated_at": datetime.utcnow().isoformat(),
    }
    if subscription_id:
        payload["stripe_subscription_id"] = subscription_id
    if customer_id:
        payload["stripe_customer_id"] = customer_id
    _users().document(uid).set(payload, merge=True)


def downgrade_to_starter(uid: str) -> None:
    set_user_plan(uid, "starter", status="canceled")


def check_can_create_cv(uid: str, current_cv_count: int) -> Tuple[bool, str]:
    profile = get_user_profile(uid)
    if current_cv_count >= profile["max_cvs"]:
        if profile["plan"] == "starter":
            return False, "Free plan includes 1 CV. Upgrade to Pro for unlimited CVs."
        return False, "CV limit reached for your plan."
    return True, ""


def check_can_send_ai(uid: str) -> Tuple[bool, str]:
    profile = get_user_profile(uid)
    if profile["ai_messages_used"] >= profile["ai_messages_limit"]:
        return False, "Monthly AI message limit reached. Upgrade to Pro for unlimited chat."
    return True, ""


def increment_ai_usage(uid: str) -> None:
    if not is_enabled():
        return
    ref = _users().document(uid)
    snap = ref.get()
    data = snap.to_dict() if snap.exists else {}
    month = _month_key()
    used = data.get("ai_messages_used", 0) if data.get("ai_usage_month") == month else 0
    ref.set({"ai_usage_month": month, "ai_messages_used": used + 1}, merge=True)
