"""Storage facade — Firestore when Firebase is configured, else local JSON files."""

from __future__ import annotations

from typing import List, Optional

from backend.firebase_app import allow_local_auth_fallback, is_enabled
from backend.local_storage import StorageError
from backend.models import CVDocument, CVListItem, CVVersion


def _impl():
    if is_enabled():
        from backend import firestore_storage
        return firestore_storage
    if not allow_local_auth_fallback():
        raise StorageError(
            "Firebase backend is not configured. Refusing to use shared local CV storage."
        )
    from backend import local_storage
    return local_storage


def check_storage():
    try:
        return _impl().check_storage()
    except StorageError as exc:
        return {"ok": False, "backend": "unavailable", "error": str(exc)}
    except Exception as exc:
        return {"ok": False, "backend": "unavailable", "error": f"Storage check failed: {exc}"}


def _call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except StorageError:
        raise
    except Exception as exc:
        raise StorageError(str(exc)) from exc


def list_cvs(user_id: str) -> List[CVListItem]:
    return _call(_impl().list_cvs, user_id)


def get_cv(user_id: str, cv_id: str) -> Optional[CVDocument]:
    return _call(_impl().get_cv, user_id, cv_id)


def create_cv(user_id: str, doc: CVDocument) -> CVDocument:
    return _call(_impl().create_cv, user_id, doc)


def update_cv(
    user_id: str,
    cv_id: str,
    doc: CVDocument,
    save_version: bool = False,
    version_label: str = "",
) -> Optional[CVDocument]:
    return _call(_impl().update_cv, user_id, cv_id, doc, save_version, version_label)


def delete_cv(user_id: str, cv_id: str) -> bool:
    return _call(_impl().delete_cv, user_id, cv_id)


def duplicate_cv(user_id: str, cv_id: str) -> Optional[CVDocument]:
    return _call(_impl().duplicate_cv, user_id, cv_id)


def rename_cv(user_id: str, cv_id: str, name: str) -> Optional[CVDocument]:
    return _call(_impl().rename_cv, user_id, cv_id, name)


def save_version_snapshot(user_id: str, doc: CVDocument, label: str = "") -> CVVersion:
    return _call(_impl().save_version_snapshot, user_id, doc, label)


def list_versions(user_id: str, cv_id: str) -> List[CVVersion]:
    return _call(_impl().list_versions, user_id, cv_id)


def restore_version(user_id: str, cv_id: str, version_id: str) -> Optional[CVDocument]:
    return _call(_impl().restore_version, user_id, cv_id, version_id)
