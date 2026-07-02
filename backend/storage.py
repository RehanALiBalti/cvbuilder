"""JSON file storage for CV documents and version history."""

from __future__ import annotations

import json
import os
import shutil
from datetime import datetime
from typing import Any, Dict, List, Optional

from backend.models import CVDocument, CVListItem, CVVersion

APP_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.getenv("CVBUILDER_DATA_DIR", os.path.join(APP_ROOT, "data"))
CVS_DIR = os.path.join(DATA_DIR, "cvs")
VERSIONS_DIR = os.path.join(DATA_DIR, "versions")
INDEX_FILE = os.path.join(DATA_DIR, "index.json")


def _ensure_dirs() -> None:
    for path in (DATA_DIR, CVS_DIR, VERSIONS_DIR):
        os.makedirs(path, exist_ok=True)
    if not os.path.isfile(INDEX_FILE):
        _save_index({"cvs": []})


def _load_index() -> Dict[str, Any]:
    _ensure_dirs()
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_index(data: Dict[str, Any]) -> None:
    _ensure_dirs()
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _cv_path(cv_id: str) -> str:
    return os.path.join(CVS_DIR, f"{cv_id}.json")


def _versions_path(cv_id: str) -> str:
    return os.path.join(VERSIONS_DIR, f"{cv_id}.json")


def list_cvs() -> List[CVListItem]:
    index = _load_index()
    items: List[CVListItem] = []
    for entry in index.get("cvs", []):
        items.append(CVListItem(**entry))
    items.sort(key=lambda x: x.updated_at, reverse=True)
    return items


def get_cv(cv_id: str) -> Optional[CVDocument]:
    path = _cv_path(cv_id)
    if not os.path.isfile(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return CVDocument(**json.load(f))


def create_cv(doc: CVDocument) -> CVDocument:
    _ensure_dirs()
    path = _cv_path(doc.id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(doc.model_dump(), f, indent=2, ensure_ascii=False)

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


def update_cv(cv_id: str, doc: CVDocument, save_version: bool = False, version_label: str = "") -> Optional[CVDocument]:
    existing = get_cv(cv_id)
    if not existing:
        return None

    if save_version:
        save_version_snapshot(existing, version_label or f"Auto-save {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")

    doc.id = cv_id
    doc.created_at = existing.created_at
    doc.updated_at = datetime.utcnow().isoformat()
    return create_cv(doc)


def delete_cv(cv_id: str) -> bool:
    path = _cv_path(cv_id)
    if not os.path.isfile(path):
        return False
    os.remove(path)

    vpath = _versions_path(cv_id)
    if os.path.isfile(vpath):
        os.remove(vpath)

    index = _load_index()
    index["cvs"] = [e for e in index.get("cvs", []) if e.get("id") != cv_id]
    _save_index(index)
    return True


def duplicate_cv(cv_id: str) -> Optional[CVDocument]:
    source = get_cv(cv_id)
    if not source:
        return None
    data = source.model_dump()
    from uuid import uuid4
    data["id"] = str(uuid4())
    data["name"] = f"{source.name} (Copy)"
    data["created_at"] = datetime.utcnow().isoformat()
    data["updated_at"] = data["created_at"]
    return create_cv(CVDocument(**data))


def rename_cv(cv_id: str, name: str) -> Optional[CVDocument]:
    doc = get_cv(cv_id)
    if not doc:
        return None
    doc.name = name.strip() or doc.name
    doc.updated_at = datetime.utcnow().isoformat()
    return create_cv(doc)


def save_version_snapshot(doc: CVDocument, label: str = "") -> CVVersion:
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


def list_versions(cv_id: str) -> List[CVVersion]:
    vpath = _versions_path(cv_id)
    if not os.path.isfile(vpath):
        return []
    with open(vpath, "r", encoding="utf-8") as f:
        raw = json.load(f).get("versions", [])
    return [CVVersion(**v) for v in raw]


def restore_version(cv_id: str, version_id: str) -> Optional[CVDocument]:
    versions = list_versions(cv_id)
    match = next((v for v in versions if v.id == version_id), None)
    if not match:
        return None
    restored = match.snapshot.model_copy(deep=True)
    restored.updated_at = datetime.utcnow().isoformat()
    return update_cv(cv_id, restored, save_version=True, version_label=f"Restored: {match.label}")
