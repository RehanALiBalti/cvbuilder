"""Firebase Storage for profile photos and CV uploads."""

from __future__ import annotations

from datetime import timedelta
from typing import Optional, Tuple

from backend.firebase_app import get_bucket, is_enabled

PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
PHOTO_CONTENT = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def _photo_prefix(user_id: str, cv_id: str) -> str:
    return f"users/{user_id}/cvs/{cv_id}/profile"


def save_profile_photo(user_id: str, cv_id: str, filename: str, data: bytes) -> str:
    ext = _ext(filename)
    if ext not in PHOTO_EXTENSIONS:
        raise ValueError("Profile photo must be JPG, PNG, or WebP.")

    bucket = get_bucket()
    prefix = _photo_prefix(user_id, cv_id)

    for old_ext in PHOTO_EXTENSIONS:
        try:
            bucket.blob(f"{prefix}{old_ext}").delete()
        except Exception:
            pass

    blob = bucket.blob(f"{prefix}{ext}")
    blob.upload_from_string(data, content_type=PHOTO_CONTENT.get(ext, "image/jpeg"))
    try:
        return blob.generate_signed_url(expiration=timedelta(days=365 * 5), method="GET")
    except Exception:
        return f"/api/cvs/{cv_id}/photo"


def get_photo_bytes(user_id: str, cv_id: str) -> Optional[Tuple[bytes, str]]:
    bucket = get_bucket()
    prefix = _photo_prefix(user_id, cv_id)
    for ext in PHOTO_EXTENSIONS:
        blob = bucket.blob(f"{prefix}{ext}")
        if blob.exists():
            return blob.download_as_bytes(), PHOTO_CONTENT.get(ext, "image/jpeg")
    return None


def delete_uploads(user_id: str, cv_id: str) -> None:
    bucket = get_bucket()
    prefix = f"users/{user_id}/cvs/{cv_id}/"
    for blob in bucket.list_blobs(prefix=prefix):
        try:
            blob.delete()
        except Exception:
            pass


def copy_uploads(user_id: str, source_id: str, dest_id: str) -> None:
    bucket = get_bucket()
    src_prefix = f"users/{user_id}/cvs/{source_id}/"
    for blob in bucket.list_blobs(prefix=src_prefix):
        name = blob.name.split("/")[-1]
        if name.startswith("profile."):
            dest_blob = bucket.blob(f"users/{user_id}/cvs/{dest_id}/{name}")
            bucket.copy_blob(blob, bucket, dest_blob.name)


def _ext(filename: str) -> str:
    import os
    return os.path.splitext(filename or "")[1].lower()


def uses_firebase() -> bool:
    return is_enabled()
