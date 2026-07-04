import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import AILoadingBubble from "../components/AILoadingBubble";
import CVPreviewSkeleton from "../components/CVPreviewSkeleton";
import TemplatePicker from "../components/TemplatePicker";
import TemplateRenderer from "../components/templates/CVTemplates";
import UploadBar from "../components/UploadBar";
import { useAuth } from "../context/AuthContext";
import {
  canUseTemplates,
  formatCvLimit,
  isFreePlan,
  templatesForPlan,
} from "../config/pricing";
import {
  loadChatHistory,
  saveChatHistory,
} from "../services/chatHistory";
import { exportCvPreview } from "../utils/exportCv";
import {
  closeDialog,
  confirmDeleteCv,
  showDeleteError,
  showDeleteProgress,
  showDeleteSuccess,
  showUpgradePopup,
} from "../utils/confirmDialog";
import {
  aiChat,
  createCV,
  deleteCV,
  duplicateCV,
  fetchCVs,
  fetchTemplates,
  getCV,
  updateCV,
  uploadCvFile,
  uploadProfilePhoto,
} from "../api/client";

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "modern", label: "Modern" },
  { id: "executive", label: "Executive" },
  { id: "fresh_graduate", label: "Fresh Graduate" },
];

function applyChatCvUpdates(cv, data) {
  if (!data) return cv;
  const next = { ...cv };
  if (data.content) {
    next.content = data.content;
    if (data.content.full_name) next.name = `${data.content.full_name} CV`;
  }
  if (data.template_id) next.template_id = data.template_id;
  if (Object.prototype.hasOwnProperty.call(data, "theme_override")) {
    next.theme_override = data.theme_override;
  }
  return next;
}

function detectExportIntent(text) {
  const t = (text || "").toLowerCase();
  if (/download.*pdf|export.*pdf|pdf.*download/.test(t)) return "export_pdf";
  if (/download.*docx|download.*word|export.*docx|export.*word/.test(t)) return "export_docx";
  return null;
}

export default function CVBuilder() {
  const { user, plan, planLabel, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("list");
  const [cvs, setCvs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeCv, setActiveCv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const chatEndRef = useRef(null);
  const previewRef = useRef(null);

  const activeTemplate = templates.find((t) => t.id === activeCv?.template_id) || templates[0];

  useEffect(() => {
    fetchTemplates().then((d) => setTemplates(d.templates || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setCvs([]);
      setActiveCv(null);
      setMessages([]);
      setView("list");
      return;
    }
    loadCVs();
    refreshProfile();
  }, [user?.uid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function persistChat(cvId, msgs) {
    if (user?.uid && cvId) await saveChatHistory(user.uid, cvId, msgs);
  }

  async function handleDeleteCv(cv) {
    const confirmed = await confirmDeleteCv(cv.name);
    if (!confirmed) return;

    setDeletingId(cv.id);
    showDeleteProgress();
    try {
      await deleteCV(cv.id);
      if (activeCv?.id === cv.id) {
        setActiveCv(null);
        setMessages([]);
        setView("list");
      }
      setCvs((prev) => prev.filter((c) => c.id !== cv.id));
      closeDialog();
      await showDeleteSuccess();
    } catch (e) {
      closeDialog();
      await showDeleteError(e.message);
      await loadCVs();
    } finally {
      setDeletingId(null);
    }
  }

  async function loadCVs() {
    try {
      const data = await fetchCVs();
      setCvs(data.cvs || []);
    } catch {
      setCvs([]);
    }
  }

  async function saveCv(cv) {
    if (!cv?.id) return;
    try {
      await updateCV(cv.id, {
        name: cv.name,
        template_id: cv.template_id,
        tone: cv.tone,
        content: cv.content,
        theme_override: cv.theme_override ?? null,
      });
    } catch {
      /* auto-save silent */
    }
  }

  async function triggerDownload(type, cv) {
    if (!cv) return;
    if (loading) {
      setToast("Please wait — CV preview is still updating.");
      return;
    }
    const el = previewRef.current;
    if (!el) {
      setToast("CV preview is not ready yet.");
      return;
    }
    const name = cv.content?.full_name || cv.name || "CV";
    setExporting(true);
    setToast(type === "export_pdf" ? "Generating styled PDF…" : "Generating styled Word file…");
    try {
      await exportCvPreview(el, type, name, cv.id);
      setToast(type === "export_pdf" ? "PDF downloaded (with your template)" : "Word file downloaded (with your template)");
    } catch (e) {
      setToast(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function openCV(id) {
    setLoading(true);
    try {
      const data = await getCV(id);
      const cv = data.cv;
      setActiveCv(cv);
      const saved = user?.uid ? await loadChatHistory(user.uid, id) : null;
      setMessages(saved ?? []);
      setView("chat");
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    const maxCvs = profile?.max_cvs ?? 1;
    if (cvs.length >= maxCvs) {
      const goUpgrade = await showUpgradePopup({
        title: "Upgrade to create more CVs",
        text: isFreePlan(plan)
          ? "Basic plan includes 1 CV. Upgrade to Pro for up to 10 CVs, or Business for unlimited CVs."
          : plan === "pro"
            ? "Pro plan includes 10 CVs. Upgrade to Business for unlimited CVs."
            : "You have reached your CV limit for this plan.",
        confirmText: "View plans",
      });
      if (goUpgrade) navigate("/builder/account");
      return;
    }

    setLoading(true);
    try {
      const data = await createCV({ name: "New CV", template_id: "random" });
      await loadCVs();
      await refreshProfile();
      const cv = data.cv;
      setActiveCv(cv);
      setMessages([]);
      setView("chat");
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCvUpload(file) {
    if (!activeCv || loading) return;
    setLoading(true);
    setToast("Processing your CV file…");
    try {
      const result = await uploadCvFile(activeCv.id, file);
      const updated = result.cv;
      setActiveCv(updated);
      await saveCv(updated);
      await loadCVs();
      setMessages((prev) => {
        const next = [
          ...prev,
          { role: "user", content: `[Uploaded CV: ${file.name}]` },
          { role: "assistant", content: result.reply || result.message || "CV imported." },
        ];
        persistChat(activeCv.id, next);
        return next;
      });
      setToast("CV imported from file");
    } catch (e) {
      setToast(e.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Could not process CV file: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUpload(file) {
    if (!activeCv || loading) return;
    setLoading(true);
    setToast("Uploading photo…");
    try {
      const result = await uploadProfilePhoto(activeCv.id, file);
      const updated = { ...result.cv, updated_at: new Date().toISOString() };
      if (!updated.content?.profile_photo) {
        updated.content = { ...updated.content, profile_photo: `/api/cvs/${activeCv.id}/photo` };
      }
      setActiveCv(updated);
      await saveCv(updated);
      setMessages((prev) => {
        const next = [
          ...prev,
          { role: "user", content: "[Uploaded profile photo]" },
          { role: "assistant", content: result.reply || "Profile photo added to your CV." },
        ];
        persistChat(activeCv.id, next);
        return next;
      });
      setToast("Profile photo updated");
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !activeCv) return;

    const userMsg = { role: "user", content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    const localExport = detectExportIntent(text);
    let cvForExport = null;
    let exportAction = null;

    try {
      const cvForChat = activeCv;

      const result = await aiChat({
        message: text,
        history: messages.filter((m) => m.role === "user" || m.role === "assistant"),
        content: cvForChat.content,
        tone: cvForChat.tone,
        template_id: cvForChat.template_id,
        theme_override: cvForChat.theme_override || null,
      });

      const action = result.data?.action || localExport;

      const updated = applyChatCvUpdates(cvForChat, result.data);
      setActiveCv(updated);
      cvForExport = updated;
      await saveCv(updated);
      if (result.data?.content) await loadCVs();

      const reply = result.data?.reply || result.message || "Done.";
      const suggestions = result.suggestions || result.data?.missing_sections || [];
      setMessages((prev) => {
        const next = [
          ...prev,
          { role: "assistant", content: reply, suggestions: suggestions.length ? suggestions : undefined },
        ];
        persistChat(activeCv.id, next);
        return next;
      });
      await refreshProfile();

      if (action === "export_pdf" || action === "export_docx") {
        exportAction = action;
      }
    } catch (e) {
      const errMsg = e.message || "Something went wrong";
      setMessages((prev) => {
        const next = [...prev, { role: "assistant", content: `Sorry: ${errMsg}` }];
        if (activeCv?.id) persistChat(activeCv.id, next);
        return next;
      });
      if (errMsg.includes("Upgrade") || errMsg.includes("limit")) {
        setToast(`${errMsg} — visit Account to upgrade.`);
      }
    } finally {
      setLoading(false);
    }

    if (exportAction && cvForExport) {
      setTimeout(() => triggerDownload(exportAction, cvForExport), 350);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function selectTemplate(templateId) {
    if (!activeCv) return;
    if (!canUseTemplates(plan)) {
      const goUpgrade = await showUpgradePopup({
        title: "Templates are a Pro feature",
        text: "Basic plan uses a default template. Upgrade to Pro for 15 templates, or Business for all templates.",
        confirmText: "View plans",
      });
      if (goUpgrade) navigate("/builder/account");
      return;
    }
    const allowed = templatesForPlan(templates, plan);
    if (!allowed.some((t) => t.id === templateId)) {
      const goUpgrade = await showUpgradePopup({
        title: "Upgrade for more templates",
        text: "This template is available on Business. Upgrade to unlock every design.",
        confirmText: "View plans",
      });
      if (goUpgrade) navigate("/builder/account");
      return;
    }
    const next = { ...activeCv, template_id: templateId, theme_override: null };
    setActiveCv(next);
    saveCv(next);
    setToast(`Template: ${templates.find((t) => t.id === templateId)?.name || templateId}`);
  }

  const aiUsed = profile?.ai_messages_used ?? 0;
  const aiLimit = profile?.ai_messages_limit ?? 50;
  const aiPct = Math.min(100, Math.round((aiUsed / Math.max(aiLimit, 1)) * 100));
  const userInitial = (user?.name || "U").charAt(0).toUpperCase();
  const planTemplates = useMemo(() => templatesForPlan(templates, plan), [templates, plan]);
  const showTemplatePicker = canUseTemplates(plan);

  const headerActions = view === "chat" ? (
    <>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setView("list")}>
        ← My CVs
      </button>
      {activeCv && (
        <>
          {showTemplatePicker && (
            <button type="button" className="btn btn-sm" onClick={() => setShowTemplates(true)}>
              Templates
            </button>
          )}
          <select
            className="builder-select"
            value={activeCv.tone}
            onChange={(e) => {
              const next = { ...activeCv, tone: e.target.value };
              setActiveCv(next);
              saveCv(next);
            }}
          >
            {TONES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-sm"
            disabled={loading || exporting}
            onClick={() => triggerDownload("export_pdf", activeCv)}
          >
            PDF
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={loading || exporting}
            onClick={() => triggerDownload("export_docx", activeCv)}
          >
            DOCX
          </button>
        </>
      )}
    </>
  ) : null;

  return (
    <AppLayout headerActions={headerActions} mainClassName="site-main--app">
      {toast && (
        <div className="account-alert account-alert--success builder-toast" role="status" onClick={() => setToast("")}>
          <span>✓</span> {toast}
        </div>
      )}

      <div className={`builder-shell ${view === "chat" ? "builder-shell--wide" : ""}`}>
        {view === "list" && (
          <>
            <div className="account-hero">
              <div className="account-avatar" aria-hidden="true">{userInitial}</div>
              <div className="account-hero-info">
                <h1>{user?.name ? `${user.name.split(" ")[0]}'s workspace` : "Your CVs"}</h1>
                <p>Build and export professional CVs with AI</p>
              </div>
              <span className={`plan-badge plan-badge--lg plan-badge--${plan}`}>{planLabel}</span>
            </div>

            <div className="account-stats">
              <div className="account-stat">
                <span className="account-stat-label">Your CVs</span>
                <strong>{cvs.length}</strong>
              </div>
              <div className="account-stat">
                <span className="account-stat-label">CV limit</span>
                <strong>{formatCvLimit(profile?.max_cvs, plan)}</strong>
              </div>
              <div className="account-stat account-stat--wide">
                <div className="account-stat-row">
                  <span className="account-stat-label">AI messages this month</span>
                  <strong>{aiUsed} / {aiLimit}</strong>
                </div>
                <div className="account-progress">
                  <div className="account-progress-fill" style={{ width: `${aiPct}%` }} />
                </div>
              </div>
            </div>

            <section className="account-card">
              <div className="account-card-head builder-card-head">
                <div>
                  <h2>Your CVs</h2>
                  <p>Create, edit, and export professional CVs with AI assistance.</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={handleCreate}>
                  + New CV
                </button>
              </div>

              {isFreePlan(plan) && (
                <p className="builder-plan-hint">
                  Basic plan: {profile?.max_cvs ?? 1} CV · {aiUsed}/{aiLimit} AI messages · default template.
                  {" "}<Link to="/builder/account">Upgrade to Pro</Link>
                </p>
              )}

              {cvs.length === 0 ? (
                <div className="builder-empty">
                  <div className="builder-empty-icon" aria-hidden="true">✨</div>
                  <h3>Start your first CV</h3>
                  <p>Chat with AI — it builds your CV as you type. No forms required.</p>
                  <button type="button" className="btn btn-primary" onClick={handleCreate}>
                    Start building with AI
                  </button>
                </div>
              ) : (
                <div className="builder-cv-grid">
                  {cvs.map((cv) => (
                    <article
                      key={cv.id}
                      className={`builder-cv-card ${deletingId === cv.id ? "builder-cv-card--deleting" : ""}`}
                    >
                      <div className="builder-cv-card-top">
                        <h3>{cv.name}</h3>
                        <span className="builder-cv-card-tone">{cv.tone?.replace("_", " ") || "professional"}</span>
                      </div>
                      <p className="muted">{cv.job_title || "No title yet"}</p>
                      <p className="builder-cv-date">Updated {new Date(cv.updated_at).toLocaleDateString()}</p>
                      <div className="builder-cv-card-actions">
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => openCV(cv.id)}>
                          Open chat
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={async () => { await duplicateCV(cv.id); loadCVs(); }}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          disabled={deletingId === cv.id}
                          onClick={() => handleDeleteCv(cv)}
                        >
                          {deletingId === cv.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {view === "chat" && activeCv && (
          <div className="builder-chat-layout">
            <section className="account-card builder-chat-panel">
              <div className="account-card-head builder-chat-head">
                <div>
                  <h2>{activeCv.name}</h2>
                  <p>Describe your experience — AI updates your CV in real time.</p>
                </div>
              </div>
              <div className="chat-messages">
                {messages.length === 0 && !loading && (
                  <p className="chat-empty-hint">Type a message to start — e.g. your name, job title, or &quot;hi&quot;.</p>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
                    <span className="chat-role">{msg.role === "user" ? "You" : "AI"}</span>
                    <p>{msg.content}</p>
                    {msg.suggestions?.length > 0 && (
                      <div className="chat-suggestions-wrap">
                        <p className="chat-suggestions-title">Suggestions (add real info — AI won&apos;t invent data)</p>
                        <ul className="chat-suggestions">
                          {msg.suggestions.map((s, j) => <li key={j}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
                {loading && <AILoadingBubble />}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-area">
                <UploadBar
                  disabled={loading || exporting}
                  onCvUpload={handleCvUpload}
                  onPhotoUpload={handlePhotoUpload}
                />
                <div className="chat-input-row">
                  <textarea
                    className="chat-input"
                    rows={3}
                    placeholder="Type here... e.g. I'm Ali Khan, software engineer with 5 years Python experience. Or: improve summary, download PDF"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={`btn btn-primary chat-send ${loading ? "is-loading" : ""}`}
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="btn-spinner" aria-hidden="true" />
                        <span>Wait</span>
                      </>
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </div>
            </section>

            <aside className={`account-card builder-preview-panel ${loading ? "preview-panel--loading" : ""}`}>
              <div className="preview-toolbar">
                <h3>Live CV Preview</h3>
                <span className={`preview-status ${loading ? "preview-status--active" : ""}`}>
                  {loading ? (
                    <>
                      <span className="preview-pulse-dot" aria-hidden="true" />
                      Updating…
                    </>
                  ) : (
                    "Updates as you chat"
                  )}
                </span>
              </div>
              {loading ? (
                <CVPreviewSkeleton />
              ) : (
                <TemplateRenderer ref={previewRef} cv={activeCv} template={activeTemplate} />
              )}
            </aside>
          </div>
        )}
      </div>

      {showTemplates && activeCv && showTemplatePicker && (
        <TemplatePicker
          templates={planTemplates}
          activeId={activeCv?.template_id}
          onSelect={selectTemplate}
          onClose={() => setShowTemplates(false)}
          plan={plan}
        />
      )}
    </AppLayout>
  );
}
