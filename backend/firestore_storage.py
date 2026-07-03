"""Firestore storage for per-user CV documents and versions."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from backend.firebase_app import get_db, is_enabled
from backend.models import CVDocument, CVListItem, CVVersion


class StorageError(RuntimeError):
    """Raised when Firestore storage cannot be read or written."""


def _cvs_col(user_id: str):
    return get_db().collection("users").document(user_id).collection("cvs")


def _versions_col(user_id: str, cv_id: str):
    return _cvs_col(user_id).document(cv_id).collection("versions")


def check_storage() -> Dict[str, Any]:
    from backend.firebase_app import check_firebase

    fb = check_firebase()
    return {
        "ok": fb.get("ok", False),
        "backend": "firestore",
        "project_id": fb.get("project_id"),
        "storage_bucket": fb.get("storage_bucket"),
        "error": fb.get("error"),
    }


def list_cvs(user_id: str) -> List[CVListItem]:
    items: List[CVListItem] = []
    for snap in _cvs_col(user_id).stream():
        data = snap.to_dict() or {}
        try:
            items.append(CVListItem(
                id=snap.id,
                name=data.get("name", "Untitled CV"),
                template_id=data.get("template_id", "professional"),
                job_title=(data.get("content") or {}).get("job_title", ""),
                updated_at=data.get("updated_at", ""),
            ))
        except Exception:
            continue
    items.sort(key=lambda x: x.updated_at, reverse=True)
    return items


def get_cv(user_id: str, cv_id: str) -> Optional[CVDocument]:
    snap = _cvs_col(user_id).document(cv_id).get()
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    data["id"] = cv_id
    return CVDocument(**data)


def create_cv(user_id: str, doc: CVDocument) -> CVDocument:
    payload = doc.model_dump()
    payload["user_id"] = user_id
    _cvs_col(user_id).document(doc.id).set(payload)
    return doc


def update_cv(
    user_id: str,
    cv_id: str,
    doc: CVDocument,
    save_version: bool = False,
    version_label: str = "",
) -> Optional[CVDocument]:
    existing = get_cv(user_id, cv_id)
    if not existing:
        return None

    if save_version:
        save_version_snapshot(
            user_id,
            existing,
            version_label or f"Auto-save {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        )

    doc.id = cv_id
    doc.created_at = existing.created_at
    doc.updated_at = datetime.utcnow().isoformat()
    return create_cv(user_id, doc)


def delete_cv(user_id: str, cv_id: str) -> bool:
    ref = _cvs_col(user_id).document(cv_id)
    if not ref.get().exists:
        return False

    for v in _versions_col(user_id, cv_id).stream():
        v.reference.delete()

    ref.delete()

    try:
        from backend import upload_service
        upload_service.delete_uploads(user_id, cv_id)
    except Exception:
        pass
    return True


def duplicate_cv(user_id: str, cv_id: str) -> Optional[CVDocument]:
    source = get_cv(user_id, cv_id)
    if not source:
        return None

    data = source.model_dump()
    new_id = str(uuid4())
    data["id"] = new_id
    data["name"] = f"{source.name} (Copy)"
    data["created_at"] = datetime.utcnow().isoformat()
    data["updated_at"] = data["created_at"]
    doc = CVDocument(**data)

    if source.content.profile_photo:
        try:
            from backend import upload_service
            upload_service.copy_uploads(user_id, cv_id, new_id)
            doc.content.profile_photo = f"/api/cvs/{new_id}/photo"
        except Exception:
            pass

    return create_cv(user_id, doc)


def rename_cv(user_id: str, cv_id: str, name: str) -> Optional[CVDocument]:
    doc = get_cv(user_id, cv_id)
    if not doc:
        return None
    doc.name = name.strip() or doc.name
    doc.updated_at = datetime.utcnow().isoformat()
    return create_cv(user_id, doc)


def save_version_snapshot(user_id: str, doc: CVDocument, label: str = "") -> CVVersion:
    version = CVVersion(
        cv_id=doc.id,
        label=label or f"Version {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        snapshot=doc.model_copy(deep=True),
    )
    _versions_col(user_id, doc.id).document(version.id).set(version.model_dump())

    snaps = list(_versions_col(user_id, doc.id).stream())
    snaps.sort(key=lambda s: (s.to_dict() or {}).get("created_at", ""), reverse=True)
    for old in snaps[20:]:
        old.reference.delete()

    return version


def list_versions(user_id: str, cv_id: str) -> List[CVVersion]:
    versions = [CVVersion(**(s.to_dict() or {})) for s in _versions_col(user_id, cv_id).stream()]
    versions.sort(key=lambda v: v.created_at, reverse=True)
    return versions


def restore_version(user_id: str, cv_id: str, version_id: str) -> Optional[CVDocument]:
    snap = _versions_col(user_id, cv_id).document(version_id).get()
    if not snap.exists:
        return None
    version = CVVersion(**(snap.to_dict() or {}))
    restored = version.snapshot.model_copy(deep=True)
    restored.updated_at = datetime.utcnow().isoformat()
    return update_cv(user_id, cv_id, restored, save_version=True, version_label=f"Restored: {version.label}")
