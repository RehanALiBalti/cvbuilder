"""Stripe billing — checkout sessions for ResumeAI plans."""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

PLANS: List[Dict[str, Any]] = [
    {
        "id": "starter",
        "name": "Starter",
        "description": "Perfect to try ResumeAI and build your first CV.",
        "monthly_price": 0,
        "yearly_price": 0,
        "features": [
            "1 CV workspace",
            "50 AI messages / month",
            "5 core templates",
            "PDF preview",
            "Basic export (1 / month)",
        ],
        "cta": "Get started free",
        "highlighted": False,
    },
    {
        "id": "pro",
        "name": "Pro",
        "description": "Everything you need to land interviews faster.",
        "monthly_price": 12,
        "yearly_price": 96,
        "features": [
            "Unlimited CVs",
            "Unlimited AI chat",
            "All 13 templates + custom themes",
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
        "description": "For teams, recruiters, and career coaches.",
        "monthly_price": 29,
        "yearly_price": 232,
        "features": [
            "Everything in Pro",
            "Up to 5 team seats",
            "Cover letter & LinkedIn AI",
            "Shared template library",
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
        raise ValueError("Starter plan is free — sign up instead.")
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
    if customer_email:
        params["customer_email"] = customer_email

    session = stripe.checkout.Session.create(**params)
    if not session.url:
        raise RuntimeError("Stripe did not return a checkout URL.")
    return {"url": session.url, "session_id": session.id}


def handle_stripe_webhook(payload: bytes, sig_header: str) -> None:
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
    if not secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET is not set.")

    import stripe

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    event = stripe.Webhook.construct_event(payload, sig_header, secret)

    from backend import user_service

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        uid = session.get("client_reference_id") or (session.get("metadata") or {}).get("firebase_uid")
        plan = (session.get("metadata") or {}).get("plan_id", "pro")
        if uid:
            user_service.set_user_plan(
                uid,
                plan,
                subscription_id=session.get("subscription") or "",
                customer_id=session.get("customer") or "",
                status="active",
            )
    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        uid = (sub.get("metadata") or {}).get("firebase_uid")
        if uid:
            user_service.downgrade_to_starter(uid)
