import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AILoadingBubble from "../components/AILoadingBubble";
import CVPreviewSkeleton from "../components/CVPreviewSkeleton";
import TemplatePicker from "../components/TemplatePicker";
import TemplateRenderer from "../components/templates/CVTemplates";
import UploadBar from "../components/UploadBar";
import { useAuth } from "../context/AuthContext";
import {
  defaultChatMessages,
  loadChatHistory,
  saveChatHistory,
  WELCOME_MESSAGE,
} from "../services/chatHistory";
import { exportCvPreview } from "../utils/exportCv";
import {
  aiChat,
  createCV,
  deleteCV,
  duplicateCV,
  fetchCVs,
  fetchHealth,
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

const WELCOME = WELCOME_MESSAGE;

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
  const { user, logout, plan, planLabel, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("list");
  const [cvs, setCvs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeCv, setActiveCv] = useState(null);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [exporting, setExporting] = useState(false);
  const chatEndRef = useRef(null);
  const previewRef = useRef(null);

  const activeTemplate = templates.find((t) => t.id === activeCv?.template_id) || templates[0];

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setHealth({ status: "offline" }));
    fetchTemplates().then((d) => setTemplates(d.templates || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setCvs([]);
      setActiveCv(null);
      setMessages([WELCOME]);
      setView("list");
      return;
    }
    loadCVs();
    refreshProfile();
  }, [user?.uid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  async function persistChat(cvId, msgs) {
    if (user?.uid && cvId) await saveChatHistory(user.uid, cvId, msgs);
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
      setMessages(saved || defaultChatMessages(cv.name));
      setView("chat");
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const data = await createCV({ name: "New CV", template_id: "random" });
      await loadCVs();
      await refreshProfile();
      const cv = data.cv;
      const tname = data.template_name || templates.find((t) => t.id === cv.template_id)?.name || cv.template_id;
      const msgs = defaultChatMessages(cv.name, tname);
      setActiveCv(cv);
      setMessages(msgs);
      await persistChat(cv.id, msgs);
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

  function selectTemplate(templateId) {
    if (!activeCv) return;
    const next = { ...activeCv, template_id: templateId, theme_override: null };
    setActiveCv(next);
    saveCv(next);
    setToast(`Template: ${templates.find((t) => t.id === templateId)?.name || templateId}`);
  }

  return (
    <div className="cv-app">
      <header className="cv-header-bar">
        <div className="brand">
          <div className="brand-mark">CV</div>
          <div>
            <h1>ResumeAI Builder</h1>
            <p className="muted">
              {user?.name ? `Hi, ${user.name.split(" ")[0]} · ` : ""}
              <span className={`plan-badge plan-badge--${plan}`} style={{ marginRight: 6 }}>{planLabel}</span>
              Ollama {health?.ollama_model || "qwen2.5:7b"}
            </p>
          </div>
        </div>
        <div className="header-actions">
          {view === "chat" && activeCv && (
            <>
              <button type="button" className="btn btn-sm" onClick={() => setShowTemplates(true)}>
                Templates
              </button>
              <select
                className="header-select"
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
          {view !== "list" && (
            <button type="button" className="btn btn-ghost" onClick={() => setView("list")}>
              ← My CVs
            </button>
          )}
          <Link to="/builder/account" className="btn btn-ghost btn-sm">Account</Link>
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            + New CV
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      {toast && <div className="toast" onClick={() => setToast("")}>{toast}</div>}

      {view === "list" && (
        <section className="panel">
          <h2>Your CVs</h2>
          {plan === "starter" && (
            <p className="muted" style={{ marginBottom: 12 }}>
              Free plan: {profile?.max_cvs ?? 1} CV · {profile?.ai_messages_used ?? 0}/{profile?.ai_messages_limit ?? 50} AI messages this month.
              {" "}<Link to="/builder/account">Upgrade to Pro</Link>
            </p>
          )}
          {cvs.length === 0 ? (
            <div className="empty-state">
              <p>Start a conversation — AI will build your CV as you type.</p>
              <button type="button" className="btn btn-primary" onClick={handleCreate}>
                Start building with AI
              </button>
            </div>
          ) : (
            <div className="cv-grid">
              {cvs.map((cv) => (
                <article key={cv.id} className="cv-card">
                  <h3>{cv.name}</h3>
                  <p className="muted">{cv.job_title || "No title yet"}</p>
                  <p className="cv-date">Updated {new Date(cv.updated_at).toLocaleDateString()}</p>
                  <div className="cv-card-actions">
                    <button type="button" className="btn btn-sm" onClick={() => openCV(cv.id)}>Open chat</button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={async () => { await duplicateCV(cv.id); loadCVs(); }}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={async () => {
                        if (confirm("Delete this CV?")) {
                          await deleteCV(cv.id);
                          loadCVs();
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {view === "chat" && activeCv && (
        <div className="chat-layout">
          <section className="chat-panel">
            <div className="chat-messages">
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

          <aside className={`preview-panel ${loading ? "preview-panel--loading" : ""}`}>
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

      {showTemplates && activeCv && (
        <TemplatePicker
          templates={templates}
          activeId={activeCv?.template_id}
          onSelect={selectTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
