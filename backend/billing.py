"""Stripe billing — checkout sessions for ResumeAI plans (Basic / Pro / Business)."""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

PLANS: List[Dict[str, Any]] = [
    {
        "id": "starter",
        "name": "Basic",
        "description": "Free forever. Build your first CV with AI chat.",
        "monthly_price": 0,
        "yearly_price": 0,
        "features": [
            "1 CV workspace",
            "50 AI messages / month",
            "Default template (no template picker)",
            "PDF & Word export",
            "Chat history saved",
        ],
        "cta": "Get started free",
        "highlighted": False,
    },
    {
        "id": "pro",
        "name": "Pro",
        "description": "For job seekers who want more templates and up to 10 CVs.",
        "monthly_price": 12,
        "yearly_price": 96,
        "features": [
            "Up to 10 CVs",
            "Unlimited AI chat",
            "15 professional templates",
            "Styled PDF & Word export",
            "CV upload & profile photo",
            "Priority email support",
        ],
        "cta": "Upgrade to Pro",
        "highlighted": True,
        "badge": "Most popular",
    },
    {
        "id": "business",
        "name": "Business",
        "description": "Full access for teams, recruiters, and career coaches.",
        "monthly_price": 29,
        "yearly_price": 232,
        "features": [
            "Everything in Pro",
            "Unlimited CVs",
            "All templates unlocked",
            "Custom color themes",
            "Up to 5 team seats",
            "Cover letter & LinkedIn AI",
            "Dedicated onboarding",
        ],
        "cta": "Upgrade to Business",
        "highlighted": False,
    },
]

# Stripe Price IDs — set in environment after creating products in Stripe Dashboard
PRICE_ENV_KEYS = {
    ("pro", "monthly"): "STRIPE_PRICE_PRO_MONTHLY",
    ("pro", "yearly"): "STRIPE_PRICE_PRO_YEARLY",
    ("business", "monthly"): "STRIPE_PRICE_BUSINESS_MONTHLY",
    ("business", "yearly"): "STRIPE_PRICE_BUSINESS_YEARLY",
}


def stripe_configured() -> bool:
    return bool(os.getenv("STRIPE_SECRET_KEY", "").strip())


def get_public_plans() -> List[Dict[str, Any]]:
    yearly_savings = {}
    for p in PLANS:
        if p["monthly_price"] and p["yearly_price"]:
            full_year = p["monthly_price"] * 12
            pct = round((1 - p["yearly_price"] / full_year) * 100)
            yearly_savings[p["id"]] = pct
    out = []
    for p in PLANS:
        item = {**p}
        item["yearly_savings_pct"] = yearly_savings.get(p["id"], 0)
        item["stripe_enabled"] = stripe_configured() and p["id"] != "starter"
        out.append(item)
    return out


def _price_id(plan_id: str, interval: str) -> Optional[str]:
    key = PRICE_ENV_KEYS.get((plan_id, interval))
    if not key:
        return None
    return os.getenv(key, "").strip() or None


def _public_base_url() -> str:
    return os.getenv("CVBUILDER_PUBLIC_URL", "http://localhost:5174/cvbuilder").rstrip("/")


def create_checkout_session(
    plan_id: str,
    interval: str,
    customer_email: Optional[str] = None,
    firebase_uid: Optional[str] = None,
) -> Dict[str, str]:
    if plan_id == "starter":
        raise ValueError("Basic plan is free — sign up instead.")
    if interval not in ("monthly", "yearly"):
        raise ValueError("interval must be monthly or yearly")

    secret = os.getenv("STRIPE_SECRET_KEY", "").strip()
    if not secret:
        raise RuntimeError(
            "Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs on the server."
        )

    price_id = _price_id(plan_id, interval)
    if not price_id:
        raise RuntimeError(
            f"Missing Stripe price for {plan_id}/{interval}. "
            f"Set {PRICE_ENV_KEYS.get((plan_id, interval))} in environment."
        )

    import stripe  # lazy import — optional dependency until configured

    stripe.api_key = secret
    base = _public_base_url()

    params: Dict[str, Any] = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{base}/builder/account?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{base}/builder/account?checkout=cancel",
        "metadata": {"plan_id": plan_id, "interval": interval},
        "allow_promotion_codes": True,
    }
    if firebase_uid:
        params["metadata"]["firebase_uid"] = firebase_uid
        params["client_reference_id"] = firebase_uid
        params["subscription_data"] = {
            "metadata": {"plan_id": plan_id, "interval": interval, "firebase_uid": firebase_uid},
        }
    if customer_email:
        params["customer_email"] = customer_email

    session = stripe.checkout.Session.create(**params)
    if not session.url:
        raise RuntimeError("Stripe did not return a checkout URL.")
    return {"url": session.url, "session_id": session.id}


def _stripe_obj_to_dict(obj: Any) -> Dict[str, Any]:
    """StripeObject does not support dict.get(); normalize to a plain dict."""
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    try:
        return dict(obj)
    except Exception:
        return {}


def handle_stripe_webhook(payload: bytes, sig_header: str) -> None:
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip().strip('"').strip("'")
    if not secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET is not set on the server.")
    if not sig_header:
        raise ValueError(
            "Missing Stripe-Signature header. Open this URL only via Stripe webhooks, not the browser."
        )
    if not payload:
        raise ValueError("Empty webhook body.")

    import stripe

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "").strip().strip('"').strip("'")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except stripe.error.SignatureVerificationError as exc:
        raise ValueError(
            "Invalid Stripe signature. Check STRIPE_WEBHOOK_SECRET matches the "
            "Signing secret for this endpoint in Stripe Dashboard → Webhooks."
        ) from exc
    except ValueError as exc:
        raise ValueError(f"Invalid webhook payload: {exc}") from exc

    from backend import user_service

    event_data = _stripe_obj_to_dict(event)
    event_type = event_data.get("type") or getattr(event, "type", "")
    data_object = _stripe_obj_to_dict(_stripe_obj_to_dict(event_data.get("data")).get("object"))
    if not data_object and hasattr(event, "data"):
        data_object = _stripe_obj_to_dict(getattr(event.data, "object", None))

    if event_type == "checkout.session.completed":
        session = data_object
        metadata = _stripe_obj_to_dict(session.get("metadata"))
        uid = session.get("client_reference_id") or metadata.get("firebase_uid")
        plan = metadata.get("plan_id") or "pro"
        if uid:
            user_service.set_user_plan(
                uid,
                plan,
                subscription_id=session.get("subscription") or "",
                customer_id=session.get("customer") or "",
                status="active",
            )
    elif event_type == "customer.subscription.deleted":
        sub = data_object
        metadata = _stripe_obj_to_dict(sub.get("metadata"))
        uid = metadata.get("firebase_uid")
        if uid:
            user_service.downgrade_to_starter(uid)
