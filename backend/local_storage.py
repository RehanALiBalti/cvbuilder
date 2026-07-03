"""Local JSON file storage (fallback when Firebase is not configured)."""

from __future__ import annotations

import json
import os
import shutil
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from backend.models import CVDocument, CVListItem, CVVersion

APP_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.getenv("CVBUILDER_DATA_DIR", os.path.join(APP_ROOT, "data"))
CVS_DIR = os.path.join(DATA_DIR, "cvs")
VERSIONS_DIR = os.path.join(DATA_DIR, "versions")
INDEX_FILE = os.path.join(DATA_DIR, "index.json")


class StorageError(RuntimeError):
    """Raised when CV storage cannot be read or written."""


def _writable_dir(path: str) -> bool:
    return os.path.isdir(path) and os.access(path, os.W_OK | os.X_OK)


def _ensure_dirs() -> None:
    try:
        for path in (DATA_DIR, CVS_DIR, VERSIONS_DIR):
            os.makedirs(path, exist_ok=True)
    except OSError as exc:
        raise StorageError(f"Cannot create data directories under {DATA_DIR}: {exc}") from exc

    if not _writable_dir(DATA_DIR):
        raise StorageError(
            f"Data directory is not writable: {DATA_DIR}. "
            "Run: sudo chown -R www-data:www-data /opt/cvbuilder/data"
        )

    if not os.path.isfile(INDEX_FILE):
        _save_index({"cvs": []})


def _load_index() -> Dict[str, Any]:
    _ensure_dirs()
    try:
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        backup = f"{INDEX_FILE}.corrupt-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        shutil.move(INDEX_FILE, backup)
        data = {"cvs": []}
        _save_index(data)
    except OSError as exc:
        raise StorageError(f"Cannot read index file {INDEX_FILE}: {exc}") from exc

    if not isinstance(data, dict):
        data = {"cvs": []}
        _save_index(data)
    data.setdefault("cvs", [])
    return data


def _save_index(data: Dict[str, Any]) -> None:
    _ensure_dirs()
    tmp_path = f"{INDEX_FILE}.tmp"
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, INDEX_FILE)
    except OSError as exc:
        if os.path.isfile(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        raise StorageError(f"Cannot write index file {INDEX_FILE}: {exc}") from exc


def _cv_path(cv_id: str) -> str:
    return os.path.join(CVS_DIR, f"{cv_id}.json")


def _versions_path(cv_id: str) -> str:
    return os.path.join(VERSIONS_DIR, f"{cv_id}.json")


def check_storage() -> Dict[str, Any]:
    try:
        _ensure_dirs()
        return {"ok": True, "backend": "local", "data_dir": DATA_DIR, "writable": True}
    except StorageError as exc:
        return {"ok": False, "backend": "local", "data_dir": DATA_DIR, "writable": False, "error": str(exc)}


def list_cvs(user_id: str) -> List[CVListItem]:
    del user_id
    index = _load_index()
    items: List[CVListItem] = []
    for entry in index.get("cvs", []):
        if not isinstance(entry, dict):
            continue
        try:
            items.append(CVListItem(**entry))
        except Exception:
            continue
    items.sort(key=lambda x: x.updated_at, reverse=True)
    return items


def get_cv(user_id: str, cv_id: str) -> Optional[CVDocument]:
    del user_id
    path = _cv_path(cv_id)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return CVDocument(**json.load(f))
    except OSError as exc:
        raise StorageError(f"Cannot read CV file {path}: {exc}") from exc


def create_cv(user_id: str, doc: CVDocument) -> CVDocument:
    del user_id
    _ensure_dirs()
    path = _cv_path(doc.id)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc.model_dump(), f, indent=2, ensure_ascii=False)
    except OSError as exc:
        raise StorageError(f"Cannot write CV file {path}: {exc}") from exc

    index = _load_index()
    index["cvs"] = [e for e in index.get("cvs", []) if e.get("id") != doc.id]
    index["cvs"].append({
        "id": doc.id,
        "name": doc.name,
        "template_id": doc.template_id,
        "job_title": doc.content.job_title,
        "updated_at": doc.updated_at,
    })
    _save_index(index)
    return doc


def update_cv(
    user_id: str,
    cv_id: str,
    doc: CVDocument,
    save_version: bool = False,
    version_label: str = "",
) -> Optional[CVDocument]:
    del user_id
    existing = get_cv("", cv_id)
    if not existing:
        return None

    if save_version:
        save_version_snapshot("", existing, version_label or f"Auto-save {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")

    doc.id = cv_id
    doc.created_at = existing.created_at
    doc.updated_at = datetime.utcnow().isoformat()
    return create_cv("", doc)


def delete_cv(user_id: str, cv_id: str) -> bool:
    del user_id
    path = _cv_path(cv_id)
    if not os.path.isfile(path):
        return False
    os.remove(path)

    vpath = _versions_path(cv_id)
    if os.path.isfile(vpath):
        os.remove(vpath)

    try:
        from backend import upload_service
        upload_service.delete_uploads("", cv_id)
    except Exception:
        pass

    index = _load_index()
    index["cvs"] = [e for e in index.get("cvs", []) if e.get("id") != cv_id]
    _save_index(index)
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
    del user_id
    _ensure_dirs()
    version = CVVersion(
        cv_id=doc.id,
        label=label or f"Version {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        snapshot=doc.model_copy(deep=True),
    )
    vpath = _versions_path(doc.id)
    versions: List[Dict[str, Any]] = []
    if os.path.isfile(vpath):
        with open(vpath, "r", encoding="utf-8") as f:
            versions = json.load(f).get("versions", [])

    versions.insert(0, version.model_dump())
    versions = versions[:20]

    with open(vpath, "w", encoding="utf-8") as f:
        json.dump({"versions": versions}, f, indent=2, ensure_ascii=False)
    return version


def list_versions(user_id: str, cv_id: str) -> List[CVVersion]:
    del user_id
    vpath = _versions_path(cv_id)
    if not os.path.isfile(vpath):
        return []
    with open(vpath, "r", encoding="utf-8") as f:
        raw = json.load(f).get("versions", [])
    return [CVVersion(**v) for v in raw]


def restore_version(user_id: str, cv_id: str, version_id: str) -> Optional[CVDocument]:
    versions = list_versions(user_id, cv_id)
    match = next((v for v in versions if v.id == version_id), None)
    if not match:
        return None
    restored = match.snapshot.model_copy(deep=True)
    restored.updated_at = datetime.utcnow().isoformat()
    return update_cv(user_id, cv_id, restored, save_version=True, version_label=f"Restored: {match.label}")
