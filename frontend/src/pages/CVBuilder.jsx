import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import PlanStatusBanner from "../components/PlanStatusBanner";
import AILoadingBubble from "../components/AILoadingBubble";
import ChatQuickActions from "../components/ChatQuickActions";
import CVPreviewSkeleton from "../components/CVPreviewSkeleton";
import GuidedBuilder from "../components/GuidedBuilder";
import SectionManager from "../components/SectionManager";
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
  addSection,
  applyStarterProfile,
  removeSection,
  sectionLabel,
} from "../utils/cvSectionOps";
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
  aiPolish,
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
  const [buildMode, setBuildMode] = useState("guided"); // guided | chat
  const [generating, setGenerating] = useState(false);
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
      const hasChat = Array.isArray(saved) && saved.some((m) => m.role === "user");
      const hasContent = Boolean(
        cv?.content?.full_name || cv?.content?.summary || cv?.content?.experience?.length,
      );
      setBuildMode(hasChat || hasContent ? "chat" : "guided");
      setView("chat");
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  function cvLimitMessage() {
    if (isFreePlan(plan)) {
      return "Basic plan includes 1 CV. Upgrade to Pro for up to 10 CVs, or Business for unlimited CVs.";
    }
    if (plan === "pro") {
      return "Pro plan includes 10 CVs. Upgrade to Business for unlimited CVs.";
    }
    return "You have reached your CV limit for this plan.";
  }

  async function ensureCanAddCv(actionLabel = "create more CVs") {
    const maxCvs = profile?.max_cvs ?? 1;
    if (cvs.length < maxCvs) return true;
    const goUpgrade = await showUpgradePopup({
      title: `Upgrade to ${actionLabel}`,
      text: cvLimitMessage(),
      confirmText: "View plans",
    });
    if (goUpgrade) navigate("/builder/account");
    return false;
  }

  async function handleCreate() {
    if (!(await ensureCanAddCv("create more CVs"))) return;

    setLoading(true);
    try {
      const data = await createCV({ name: "New CV", template_id: "random" });
      await loadCVs();
      await refreshProfile();
      const cv = data.cv;
      setActiveCv(cv);
      setMessages([]);
      setBuildMode("guided");
      setView("chat");
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("Upgrade") || msg.includes("includes") || msg.includes("limit")) {
        const goUpgrade = await showUpgradePopup({
          title: "Upgrade to create more CVs",
          text: msg || cvLimitMessage(),
          confirmText: "View plans",
        });
        if (goUpgrade) navigate("/builder/account");
      } else {
        setToast(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate(cv) {
    if (!(await ensureCanAddCv("duplicate this CV"))) return;

    try {
      await duplicateCV(cv.id);
      await loadCVs();
      await refreshProfile();
      setToast("CV duplicated");
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("Upgrade") || msg.includes("includes") || msg.includes("limit")) {
        const goUpgrade = await showUpgradePopup({
          title: "Upgrade to duplicate this CV",
          text: msg || cvLimitMessage(),
          confirmText: "View plans",
        });
        if (goUpgrade) navigate("/builder/account");
      } else {
        setToast(msg || "Could not duplicate CV");
      }
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

  async function sendMessage(presetText) {
    const text = (typeof presetText === "string" ? presetText : input).trim();
    if (!text || loading || !activeCv) return;
    if (typeof presetText === "string") setInput("");

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

  function appendLocalAssistant(message) {
    if (!activeCv?.id || !message) return;
    setMessages((prev) => {
      const next = [...prev, { role: "assistant", content: message }];
      persistChat(activeCv.id, next);
      return next;
    });
  }

  function applyContentLocally(content, message, { userNote } = {}) {
    if (!activeCv) return;
    const name = content.full_name ? `${content.full_name} CV` : activeCv.name;
    const next = {
      ...activeCv,
      name,
      content,
      updated_at: new Date().toISOString(),
    };
    setActiveCv(next);
    saveCv(next);
    if (userNote) {
      setMessages((prev) => {
        const msgs = [
          ...prev,
          { role: "user", content: userNote },
          { role: "assistant", content: message },
        ];
        persistChat(activeCv.id, msgs);
        return msgs;
      });
    } else {
      appendLocalAssistant(message);
    }
    setToast(message);
  }

  function handleQuickPick(text, { send = false } = {}) {
    if (!text) return;
    if (send) {
      sendMessage(text);
      return;
    }
    setInput(text);
  }

  function handleChatAction(action) {
    if (!activeCv || loading || generating) return;
    const { type, section, starter, fillText } = action || {};

    if (type === "fill") {
      setInput(fillText || "");
      return;
    }

    if (type === "download") {
      triggerDownload("export_pdf", activeCv);
      return;
    }

    if (type === "add" && section) {
      const { content, message } = addSection(activeCv.content, section);
      applyContentLocally(content, message, { userNote: `Add ${sectionLabel(section)}` });
      return;
    }

    if (type === "remove" && section) {
      const { content, message } = removeSection(activeCv.content, section);
      applyContentLocally(content, message, { userNote: `Remove ${sectionLabel(section)}` });
      return;
    }

    if (type === "starter" && starter) {
      const { content, message } = applyStarterProfile(activeCv.content, starter);
      applyContentLocally(content, message, {
        userNote: starter === "developer" ? "I'm a developer" : "Fresh graduate",
      });
      return;
    }

    if (type === "polish") {
      handleGuidedGenerate(activeCv.content);
    }
  }

  function handleSectionToggle(sectionId, visible) {
    if (!activeCv) return;
    const visibility = {
      ...(activeCv.content?.section_visibility || {}),
      [sectionId]: visible,
    };
    const next = {
      ...activeCv,
      content: { ...activeCv.content, section_visibility: visibility },
      updated_at: new Date().toISOString(),
    };
    setActiveCv(next);
    saveCv(next);
    setToast(visible ? `${sectionLabel(sectionId)} shown` : `${sectionLabel(sectionId)} hidden`);
  }

  function handleSectionAdd(sectionId) {
    if (!activeCv) return;
    const { content, message } = addSection(activeCv.content, sectionId);
    applyContentLocally(content, message, { userNote: `Add ${sectionLabel(sectionId)}` });
  }

  function handleSectionRemove(sectionId) {
    if (!activeCv) return;
    const { content, message } = removeSection(activeCv.content, sectionId);
    applyContentLocally(content, message, { userNote: `Remove ${sectionLabel(sectionId)}` });
  }

  function handleGuidedLiveUpdate(content) {
    if (!activeCv) return;
    const name = content.full_name ? `${content.full_name} CV` : activeCv.name;
    const next = {
      ...activeCv,
      name,
      content,
      updated_at: new Date().toISOString(),
    };
    setActiveCv(next);
    saveCv(next);
  }

  async function handleGuidedGenerate(content) {
    if (!activeCv || generating) return;
    setGenerating(true);
    setToast("Polishing your CV with AI (one pass)…");
    try {
      const name = content.full_name ? `${content.full_name} CV` : activeCv.name;
      const draft = { ...activeCv, name, content, updated_at: new Date().toISOString() };
      setActiveCv(draft);
      await saveCv(draft);

      const result = await aiPolish({ content, tone: activeCv.tone || "professional" });
      if (!result.success) {
        throw new Error(result.message || "Could not generate CV");
      }
      const polished = result.data?.content || content;
      const updated = {
        ...draft,
        name: polished.full_name ? `${polished.full_name} CV` : draft.name,
        content: polished,
        updated_at: new Date().toISOString(),
      };
      setActiveCv(updated);
      await saveCv(updated);
      await loadCVs();
      await refreshProfile();

      const reply = result.data?.reply || result.message || "Your professional CV is ready.";
      const msgs = [
        { role: "assistant", content: reply, suggestions: result.suggestions },
      ];
      setMessages(msgs);
      await persistChat(activeCv.id, msgs);
      setBuildMode("chat");
      setToast("Professional CV ready");
    } catch (e) {
      const msg = e.message || "Generate failed";
      if (msg.includes("Upgrade") || msg.includes("limit")) {
        const goUpgrade = await showUpgradePopup({
          title: "Upgrade for more AI",
          text: msg,
          confirmText: "View plans",
        });
        if (goUpgrade) navigate("/builder/account");
      } else {
        setToast(msg);
      }
    } finally {
      setGenerating(false);
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

      <div className={`builder-shell builder-shell--animated ${view === "chat" ? "builder-shell--wide" : ""}`}>
        <PlanStatusBanner />
        <div className="builder-bg" aria-hidden="true">
          <div className="builder-bg-blob builder-bg-blob--1" />
          <div className="builder-bg-blob builder-bg-blob--2" />
        </div>

        {view === "list" && (
          <>
            <div className="account-hero builder-anim builder-anim--1">
              <div className="account-avatar builder-avatar-glow" aria-hidden="true">{userInitial}</div>
              <div className="account-hero-info">
                <h1>{user?.name ? `${user.name.split(" ")[0]}'s workspace` : "Your CVs"}</h1>
                <p>Build and export professional CVs with AI</p>
              </div>
              <span className={`plan-badge plan-badge--lg plan-badge--${plan}`}>{planLabel}</span>
            </div>

            <div className="account-stats">
              <div className="account-stat builder-anim builder-anim--2">
                <span className="account-stat-label">Your CVs</span>
                <strong>{cvs.length}</strong>
              </div>
              <div className="account-stat builder-anim builder-anim--3">
                <span className="account-stat-label">CV limit</span>
                <strong>{formatCvLimit(profile?.max_cvs, plan)}</strong>
              </div>
              <div className="account-stat account-stat--wide builder-anim builder-anim--4">
                <div className="account-stat-row">
                  <span className="account-stat-label">AI messages this month</span>
                  <strong>{aiUsed} / {aiLimit}</strong>
                </div>
                <div className="account-progress">
                  <div className="account-progress-fill" style={{ width: `${aiPct}%` }} />
                </div>
              </div>
            </div>

            <section className="account-card builder-anim builder-anim--5">
              <div className="account-card-head builder-card-head">
                <div>
                  <h2>Your CVs</h2>
                  <p>Create, edit, and export professional CVs with AI assistance.</p>
                </div>
                <button type="button" className="btn btn-primary builder-btn-glow" onClick={handleCreate}>
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
                  <button type="button" className="btn btn-primary builder-btn-glow" onClick={handleCreate}>
                    Start building with AI
                  </button>
                </div>
              ) : (
                <div className="builder-cv-grid">
                  {cvs.map((cv, index) => (
                    <article
                      key={cv.id}
                      className={`builder-cv-card builder-cv-card--enter ${deletingId === cv.id ? "builder-cv-card--deleting" : ""}`}
                      style={{ "--card-i": index }}
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
                          onClick={() => handleDuplicate(cv)}
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
            <section className="account-card builder-chat-panel builder-anim builder-anim--slide-left">
              {buildMode === "guided" ? (
                <GuidedBuilder
                  initialContent={activeCv.content}
                  tone={activeCv.tone}
                  generating={generating}
                  onLiveUpdate={handleGuidedLiveUpdate}
                  onGenerate={handleGuidedGenerate}
                  onSwitchToChat={() => setBuildMode("chat")}
                />
              ) : (
                <>
              <div className="account-card-head builder-chat-head">
                <div>
                  <h2>{activeCv.name}</h2>
                  <p>Chat naturally — or tap a button below. Your CV updates live.</p>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => setBuildMode("guided")}>
                  Guided build
                </button>
              </div>
              <div className="chat-messages">
                {messages.length === 0 && !loading && (
                  <div className="chat-empty-hint builder-anim builder-anim--2">
                    <strong>Build your CV in minutes</strong>
                    <p>Tap a quick start button, or type something simple like:</p>
                    <em>&quot;My name is Ali, I am a software engineer with 3 years experience.&quot;</em>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`chat-bubble chat-bubble--${msg.role} chat-bubble--enter`}
                  >
                    <span className="chat-role">{msg.role === "user" ? "You" : "AI"}</span>
                    <p>{msg.content}</p>
                    {msg.suggestions?.length > 0 && (
                      <div className="chat-suggestions-wrap">
                        <p className="chat-suggestions-title">Tap a suggestion to continue</p>
                        <div className="chat-suggestion-chips">
                          {msg.suggestions.map((s, j) => (
                            <button
                              key={j}
                              type="button"
                              className="chat-quick-chip"
                              disabled={loading}
                              onClick={() => handleQuickPick(s, { send: true })}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && <AILoadingBubble />}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-area">
                <ChatQuickActions
                  content={activeCv.content}
                  messagesEmpty={messages.length === 0}
                  disabled={loading || exporting || generating}
                  onAction={handleChatAction}
                />
                <UploadBar
                  disabled={loading || exporting}
                  onCvUpload={handleCvUpload}
                  onPhotoUpload={handlePhotoUpload}
                />
                <div className="chat-input-row">
                  <textarea
                    className="chat-input"
                    rows={2}
                    placeholder="Type anything… e.g. My name is Sara, add education, remove certificates"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={`btn btn-primary chat-send builder-btn-glow ${loading ? "is-loading" : ""}`}
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
                </>
              )}
            </section>

            <aside className={`account-card builder-preview-panel builder-anim builder-anim--slide-right ${loading || generating ? "preview-panel--loading" : ""}`}>
              <div className="preview-toolbar">
                <h3>Live CV Preview</h3>
                <span className={`preview-status ${loading || generating ? "preview-status--active" : ""}`}>
                  {loading || generating ? (
                    <>
                      <span className="preview-pulse-dot" aria-hidden="true" />
                      {generating ? "Polishing…" : "Updating…"}
                    </>
                  ) : (
                    buildMode === "guided" ? "Fills as you complete steps" : "Updates as you chat"
                  )}
                </span>
              </div>
              {buildMode === "chat" && (
                <SectionManager
                  content={activeCv.content}
                  disabled={loading || exporting || generating}
                  onToggle={handleSectionToggle}
                  onAdd={handleSectionAdd}
                  onRemove={handleSectionRemove}
                />
              )}
              {loading || generating ? (
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
