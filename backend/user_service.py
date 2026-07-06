"""User profiles and plan limits via Firestore."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from backend.firebase_app import get_db, is_enabled
from backend.local_storage import StorageError

PLAN_LIMITS: Dict[str, Dict[str, int]] = {
    "starter": {"max_cvs": 5, "max_ai_messages_month": 50},
    "pro": {"max_cvs": 10, "max_ai_messages_month": 100_000},
    "business": {"max_cvs": 100_000, "max_ai_messages_month": 100_000},
}

# Subscription statuses that mean paid access is gone
EXPIRED_STATUSES = frozenset({"canceled", "expired", "unpaid", "incomplete_expired"})


def _month_key() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_iso(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    try:
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _default_user_doc() -> Dict[str, Any]:
    return {
        "plan": "starter",
        "subscription_status": "free",
        "ai_usage_month": _month_key(),
        "ai_messages_used": 0,
    }


def _users():
    try:
        return get_db().collection("users")
    except Exception as exc:
        raise StorageError(f"Firestore unavailable: {exc}") from exc


def get_user_doc(uid: str) -> Dict[str, Any]:
    if not is_enabled():
        return _default_user_doc()
    try:
        snap = _users().document(uid).get()
        if not snap.exists:
            return _default_user_doc()
        data = snap.to_dict() or {}
        data.setdefault("plan", "starter")
        return data
    except StorageError:
        raise
    except Exception as exc:
        raise StorageError(f"Could not read user profile: {exc}") from exc


def get_user_plan(uid: str) -> str:
    return get_user_profile(uid).get("plan", "starter")


def _apply_expiry_if_needed(uid: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """If paid access ended, force Basic plan limits (webhook safety net)."""
    plan = data.get("plan", "starter")
    status = (data.get("subscription_status") or "").lower()
    if plan == "starter":
        return data

    expired = status in EXPIRED_STATUSES
    if status == "canceling":
        period_end = _parse_iso(data.get("plan_period_end"))
        if period_end and _utcnow() >= period_end:
            expired = True

    if not expired:
        return data

    # Persist downgrade once (safety net when webhook is late/missed)
    if status != "expired" or plan != "starter":
        try:
            downgrade_to_starter(uid, reason="period_ended" if status == "canceling" else status or "expired")
        except Exception:
            pass
    return {**data, "plan": "starter", "subscription_status": "expired"}


def get_user_profile(uid: str) -> Dict[str, Any]:
    data = _apply_expiry_if_needed(uid, get_user_doc(uid))
    plan = data.get("plan", "starter")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["starter"])
    usage_month = data.get("ai_usage_month", "")
    messages_used = data.get("ai_messages_used", 0) if usage_month == _month_key() else 0
    status = data.get("subscription_status", "active" if plan != "starter" else "free")
    period_end = data.get("plan_period_end") or ""
    return {
        "uid": uid,
        "plan": plan,
        "subscription_status": status,
        "plan_period_end": period_end,
        "plan_expired": status == "expired" or status in EXPIRED_STATUSES,
        "plan_canceling": status == "canceling",
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
    period_end: Optional[str] = None,
) -> None:
    if not is_enabled():
        return
    payload: Dict[str, Any] = {
        "plan": plan,
        "subscription_status": status,
        "plan_updated_at": _utcnow().isoformat(),
    }
    if subscription_id:
        payload["stripe_subscription_id"] = subscription_id
    if customer_id:
        payload["stripe_customer_id"] = customer_id
    if period_end is not None:
        payload["plan_period_end"] = period_end
    _users().document(uid).set(payload, merge=True)


def downgrade_to_starter(uid: str, *, reason: str = "canceled") -> None:
    if not is_enabled():
        return
    status = "expired" if reason in {"period_ended", "expired", "unpaid"} else "canceled"
    _users().document(uid).set(
        {
            "plan": "starter",
            "subscription_status": status,
            "plan_updated_at": _utcnow().isoformat(),
            "plan_expired_at": _utcnow().isoformat(),
            "plan_expire_reason": reason,
        },
        merge=True,
    )


def find_uid_by_stripe(
    *,
    subscription_id: str = "",
    customer_id: str = "",
) -> Optional[str]:
    """Resolve Firebase uid from Stripe ids when webhook metadata is missing."""
    if not is_enabled():
        return None
    try:
        users = _users()
        if subscription_id:
            snaps = users.where("stripe_subscription_id", "==", subscription_id).limit(1).stream()
            for snap in snaps:
                return snap.id
        if customer_id:
            snaps = users.where("stripe_customer_id", "==", customer_id).limit(1).stream()
            for snap in snaps:
                return snap.id
    except Exception:
        return None
    return None


def mark_subscription_canceling(uid: str, period_end: str = "") -> None:
    """User canceled but still has access until period_end."""
    if not is_enabled():
        return
    payload: Dict[str, Any] = {
        "subscription_status": "canceling",
        "plan_updated_at": _utcnow().isoformat(),
    }
    if period_end:
        payload["plan_period_end"] = period_end
    _users().document(uid).set(payload, merge=True)


def check_can_create_cv(uid: str, current_cv_count: int) -> Tuple[bool, str]:
    profile = get_user_profile(uid)
    if current_cv_count >= profile["max_cvs"]:
        if profile["plan"] == "starter":
            return False, "Basic plan includes 5 CVs. Upgrade to Pro for up to 10 CVs."
        if profile["plan"] == "pro":
            return False, "Pro plan includes 10 CVs. Upgrade to Business for unlimited CVs."
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
