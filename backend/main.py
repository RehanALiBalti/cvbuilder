"""CV Builder FastAPI application."""

from __future__ import annotations

import os
import traceback
from typing import Any, Dict

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response

from backend import ai_service, billing, export, storage, templates, upload_service
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

app = FastAPI(
    title="AI CV Builder API",
    description="AI-powered professional CV builder using Ollama Qwen",
    version="1.0.0",
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


@app.on_event("startup")
def startup_check() -> None:
    storage.check_storage()


@app.get("/api/health")
def health() -> Dict[str, Any]:
    ollama = ai_service.check_ollama()
    disk = storage.check_storage()
    status = "ok" if disk.get("ok") else "degraded"
    return {
        "status": status,
        "service": "cvbuilder-api",
        "llm": "ollama",
        "ollama_model": ai_service.get_model_name(),
        "ollama": ollama,
        "storage": disk,
    }


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

@app.get("/api/templates")
def get_templates() -> Dict[str, Any]:
    return {"templates": templates.list_templates()}


# ---------------------------------------------------------------------------
# CV CRUD
# ---------------------------------------------------------------------------

@app.get("/api/cvs")
def list_cvs() -> Dict[str, Any]:
    return {"cvs": [c.model_dump() for c in storage.list_cvs()]}


@app.post("/api/cvs")
def create_cv(req: CreateCVRequest) -> Dict[str, Any]:
    tid = req.template_id
    if not tid or tid == "random":
        tid = templates.random_template_id()
    doc = CVDocument(
        name=req.name,
        template_id=tid,
        tone=req.tone,
        content=req.content or CVDocument().content,
    )
    saved = storage.create_cv(doc)
    t = templates.get_template(saved.template_id)
    return {
        "success": True,
        "cv": saved.model_dump(),
        "template_name": t["name"],
    }


@app.get("/api/cvs/{cv_id}")
def get_cv(cv_id: str) -> Dict[str, Any]:
    doc = storage.get_cv(cv_id)
    if not doc:
        raise HTTPException(404, "CV not found")
    return {"cv": doc.model_dump()}


@app.put("/api/cvs/{cv_id}")
def update_cv(cv_id: str, req: UpdateCVRequest) -> Dict[str, Any]:
    existing = storage.get_cv(cv_id)
    if not existing:
        raise HTTPException(404, "CV not found")

    updated = existing.model_copy(deep=True)
    if req.name is not None:
        updated.name = req.name
    if req.template_id is not None:
        updated.template_id = req.template_id
    if req.tone is not None:
        updated.tone = req.tone
    if req.content is not None:
        updated.content = req.content
    if req.theme_override is not None:
        updated.theme_override = req.theme_override

    saved = storage.update_cv(
        cv_id, updated,
        save_version=req.save_version,
        version_label=req.version_label,
    )
    return {"success": True, "cv": saved.model_dump()}


@app.delete("/api/cvs/{cv_id}")
def delete_cv(cv_id: str) -> Dict[str, Any]:
    if not storage.delete_cv(cv_id):
        raise HTTPException(404, "CV not found")
    return {"success": True}


@app.post("/api/cvs/{cv_id}/duplicate")
def duplicate_cv(cv_id: str) -> Dict[str, Any]:
    copy = storage.duplicate_cv(cv_id)
    if not copy:
        raise HTTPException(404, "CV not found")
    return {"success": True, "cv": copy.model_dump()}


@app.patch("/api/cvs/{cv_id}/rename")
def rename_cv(cv_id: str, req: RenameCVRequest) -> Dict[str, Any]:
    doc = storage.rename_cv(cv_id, req.name)
    if not doc:
        raise HTTPException(404, "CV not found")
    return {"success": True, "cv": doc.model_dump()}


@app.get("/api/cvs/{cv_id}/versions")
def list_versions(cv_id: str) -> Dict[str, Any]:
    if not storage.get_cv(cv_id):
        raise HTTPException(404, "CV not found")
    versions = storage.list_versions(cv_id)
    return {
        "versions": [
            {"id": v.id, "label": v.label, "created_at": v.created_at}
            for v in versions
        ]
    }


@app.post("/api/cvs/{cv_id}/versions/{version_id}/restore")
def restore_version(cv_id: str, version_id: str) -> Dict[str, Any]:
    doc = storage.restore_version(cv_id, version_id)
    if not doc:
        raise HTTPException(404, "CV or version not found")
    return {"success": True, "cv": doc.model_dump()}


@app.get("/api/cvs/{cv_id}/photo")
def get_cv_photo(cv_id: str) -> FileResponse:
    if not storage.get_cv(cv_id):
        raise HTTPException(404, "CV not found")
    path = upload_service.get_photo_path(cv_id)
    if not path:
        raise HTTPException(404, "No profile photo")
    media = "image/jpeg"
    if path.lower().endswith(".png"):
        media = "image/png"
    elif path.lower().endswith(".webp"):
        media = "image/webp"
    return FileResponse(path, media_type=media)


@app.post("/api/cvs/{cv_id}/upload/cv")
async def upload_cv_file(cv_id: str, file: UploadFile = File(...)) -> Dict[str, Any]:
    doc = storage.get_cv(cv_id)
    if not doc:
        raise HTTPException(404, "CV not found")
    data = await file.read()
    try:
        updated, message = upload_service.process_cv_file(doc, file.filename or "resume.pdf", data, doc.tone)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(400, str(exc)) from exc
    updated.content.profile_photo = doc.content.profile_photo or updated.content.profile_photo
    saved = storage.update_cv(cv_id, updated)
    return {
        "success": True,
        "message": message,
        "cv": saved.model_dump(),
        "reply": message,
    }


@app.post("/api/cvs/{cv_id}/upload/photo")
async def upload_profile_photo(cv_id: str, file: UploadFile = File(...)) -> Dict[str, Any]:
    doc = storage.get_cv(cv_id)
    if not doc:
        raise HTTPException(404, "CV not found")
    data = await file.read()
    try:
        photo_path = upload_service.save_profile_photo(cv_id, file.filename or "photo.jpg", data)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    updated = doc.model_copy(deep=True)
    updated.content.profile_photo = photo_path
    saved = storage.update_cv(cv_id, updated)
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
def export_pdf(cv_id: str) -> Response:
    doc = storage.get_cv(cv_id)
    if not doc:
        raise HTTPException(404, "CV not found")
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
def export_docx(cv_id: str) -> Response:
    doc = storage.get_cv(cv_id)
    if not doc:
        raise HTTPException(404, "CV not found")
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
def export_styled_docx(cv_id: str, body: StyledExportRequest) -> Response:
    """Export CV as Word using the same HTML/CSS as the live template preview."""
    doc = storage.get_cv(cv_id)
    if not doc:
        raise HTTPException(404, "CV not found")
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
def ai_cover_letter(req: AICoverLetterRequest) -> Dict[str, Any]:
    result = _ai_handler(
        ai_service.generate_cover_letter,
        req.content, req.job_title, req.company, req.job_description, req.tone,
    )
    return result.model_dump()


@app.post("/api/ai/career-guidance")
def ai_career_guidance(req: AICareerGuidanceRequest) -> Dict[str, Any]:
    result = _ai_handler(
        ai_service.career_guidance,
        req.content, req.target_role, req.years_experience,
    )
    return result.model_dump()


@app.post("/api/ai/chat")
def ai_chat(req: AIChatRequest) -> Dict[str, Any]:
    history = [{"role": m.role, "content": m.content} for m in req.history]
    result = _ai_handler(
        ai_service.chat_cv,
        req.message, history, req.content, req.tone, req.template_id, req.theme_override,
    )
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
def billing_checkout(req: CheckoutRequest) -> Dict[str, str]:
    try:
        return billing.create_checkout_session(
            req.plan_id,
            req.interval,
            customer_email=req.email,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Checkout failed") from exc
