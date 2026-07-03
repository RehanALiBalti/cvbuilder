"""Firebase Admin SDK initialization (Auth, Firestore, Storage)."""

from __future__ import annotations

import json
import os
from typing import Any, Optional

_app: Any = None


def is_enabled() -> bool:
    """True only when project id and usable credentials are present."""
    project = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    if not project:
        return False

    json_raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if json_raw:
        try:
            json.loads(json_raw)
            return True
        except json.JSONDecodeError:
            return False

    path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    return bool(path and os.path.isfile(path))


def allow_local_auth_fallback() -> bool:
    """Local fallback is opt-in so production never shares CVs across users."""
    return os.getenv("CVBUILDER_ALLOW_LOCAL_AUTH", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }


def _load_credentials():
    from firebase_admin import credentials

    json_raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if json_raw:
        return credentials.Certificate(json.loads(json_raw))

    path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if path and os.path.isfile(path):
        return credentials.Certificate(path)

    raise RuntimeError(
        "Firebase credentials missing. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON."
    )


def get_app():
    global _app
    if _app is not None:
        return _app
    if not is_enabled():
        raise RuntimeError("Firebase is not configured.")

    import firebase_admin

    project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    options: dict[str, Any] = {}
    if project_id:
        options["projectId"] = project_id
    bucket = os.getenv("FIREBASE_STORAGE_BUCKET", "").strip()
    if bucket:
        options["storageBucket"] = bucket

    _app = firebase_admin.initialize_app(_load_credentials(), options or None)
    return _app


def get_db():
    from firebase_admin import firestore

    get_app()
    return firestore.client()


def get_bucket():
    from firebase_admin import storage

    get_app()
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "").strip()
    if not bucket_name:
        raise RuntimeError("FIREBASE_STORAGE_BUCKET is not set.")
    return storage.bucket(bucket_name)


def check_firebase() -> dict:
    project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET", "").strip()
    if not is_enabled():
        return {
            "ok": False,
            "enabled": False,
            "project_id": project_id or None,
            "error": "Firebase env vars not set",
        }
    try:
        db = get_db()
        db.collection("_health").document("ping").get()
        return {
            "ok": True,
            "enabled": True,
            "project_id": project_id,
            "storage_bucket": storage_bucket,
        }
    except Exception as exc:
        err = str(exc)
        fix: list[str] = []
        if "SERVICE_DISABLED" in err or "firestore.googleapis.com" in err:
            fix.append(
                "Enable Cloud Firestore API: "
                "https://console.developers.google.com/apis/api/firestore.googleapis.com/overview"
                f"?project={project_id}"
            )
        if "does not exist" in err.lower() and "database" in err.lower():
            fix.append(
                "Create Firestore database (default): "
                f"https://console.cloud.google.com/firestore/databases?project={project_id}"
            )
        return {
            "ok": False,
            "enabled": True,
            "project_id": project_id,
            "storage_bucket": storage_bucket,
            "error": err,
            "fix": fix,
        }
