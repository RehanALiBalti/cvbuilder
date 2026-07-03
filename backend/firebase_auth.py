"""Firebase ID token verification for API routes."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, Request

from backend.firebase_app import is_enabled


@dataclass
class AuthUser:
    uid: str
    email: Optional[str] = None
    name: Optional[str] = None


async def require_user(request: Request) -> AuthUser:
    """Require a valid Firebase user, or local-dev fallback when Firebase is off."""
    if not is_enabled():
        return AuthUser(uid="local-dev", email="dev@local", name="Local Dev")

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
