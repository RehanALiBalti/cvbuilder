"""Store contact / complaint submissions in Firestore."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from backend.firebase_app import get_db, is_enabled


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def submit_contact(
    *,
    name: str,
    email: str,
    category: str,
    subject: str,
    message: str,
    user_id: Optional[str] = None,
    user_name: Optional[str] = None,
) -> Dict[str, Any]:
    if not is_enabled():
        raise RuntimeError("Database is not configured. Please try again later.")

    submission_id = str(uuid.uuid4())
    doc = {
        "id": submission_id,
        "name": name.strip(),
        "email": email.strip().lower(),
        "category": category.strip(),
        "subject": subject.strip(),
        "message": message.strip(),
        "user_id": user_id or "",
        "user_name": user_name or "",
        "status": "new",
        "source": "web",
        "created_at": _utcnow_iso(),
    }

    get_db().collection("contact_submissions").document(submission_id).set(doc)
    return doc
