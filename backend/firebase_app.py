"""Firebase Admin SDK initialization (Auth, Firestore, Storage)."""

from __future__ import annotations

import json
import os
from typing import Any, Optional

_app: Any = None


def is_enabled() -> bool:
    project = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    has_creds = bool(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
        or os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    )
    return bool(project and has_creds)


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

    options = {}
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
    if not is_enabled():
        return {"ok": False, "enabled": False, "error": "Firebase env vars not set"}
    try:
        db = get_db()
        db.collection("_health").document("ping").get()
        return {
            "ok": True,
            "enabled": True,
            "project_id": os.getenv("FIREBASE_PROJECT_ID"),
            "storage_bucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
        }
    except Exception as exc:
        return {"ok": False, "enabled": True, "error": str(exc)}
