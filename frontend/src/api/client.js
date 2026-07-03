// Production: /cvbuilder/api via nginx. Dev: Vite proxy. Override with VITE_API_URL if needed.
const API_BASE = import.meta.env.VITE_API_URL
  || import.meta.env.BASE_URL.replace(/\/$/, "");

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return handleResponse(res);
}

export async function fetchTemplates() {
  const res = await fetch(`${API_BASE}/api/templates`);
  return handleResponse(res);
}

export async function fetchCVs() {
  const res = await fetch(`${API_BASE}/api/cvs`);
  return handleResponse(res);
}

export async function createCV(payload = {}) {
  const res = await fetch(`${API_BASE}/api/cvs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function getCV(id) {
  const res = await fetch(`${API_BASE}/api/cvs/${id}`);
  return handleResponse(res);
}

export async function updateCV(id, payload) {
  const res = await fetch(`${API_BASE}/api/cvs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function deleteCV(id) {
  const res = await fetch(`${API_BASE}/api/cvs/${id}`, { method: "DELETE" });
  return handleResponse(res);
}

export async function duplicateCV(id) {
  const res = await fetch(`${API_BASE}/api/cvs/${id}/duplicate`, { method: "POST" });
  return handleResponse(res);
}

export async function renameCV(id, name) {
  const res = await fetch(`${API_BASE}/api/cvs/${id}/rename`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function fetchVersions(id) {
  const res = await fetch(`${API_BASE}/api/cvs/${id}/versions`);
  return handleResponse(res);
}

export async function restoreVersion(cvId, versionId) {
  const res = await fetch(`${API_BASE}/api/cvs/${cvId}/versions/${versionId}/restore`, {
    method: "POST",
  });
  return handleResponse(res);
}

export function exportPdfUrl(id) {
  return `${API_BASE}/api/cvs/${id}/export/pdf`;
}

export function exportDocxUrl(id) {
  return `${API_BASE}/api/cvs/${id}/export/docx`;
}

export async function exportStyledDocx(cvId, html) {
  const res = await fetch(`${API_BASE}/api/cvs/${cvId}/export/styled-docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  const res = await fetch(`${API_BASE}/api/cvs/${cvId}/upload/cv`, {
    method: "POST",
    body: form,
  });
  return handleResponse(res);
}

export async function uploadProfilePhoto(cvId, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/cvs/${cvId}/upload/photo`, {
    method: "POST",
    body: form,
  });
  return handleResponse(res);
}

export async function aiChat(payload) {
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function aiGenerate(payload) {
  const res = await fetch(`${API_BASE}/api/ai/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function aiRegenerateSection(payload) {
  const res = await fetch(`${API_BASE}/api/ai/regenerate-section`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function aiEnhance(payload) {
  const res = await fetch(`${API_BASE}/api/ai/enhance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function aiAnalyze(payload) {
  const res = await fetch(`${API_BASE}/api/ai/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function aiOptimizeJob(payload) {
  const res = await fetch(`${API_BASE}/api/ai/optimize-job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function aiCoverLetter(payload) {
  const res = await fetch(`${API_BASE}/api/ai/cover-letter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function aiCareerGuidance(payload) {
  const res = await fetch(`${API_BASE}/api/ai/career-guidance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function aiLinkedIn(payload) {
  const res = await fetch(`${API_BASE}/api/ai/linkedin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function fetchBillingPlans() {
  const res = await fetch(`${API_BASE}/api/billing/plans`);
  return handleResponse(res);
}

export async function createCheckoutSession(planId, interval, email) {
  const res = await fetch(`${API_BASE}/api/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId, interval, email: email || undefined }),
  });
  return handleResponse(res);
}
