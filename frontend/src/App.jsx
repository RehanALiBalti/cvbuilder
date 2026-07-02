import { useEffect, useRef, useState } from "react";
import AILoadingBubble from "./components/AILoadingBubble";
import CVPreviewSkeleton from "./components/CVPreviewSkeleton";
import TemplatePicker from "./components/TemplatePicker";
import TemplateRenderer from "./components/templates/CVTemplates";
import {
  aiChat,
  createCV,
  deleteCV,
  duplicateCV,
  exportDocxUrl,
  exportPdfUrl,
  fetchCVs,
  fetchHealth,
  fetchTemplates,
  getCV,
  updateCV,
} from "./api/client";

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "modern", label: "Modern" },
  { id: "executive", label: "Executive" },
  { id: "fresh_graduate", label: "Fresh Graduate" },
];

const WELCOME = {
  role: "assistant",
  content:
    "Hi! Start typing — your name, role, company, experience, education, skills. From your very first message I'll build your CV on the right. Pick a **template** (8 designs) from the header, or say \"use modern template\". Say \"download PDF\" when ready.",
};

function detectTemplateSwitch(text) {
  const m = (text || "").toLowerCase();
  if (/modern|sidebar/.test(m) && /template|use|switch/.test(m)) return "modern";
  if (/executive/.test(m) && /template|use|switch/.test(m)) return "executive";
  if (/minimal/.test(m) && /template|use|switch/.test(m)) return "minimal";
  if (/fresh|graduate/.test(m) && /template|use|switch/.test(m)) return "fresh_graduate";
  if (/creative/.test(m) && /template|use|switch/.test(m)) return "creative";
  if (/tech|developer/.test(m) && /template|use|switch/.test(m)) return "tech";
  if (/elegant/.test(m) && /template|use|switch/.test(m)) return "elegant";
  if (/professional/.test(m) && /template|use|switch/.test(m)) return "professional";
  return null;
}

function detectExportIntent(text) {
  const t = (text || "").toLowerCase();
  if (/download.*pdf|export.*pdf|pdf.*download/.test(t)) return "export_pdf";
  if (/download.*docx|download.*word|export.*docx|export.*word/.test(t)) return "export_docx";
  return null;
}

export default function App() {
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
  const chatEndRef = useRef(null);

  const activeTemplate = templates.find((t) => t.id === activeCv?.template_id) || templates[0];

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setHealth({ status: "offline" }));
    fetchTemplates().then((d) => setTemplates(d.templates || [])).catch(() => {});
    loadCVs();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
      });
    } catch {
      /* auto-save silent */
    }
  }

  function triggerDownload(type, cvId) {
    const url = type === "export_pdf" ? exportPdfUrl(cvId) : exportDocxUrl(cvId);
    window.open(url, "_blank");
    setToast(type === "export_pdf" ? "PDF download started" : "DOCX download started");
  }

  async function openCV(id) {
    setLoading(true);
    try {
      const data = await getCV(id);
      setActiveCv(data.cv);
      setMessages([
        WELCOME,
        {
          role: "assistant",
          content: `Opened "${data.cv.name}". Tell me what to add or change, or say "download PDF" when ready.`,
        },
      ]);
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
      const data = await createCV({ name: "New CV", template_id: "professional" });
      await loadCVs();
      setActiveCv(data.cv);
      setMessages([WELCOME]);
      setView("chat");
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
    const templateSwitch = detectTemplateSwitch(text);

    try {
      let cvForChat = activeCv;
      if (templateSwitch) {
        cvForChat = { ...activeCv, template_id: templateSwitch };
        setActiveCv(cvForChat);
        await saveCv(cvForChat);
      }

      const result = await aiChat({
        message: text,
        history: messages.filter((m) => m.role === "user" || m.role === "assistant"),
        content: cvForChat.content,
        tone: cvForChat.tone,
        template_id: cvForChat.template_id,
      });

      const action = result.data?.action || localExport;

      if (result.data?.content) {
        const updated = {
          ...cvForChat,
          content: result.data.content,
          name: result.data.content.full_name
            ? `${result.data.content.full_name} CV`
            : cvForChat.name,
        };
        setActiveCv(updated);
        await saveCv(updated);
        await loadCVs();
      }

      let reply = result.data?.reply || result.message || "Done.";
      if (templateSwitch) {
        const tname = templates.find((t) => t.id === templateSwitch)?.name || templateSwitch;
        reply = `Switched to ${tname} template. ${reply}`;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      if (action === "export_pdf" || action === "export_docx") {
        triggerDownload(action, cvForChat.id);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, something went wrong: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
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
    const next = { ...activeCv, template_id: templateId };
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
            <h1>AI CV Builder</h1>
            <p className="muted">
              Chat to build your CV · Ollama {health?.ollama_model || "qwen2.5:7b"}
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
              <button type="button" className="btn btn-sm" onClick={() => triggerDownload("export_pdf", activeCv.id)}>
                PDF
              </button>
              <button type="button" className="btn btn-sm" onClick={() => triggerDownload("export_docx", activeCv.id)}>
                DOCX
              </button>
            </>
          )}
          {view !== "list" && (
            <button type="button" className="btn btn-ghost" onClick={() => setView("list")}>
              ← My CVs
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            + New CV
          </button>
        </div>
      </header>

      {toast && <div className="toast" onClick={() => setToast("")}>{toast}</div>}

      {view === "list" && (
        <section className="panel">
          <h2>Your CVs</h2>
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
                </div>
              ))}
              {loading && <AILoadingBubble />}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-area">
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
              <TemplateRenderer cv={activeCv} template={activeTemplate} />
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
