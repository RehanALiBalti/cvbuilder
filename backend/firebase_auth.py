"""Firebase ID token verification for API routes."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, Request

from backend.firebase_app import allow_local_auth_fallback, is_enabled


@dataclass
class AuthUser:
    uid: str
    email: Optional[str] = None
    name: Optional[str] = None


async def require_user(request: Request) -> AuthUser:
    """Require a valid Firebase user.

    The old local fallback made every server user share the same CV list. Keep it
    only for explicit local development via CVBUILDER_ALLOW_LOCAL_AUTH=1.
    """
    if not is_enabled():
        if allow_local_auth_fallback():
            return AuthUser(uid="local-dev", email="dev@local", name="Local Dev")
        raise HTTPException(
            status_code=503,
            detail=(
                "Firebase backend is not configured. Set FIREBASE_PROJECT_ID, "
                "FIREBASE_STORAGE_BUCKET, and GOOGLE_APPLICATION_CREDENTIALS."
            ),
        )

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required. Please sign in.")

    token = auth_header[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token.")

    try:
        from firebase_admin import auth

        decoded = auth.verify_id_token(token)
        return AuthUser(
            uid=decoded["uid"],
            email=decoded.get("email"),
            name=decoded.get("name"),
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please sign in again.") from exc


async def optional_user(request: Request) -> Optional[AuthUser]:
    """Return authenticated user when a valid token is sent; otherwise None."""
    if not is_enabled():
        if allow_local_auth_fallback():
            return AuthUser(uid="local-dev", email="dev@local", name="Local Dev")
        return None

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:].strip()
    if not token:
        return None

    try:
        from firebase_admin import auth

        decoded = auth.verify_id_token(token)
        return AuthUser(
            uid=decoded["uid"],
            email=decoded.get("email"),
            name=decoded.get("name"),
        )
    except Exception:
        return None
