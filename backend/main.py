"""BuzzCVPilot FastAPI application."""

from __future__ import annotations

import os
import traceback
from contextlib import asynccontextmanager
from typing import Any, Dict

from datetime import timedelta

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from backend import ai_service, billing, export, storage, templates, upload_service, user_service
from backend.firebase_app import check_firebase, is_enabled
from backend.firebase_auth import AuthUser, require_user
from backend.storage import StorageError
from backend.models import (
    AIChatRequest,
    AICareerGuidanceRequest,
    AIAnalyzeRequest,
    AICoverLetterRequest,
    AIEnhanceRequest,
    AIGenerateRequest,
    AILinkedInRequest,
    AIOptimizeJobRequest,
    AIPolishRequest,
    AIRegenerateSectionRequest,
    AIResponse,
    CreateCVRequest,
    CVDocument,
    CheckoutRequest,
    RenameCVRequest,
    StyledExportRequest,
    UpdateCVRequest,
)

CORS_ORIGINS = os.getenv(
    "CVBUILDER_CORS_ORIGINS",
    os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5174,http://127.0.0.1:5174,http://localhost:3001",
    ),
).split(",")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    result = storage.check_storage()
    if not result.get("ok"):
        print(f"[buzzcvpilot] Storage warning: {result}")
    # Keep Firestore template catalog in sync (all designs including new ones)
    try:
        synced = templates.sync_templates_to_firestore()
        print(f"[buzzcvpilot] Templates catalog: {synced}")
    except Exception:
        traceback.print_exc()
    yield


app = FastAPI(
    title="BuzzCVPilot API",
    description="AI-powered professional resume builder",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StorageError)
async def storage_error_handler(_request: Request, exc: StorageError) -> JSONResponse:
    traceback.print_exc()
    return JSONResponse(
        status_code=503,
        content={"detail": str(exc)},
    )


@app.get("/api/health")
def health() -> Dict[str, Any]:
    ollama = ai_service.check_ollama()
    disk = storage.check_storage()
    firebase = check_firebase() if is_enabled() else {"enabled": False, "ok": False}
    status = "ok" if disk.get("ok") else "degraded"
    return {
        "status": status,
        "service": "buzzcvpilot-api",
        "storage": disk,
        "firebase": firebase,
        "templates_count": len(templates.list_templates()),
        "ollama": {"ok": ollama.get("ok", False)} if isinstance(ollama, dict) else {"ok": False},
    }


def _cv_or_404(user: AuthUser, cv_id: str) -> CVDocument:
    doc = storage.get_cv(user.uid, cv_id)
    if not doc:
        raise HTTPException(404, "CV not found")
    return doc


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

@app.get("/api/templates")
def get_templates() -> Dict[str, Any]:
    return {"templates": templates.list_templates()}


@app.post("/api/templates/sync")
def sync_templates_catalog(user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    """Force-sync template catalog into Firestore (admin/maintenance)."""
    result = templates.sync_templates_to_firestore()
    if not result.get("ok"):
        raise HTTPException(status_code=503, detail=result.get("error") or "Sync failed")
    return result


@app.get("/api/user/me")
def get_current_user_profile(user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    try:
        return {"profile": user_service.get_user_profile(user.uid)}
    except StorageError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# CV CRUD
# ---------------------------------------------------------------------------

@app.get("/api/cvs")
def list_cvs(user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    try:
        return {"cvs": [c.model_dump() for c in storage.list_cvs(user.uid)]}
    except StorageError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/cvs")
def create_cv(req: CreateCVRequest, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    existing = storage.list_cvs(user.uid)
    ok, msg = user_service.check_can_create_cv(user.uid, len(existing))
    if not ok:
        raise HTTPException(403, msg)
    tid = req.template_id
    if not tid or tid == "random":
        tid = templates.random_template_id()
    doc = CVDocument(
        name=req.name,
        template_id=tid,
        tone=req.tone,
        content=req.content or CVDocument().content,
    )
    saved = storage.create_cv(user.uid, doc)
    t = templates.get_template(saved.template_id)
    return {
        "success": True,
        "cv": saved.model_dump(),
        "template_name": t["name"],
    }


@app.get("/api/cvs/{cv_id}")
def get_cv(cv_id: str, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    return {"cv": _cv_or_404(user, cv_id).model_dump()}


@app.put("/api/cvs/{cv_id}")
def update_cv(cv_id: str, req: UpdateCVRequest, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    existing = _cv_or_404(user, cv_id)

    updated = existing.model_copy(deep=True)
    if req.name is not None:
        updated.name = req.name
    plan = user_service.get_user_plan(user.uid)
    if req.template_id is not None:
        changing_template = req.template_id != existing.template_id
        if changing_template:
            if plan == "starter":
                raise HTTPException(403, "Template picker is not available on Basic. Upgrade to Pro.")
            if not templates.plan_allows_template(plan, req.template_id):
                raise HTTPException(403, "This template requires Business plan.")
        updated.template_id = req.template_id
    if req.tone is not None:
        updated.tone = req.tone
    if req.content is not None:
        updated.content = req.content
    if req.theme_override is not None:
        existing_theme = existing.theme_override
        existing_dump = (
            existing_theme.model_dump()
            if existing_theme is not None and hasattr(existing_theme, "model_dump")
            else existing_theme
        )
        new_dump = (
            req.theme_override.model_dump()
            if hasattr(req.theme_override, "model_dump")
            else req.theme_override
        )
        if new_dump != existing_dump and plan != "business":
            raise HTTPException(403, "Custom themes are available on Business.")
        updated.theme_override = req.theme_override

    # Preserve share settings unless explicitly changed elsewhere
    updated.share_token = existing.share_token
    updated.is_public = existing.is_public

    saved = storage.update_cv(
        user.uid, cv_id, updated,
        save_version=req.save_version,
        version_label=req.version_label,
    )
    return {"success": True, "cv": saved.model_dump()}


@app.post("/api/cvs/{cv_id}/share")
def share_cv(cv_id: str, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    doc = storage.enable_share(user.uid, cv_id)
    if not doc:
        raise HTTPException(404, "CV not found")
    base = os.getenv("CVBUILDER_PUBLIC_URL", "").rstrip("/") or ""
    path = f"/share/{doc.share_token}"
    url = f"{base}{path}" if base else path
    return {"success": True, "share_token": doc.share_token, "url": url, "cv": doc.model_dump()}


@app.delete("/api/cvs/{cv_id}/share")
def unshare_cv(cv_id: str, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    doc = storage.disable_share(user.uid, cv_id)
    if not doc:
        raise HTTPException(404, "CV not found")
    return {"success": True, "cv": doc.model_dump()}


@app.get("/api/public/cvs/{token}")
def public_cv(token: str) -> Dict[str, Any]:
    data = storage.get_public_cv(token)
    if not data:
        raise HTTPException(404, "Shared CV not found or link is disabled")
    return {"cv": data}


@app.delete("/api/cvs/{cv_id}")
def delete_cv(cv_id: str, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    if not storage.delete_cv(user.uid, cv_id):
        raise HTTPException(404, "CV not found")
    return {"success": True}


@app.post("/api/cvs/{cv_id}/duplicate")
def duplicate_cv(cv_id: str, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    existing = storage.list_cvs(user.uid)
    ok, msg = user_service.check_can_create_cv(user.uid, len(existing))
    if not ok:
        raise HTTPException(403, msg)
    copy = storage.duplicate_cv(user.uid, cv_id)
    if not copy:
        raise HTTPException(404, "CV not found")
    return {"success": True, "cv": copy.model_dump()}


@app.patch("/api/cvs/{cv_id}/rename")
def rename_cv(cv_id: str, req: RenameCVRequest, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    doc = storage.rename_cv(user.uid, cv_id, req.name)
    if not doc:
        raise HTTPException(404, "CV not found")
    return {"success": True, "cv": doc.model_dump()}


@app.get("/api/cvs/{cv_id}/versions")
def list_versions(cv_id: str, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    _cv_or_404(user, cv_id)
    versions = storage.list_versions(user.uid, cv_id)
    return {
        "versions": [
            {"id": v.id, "label": v.label, "created_at": v.created_at}
            for v in versions
        ]
    }


@app.post("/api/cvs/{cv_id}/versions/{version_id}/restore")
def restore_version(cv_id: str, version_id: str, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    doc = storage.restore_version(user.uid, cv_id, version_id)
    if not doc:
        raise HTTPException(404, "CV or version not found")
    return {"success": True, "cv": doc.model_dump()}


@app.get("/api/cvs/{cv_id}/photo")
def get_cv_photo(cv_id: str, user: AuthUser = Depends(require_user)) -> Response:
    _cv_or_404(user, cv_id)
    photo = upload_service.get_photo_bytes(user.uid, cv_id)
    if not photo:
        raise HTTPException(404, "No profile photo")
    data, media = photo
    return Response(content=data, media_type=media)


@app.post("/api/cvs/{cv_id}/upload/cv")
async def upload_cv_file(
    cv_id: str,
    file: UploadFile = File(...),
    user: AuthUser = Depends(require_user),
) -> Dict[str, Any]:
    doc = _cv_or_404(user, cv_id)
    data = await file.read()
    try:
        updated, message = upload_service.process_cv_file(doc, file.filename or "resume.pdf", data, doc.tone)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(400, str(exc)) from exc
    updated.content.profile_photo = doc.content.profile_photo or updated.content.profile_photo
    saved = storage.update_cv(user.uid, cv_id, updated)
    return {
        "success": True,
        "message": message,
        "cv": saved.model_dump(),
        "reply": message,
    }


@app.post("/api/cvs/{cv_id}/upload/photo")
async def upload_profile_photo(
    cv_id: str,
    file: UploadFile = File(...),
    user: AuthUser = Depends(require_user),
) -> Dict[str, Any]:
    doc = _cv_or_404(user, cv_id)
    data = await file.read()
    try:
        photo_path = upload_service.save_profile_photo(user.uid, cv_id, file.filename or "photo.jpg", data)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    updated = doc.model_copy(deep=True)
    updated.content.profile_photo = photo_path
    saved = storage.update_cv(user.uid, cv_id, updated)
    return {
        "success": True,
        "message": "Profile photo uploaded.",
        "cv": saved.model_dump(),
        "reply": "Profile photo added to your CV preview.",
    }


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

@app.get("/api/cvs/{cv_id}/export/pdf")
def export_pdf(cv_id: str, user: AuthUser = Depends(require_user)) -> Response:
    doc = _cv_or_404(user, cv_id)
    try:
        data, filename = export.export_pdf(doc)
    except RuntimeError as exc:
        raise HTTPException(501, str(exc)) from exc
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/cvs/{cv_id}/export/docx")
def export_docx(cv_id: str, user: AuthUser = Depends(require_user)) -> Response:
    doc = _cv_or_404(user, cv_id)
    try:
        data, filename = export.export_docx(doc)
    except RuntimeError as exc:
        raise HTTPException(501, str(exc)) from exc
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/cvs/{cv_id}/export/styled-docx")
def export_styled_docx(
    cv_id: str,
    body: StyledExportRequest,
    user: AuthUser = Depends(require_user),
) -> Response:
    """Export CV as Word using the same HTML/CSS as the live template preview."""
    doc = _cv_or_404(user, cv_id)
    try:
        data, filename = export.export_styled_docx(body.html, doc)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(501, str(exc)) from exc
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# AI endpoints
# ---------------------------------------------------------------------------

def _ai_handler(fn, *args, **kwargs) -> AIResponse:
    try:
        return fn(*args, **kwargs)
    except Exception as exc:
        traceback.print_exc()
        return AIResponse(success=False, message=str(exc))


@app.post("/api/ai/generate")
def ai_generate(req: AIGenerateRequest) -> Dict[str, Any]:
    result = _ai_handler(
        ai_service.generate_cv,
        req.raw_input, req.tone, req.target_role, req.industry,
    )
    return result.model_dump()


@app.post("/api/ai/polish")
def ai_polish(req: AIPolishRequest, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    """One-shot professional polish after guided section-wise collection (faster than chat-per-message)."""
    ok, msg = user_service.check_can_send_ai(user.uid)
    if not ok:
        raise HTTPException(403, msg)
    result = _ai_handler(ai_service.polish_cv, req.content, req.tone)
    if result.success:
        user_service.increment_ai_usage(user.uid)
    return result.model_dump()


@app.post("/api/ai/regenerate-section")
def ai_regenerate_section(req: AIRegenerateSectionRequest) -> Dict[str, Any]:
    result = _ai_handler(
        ai_service.regenerate_section,
        req.section.value, req.content, req.tone, req.instructions,
    )
    return result.model_dump()


@app.post("/api/ai/enhance")
def ai_enhance(req: AIEnhanceRequest) -> Dict[str, Any]:
    result = _ai_handler(ai_service.enhance_text, req.text, req.context, req.tone)
    return result.model_dump()


@app.post("/api/ai/analyze")
def ai_analyze(req: AIAnalyzeRequest) -> Dict[str, Any]:
    result = _ai_handler(ai_service.analyze_cv, req.content, req.target_role)
    return result.model_dump()


@app.post("/api/ai/optimize-job")
def ai_optimize_job(req: AIOptimizeJobRequest) -> Dict[str, Any]:
    result = _ai_handler(
        ai_service.optimize_for_job,
        req.content, req.job_description, req.tone,
    )
    return result.model_dump()


@app.post("/api/ai/cover-letter")
def ai_cover_letter(req: AICoverLetterRequest, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    plan = user_service.get_user_plan(user.uid)
    if plan != "business":
        raise HTTPException(403, "Cover letter is available on the Business plan.")
    ok, msg = user_service.check_can_send_ai(user.uid)
    if not ok:
        raise HTTPException(403, msg)
    result = _ai_handler(
        ai_service.generate_cover_letter,
        req.content, req.job_title, req.company, req.job_description, req.tone,
    )
    if result.success:
        user_service.increment_ai_usage(user.uid)
    return result.model_dump()


@app.post("/api/ai/career-guidance")
def ai_career_guidance(req: AICareerGuidanceRequest) -> Dict[str, Any]:
    result = _ai_handler(
        ai_service.career_guidance,
        req.content, req.target_role, req.years_experience,
    )
    return result.model_dump()


@app.post("/api/ai/chat")
def ai_chat(req: AIChatRequest, user: AuthUser = Depends(require_user)) -> Dict[str, Any]:
    ok, msg = user_service.check_can_send_ai(user.uid)
    if not ok:
        raise HTTPException(403, msg)

    plan = user_service.get_user_plan(user.uid)
    history = [{"role": m.role, "content": m.content} for m in req.history]
    result = _ai_handler(
        ai_service.chat_cv,
        req.message, history, req.content, req.tone, req.template_id, req.theme_override,
    )
    if result.success:
        user_service.increment_ai_usage(user.uid)
        # Enforce plan template limits (Basic: no switch; Pro: 15 presets; Business: all)
        data = result.data or {}
        new_tid = data.get("template_id") or req.template_id
        if plan == "starter" or not templates.plan_allows_template(plan, new_tid):
            data["template_id"] = req.template_id
            data["theme_override"] = (
                req.theme_override.model_dump()
                if req.theme_override is not None and hasattr(req.theme_override, "model_dump")
                else req.theme_override
            )
            result.data = data
    return result.model_dump()


@app.post("/api/ai/linkedin")
def ai_linkedin(req: AILinkedInRequest) -> Dict[str, Any]:
    result = _ai_handler(ai_service.linkedin_content, req.content, req.tone)
    return result.model_dump()


@app.get("/api/billing/plans")
def billing_plans() -> Dict[str, Any]:
    return {
        "plans": billing.get_public_plans(),
        "stripe_configured": billing.stripe_configured(),
    }


@app.post("/api/billing/checkout")
def billing_checkout(
    req: CheckoutRequest,
    user: AuthUser = Depends(require_user),
) -> Dict[str, str]:
    try:
        return billing.create_checkout_session(
            req.plan_id,
            req.interval,
            customer_email=req.email or user.email,
            firebase_uid=user.uid,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Checkout failed") from exc


@app.post("/api/billing/webhook")
async def billing_webhook(request: Request) -> Dict[str, str]:
    """Stripe sends POST with Stripe-Signature. Browser GET/POST without signature returns 400."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature") or request.headers.get("Stripe-Signature") or ""
    try:
        billing.handle_stripe_webhook(payload, sig)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Webhook error: {exc}") from exc
    return {"status": "ok"}
