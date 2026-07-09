// Production: /cvbuilder/api via nginx. Dev: Vite proxy. Override with VITE_API_URL if needed.
import { getIdToken, isFirebaseConfigured } from "../lib/firebase";

const API_BASE = import.meta.env.VITE_API_URL
  || import.meta.env.BASE_URL.replace(/\/$/, "");

async function authHeaders() {
  if (!isFirebaseConfigured) return {};
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg || d).join(", ")
      : detail || data.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

async function apiFetch(path, options = {}, requireAuth = false) {
  const headers = { ...(options.headers || {}) };
  if (requireAuth) {
    const auth = await authHeaders();
    if (!auth.Authorization) {
      throw new Error("Authentication required. Please sign in.");
    }
    Object.assign(headers, auth);
  }
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return handleResponse(res);
}

export async function fetchHealth() {
  return apiFetch("/api/health");
}

export async function fetchTemplates() {
  return apiFetch("/api/templates");
}

export async function fetchCVs() {
  return apiFetch("/api/cvs", {}, true);
}

export async function createCV(payload = {}) {
  return apiFetch("/api/cvs", {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
}

export async function getCV(id) {
  return apiFetch(`/api/cvs/${id}`, {}, true);
}

export async function updateCV(id, payload) {
  return apiFetch(`/api/cvs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, true);
}

export async function deleteCV(id) {
  return apiFetch(`/api/cvs/${id}`, { method: "DELETE" }, true);
}

export async function duplicateCV(id) {
  return apiFetch(`/api/cvs/${id}/duplicate`, { method: "POST" }, true);
}

export async function renameCV(id, name) {
  return apiFetch(`/api/cvs/${id}/rename`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  }, true);
}

export async function fetchVersions(id) {
  return apiFetch(`/api/cvs/${id}/versions`, {}, true);
}

export async function restoreVersion(cvId, versionId) {
  return apiFetch(`/api/cvs/${cvId}/versions/${versionId}/restore`, {
    method: "POST",
  }, true);
}

export function exportPdfUrl(id) {
  return `${API_BASE}/api/cvs/${id}/export/pdf`;
}

export function exportDocxUrl(id) {
  return `${API_BASE}/api/cvs/${id}/export/docx`;
}

export async function exportStyledDocx(cvId, html) {
  const headers = await authHeaders();
  headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}/api/cvs/${cvId}/export/styled-docx`, {
    method: "POST",
    headers,
    body: JSON.stringify({ html }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `Export failed (${res.status})`);
  }
  return res.blob();
}

export async function uploadCvFile(cvId, file) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch(`/api/cvs/${cvId}/upload/cv`, {
    method: "POST",
    body: form,
  }, true);
}

export async function uploadProfilePhoto(cvId, file) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch(`/api/cvs/${cvId}/upload/photo`, {
    method: "POST",
    body: form,
  }, true);
}

export async function enableShare(cvId) {
  return apiFetch(`/api/cvs/${cvId}/share`, { method: "POST" }, true);
}

export async function disableShare(cvId) {
  return apiFetch(`/api/cvs/${cvId}/share`, { method: "DELETE" }, true);
}

export async function fetchPublicCv(token) {
  return apiFetch(`/api/public/cvs/${token}`);
}

export async function aiChat(payload) {
  return apiFetch("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
}

export async function aiSlotFill(payload) {
  return apiFetch("/api/ai/slot-fill", {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
}

export async function aiPolish(payload) {
  return apiFetch("/api/ai/polish", {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
}

export async function aiGenerate(payload) {
  return apiFetch("/api/ai/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function aiRegenerateSection(payload) {
  return apiFetch("/api/ai/regenerate-section", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function aiEnhance(payload) {
  return apiFetch("/api/ai/enhance", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function aiAnalyze(payload) {
  return apiFetch("/api/ai/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function aiOptimizeJob(payload) {
  return apiFetch("/api/ai/optimize-job", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function aiCoverLetter(payload) {
  return apiFetch("/api/ai/cover-letter", {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
}

export async function aiCareerGuidance(payload) {
  return apiFetch("/api/ai/career-guidance", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function aiLinkedIn(payload) {
  return apiFetch("/api/ai/linkedin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchBillingPlans() {
  return apiFetch("/api/billing/plans");
}

export async function fetchUserProfile() {
  return apiFetch("/api/user/me", {}, true);
}

export async function createCheckoutSession(planId, interval, email) {
  return apiFetch("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan_id: planId, interval, email: email || undefined }),
  }, true);
}

export async function submitContact(payload) {
  const headers = await authHeaders();
  return apiFetch("/api/contact", {
    method: "POST",
    body: JSON.stringify(payload),
    headers,
  });
}
