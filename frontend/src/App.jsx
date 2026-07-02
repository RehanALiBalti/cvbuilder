import { useEffect, useState } from "react";
import {
  aiAnalyze,
  aiCareerGuidance,
  aiCoverLetter,
  aiEnhance,
  aiGenerate,
  aiLinkedIn,
  aiOptimizeJob,
  aiRegenerateSection,
  createCV,
  deleteCV,
  duplicateCV,
  exportDocxUrl,
  exportPdfUrl,
  fetchCVs,
  fetchHealth,
  fetchTemplates,
  getCV,
  renameCV,
  updateCV,
} from "../api/client";

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "modern", label: "Modern" },
  { id: "executive", label: "Executive" },
  { id: "fresh_graduate", label: "Fresh Graduate" },
];

const SECTIONS = [
  "summary", "experience", "education", "projects",
  "skills", "certifications", "languages", "awards",
];

function CVPreview({ cv, template }) {
  if (!cv) return null;
  const c = cv.content;
  const accent = template?.preview_color || "#1d4ed8";

  const renderSection = (section) => {
    if (!c.section_visibility?.[section]) return null;

    if (section === "summary" && c.summary) {
      return (
        <div key={section} className="cv-section">
          <h3 style={{ color: accent }}>Summary</h3>
          <p>{c.summary}</p>
        </div>
      );
    }
    if (section === "experience" && c.experience?.length) {
      return (
        <div key={section} className="cv-section">
          <h3 style={{ color: accent }}>Experience</h3>
          {c.experience.map((exp) => (
            <div key={exp.id} className="cv-item">
              <strong>{exp.role}</strong> — {exp.company}
              <div className="cv-meta">{exp.start_date} – {exp.end_date || "Present"}</div>
              <ul>{exp.bullets?.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          ))}
        </div>
      );
    }
    if (section === "education" && c.education?.length) {
      return (
        <div key={section} className="cv-section">
          <h3 style={{ color: accent }}>Education</h3>
          {c.education.map((edu) => (
            <div key={edu.id} className="cv-item">
              <strong>{edu.degree}</strong> in {edu.field} — {edu.institution}
            </div>
          ))}
        </div>
      );
    }
    if (section === "projects" && c.projects?.length) {
      return (
        <div key={section} className="cv-section">
          <h3 style={{ color: accent }}>Projects</h3>
          {c.projects.map((p) => (
            <div key={p.id} className="cv-item">
              <strong>{p.name}</strong>
              <p>{p.description}</p>
            </div>
          ))}
        </div>
      );
    }
    if (section === "skills" && c.skills?.length) {
      return (
        <div key={section} className="cv-section">
          <h3 style={{ color: accent }}>Skills</h3>
          <p>{c.skills.join(" • ")}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="cv-preview-paper" style={{ fontFamily: template?.font }}>
      <div className="cv-header">
        <h1 style={{ color: accent }}>{c.full_name || "Your Name"}</h1>
        <p className="cv-title">{c.job_title}</p>
        <p className="cv-contact">
          {[c.contact?.email, c.contact?.phone, c.contact?.location, c.contact?.linkedin]
            .filter(Boolean)
            .join(" | ")}
        </p>
      </div>
      {(c.section_order || SECTIONS).map(renderSection)}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("list");
  const [cvs, setCvs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeCv, setActiveCv] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiPanel, setAiPanel] = useState("generate");
  const [rawInput, setRawInput] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [coverJob, setCoverJob] = useState("");
  const [coverCompany, setCoverCompany] = useState("");
  const [coverJd, setCoverJd] = useState("");

  const activeTemplate = templates.find((t) => t.id === activeCv?.template_id) || templates[0];

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setHealth({ status: "offline" }));
    fetchTemplates().then((d) => setTemplates(d.templates || [])).catch(() => {});
    loadCVs();
  }, []);

  async function loadCVs() {
    try {
      const data = await fetchCVs();
      setCvs(data.cvs || []);
    } catch {
      setCvs([]);
    }
  }

  async function openCV(id) {
    setLoading(true);
    try {
      const data = await getCV(id);
      setActiveCv(data.cv);
      setView("editor");
    } catch (e) {
      setMessage(e.message);
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
      setView("editor");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function autoSave(cv) {
    if (!cv?.id) return;
    try {
      await updateCV(cv.id, {
        name: cv.name,
        template_id: cv.template_id,
        tone: cv.tone,
        content: cv.content,
      });
    } catch {
      /* silent auto-save */
    }
  }

  function updateContent(patch) {
    setActiveCv((prev) => {
      const next = {
        ...prev,
        content: { ...prev.content, ...patch },
      };
      autoSave(next);
      return next;
    });
  }

  function updateContact(field, value) {
    setActiveCv((prev) => {
      const next = {
        ...prev,
        content: {
          ...prev.content,
          contact: { ...prev.content.contact, [field]: value },
        },
      };
      autoSave(next);
      return next;
    });
  }

  async function runAI(fn, payload) {
    setLoading(true);
    setAiResult(null);
    try {
      const result = await fn(payload);
      setAiResult(result);
      if (result.data?.content && activeCv) {
        setActiveCv((prev) => ({
          ...prev,
          content: result.data.content,
        }));
        await updateCV(activeCv.id, {
          content: result.data.content,
          save_version: true,
          version_label: "AI update",
        });
      }
      setMessage(result.success ? "AI update applied" : result.message || "AI completed");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cv-app">
      <header className="cv-header-bar">
        <div className="brand">
          <div className="brand-mark">CV</div>
          <div>
            <h1>AI CV Builder</h1>
            <p className="muted">
              Powered by Ollama {health?.ollama_model || "qwen2.5:1.5b"}
              {health?.ollama?.model_available === false && " (model not pulled)"}
            </p>
          </div>
        </div>
        <div className="header-actions">
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

      {message && (
        <div className="toast" onClick={() => setMessage("")}>{message}</div>
      )}

      {view === "list" && (
        <section className="panel">
          <h2>Your CVs</h2>
          {cvs.length === 0 ? (
            <div className="empty-state">
              <p>No CVs yet. Create one or use AI to generate from your background.</p>
              <button type="button" className="btn btn-primary" onClick={handleCreate}>
                Create your first CV
              </button>
            </div>
          ) : (
            <div className="cv-grid">
              {cvs.map((cv) => (
                <article key={cv.id} className="cv-card">
                  <h3>{cv.name}</h3>
                  <p className="muted">{cv.job_title || "No title"}</p>
                  <p className="cv-date">Updated {new Date(cv.updated_at).toLocaleDateString()}</p>
                  <div className="cv-card-actions">
                    <button type="button" className="btn btn-sm" onClick={() => openCV(cv.id)}>Edit</button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={async () => {
                        await duplicateCV(cv.id);
                        loadCVs();
                      }}
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

      {view === "editor" && activeCv && (
        <div className="editor-layout">
          <aside className="editor-sidebar">
            <div className="field">
              <label>CV Name</label>
              <input
                value={activeCv.name}
                onChange={(e) => setActiveCv((p) => ({ ...p, name: e.target.value }))}
                onBlur={() => renameCV(activeCv.id, activeCv.name)}
              />
            </div>
            <div className="field">
              <label>Template</label>
              <select
                value={activeCv.template_id}
                onChange={(e) => {
                  const next = { ...activeCv, template_id: e.target.value };
                  setActiveCv(next);
                  autoSave(next);
                }}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Writing Tone</label>
              <select
                value={activeCv.tone}
                onChange={(e) => {
                  const next = { ...activeCv, tone: e.target.value };
                  setActiveCv(next);
                  autoSave(next);
                }}
              >
                {TONES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <h3 className="sidebar-title">Personal Info</h3>
            <div className="field">
              <label>Full Name</label>
              <input value={activeCv.content.full_name} onChange={(e) => updateContent({ full_name: e.target.value })} />
            </div>
            <div className="field">
              <label>Job Title</label>
              <input value={activeCv.content.job_title} onChange={(e) => updateContent({ job_title: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={activeCv.content.contact.email} onChange={(e) => updateContact("email", e.target.value)} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={activeCv.content.contact.phone} onChange={(e) => updateContact("phone", e.target.value)} />
            </div>
            <div className="field">
              <label>Location</label>
              <input value={activeCv.content.contact.location} onChange={(e) => updateContact("location", e.target.value)} />
            </div>

            <h3 className="sidebar-title">Summary</h3>
            <div className="field">
              <textarea
                rows={4}
                value={activeCv.content.summary}
                onChange={(e) => updateContent({ summary: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-sm btn-ai"
                disabled={loading}
                onClick={() => runAI(aiRegenerateSection, {
                  section: "summary",
                  content: activeCv.content,
                  tone: activeCv.tone,
                })}
              >
                ✨ AI Regenerate
              </button>
            </div>

            <h3 className="sidebar-title">Skills</h3>
            <div className="field">
              <textarea
                rows={2}
                placeholder="Comma-separated skills"
                value={(activeCv.content.skills || []).join(", ")}
                onChange={(e) => updateContent({
                  skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })}
              />
            </div>

            <div className="export-actions">
              <a className="btn btn-sm" href={exportPdfUrl(activeCv.id)} target="_blank" rel="noreferrer">PDF</a>
              <a className="btn btn-sm" href={exportDocxUrl(activeCv.id)} target="_blank" rel="noreferrer">DOCX</a>
            </div>
          </aside>

          <main className="editor-preview">
            <CVPreview cv={activeCv} template={activeTemplate} />
          </main>

          <aside className="ai-panel">
            <h3>AI Assistant</h3>
            <div className="ai-tabs">
              {[
                ["generate", "Generate"],
                ["analyze", "Analyze"],
                ["job", "Job Match"],
                ["cover", "Cover Letter"],
                ["career", "Career"],
                ["linkedin", "LinkedIn"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`ai-tab ${aiPanel === id ? "active" : ""}`}
                  onClick={() => setAiPanel(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {aiPanel === "generate" && (
              <div className="ai-form">
                <p className="muted">Paste your background, experience, education — AI builds a full CV.</p>
                <textarea
                  rows={8}
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="e.g. Software engineer, 5 years Python/React, BS CS from..."
                />
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={loading || !rawInput.trim()}
                  onClick={() => runAI(aiGenerate, {
                    raw_input: rawInput,
                    tone: activeCv.tone,
                    target_role: activeCv.content.job_title,
                  })}
                >
                  {loading ? "Generating..." : "Generate CV with AI"}
                </button>
              </div>
            )}

            {aiPanel === "analyze" && (
              <div className="ai-form">
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                  onClick={() => runAI(aiAnalyze, {
                    content: activeCv.content,
                    target_role: activeCv.content.job_title,
                  })}
                >
                  Analyze Resume Quality
                </button>
              </div>
            )}

            {aiPanel === "job" && (
              <div className="ai-form">
                <textarea
                  rows={6}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste job description..."
                />
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={loading || !jobDescription.trim()}
                  onClick={() => runAI(aiOptimizeJob, {
                    content: activeCv.content,
                    job_description: jobDescription,
                    tone: activeCv.tone,
                  })}
                >
                  Optimize for Job
                </button>
              </div>
            )}

            {aiPanel === "cover" && (
              <div className="ai-form">
                <input placeholder="Job title" value={coverJob} onChange={(e) => setCoverJob(e.target.value)} />
                <input placeholder="Company" value={coverCompany} onChange={(e) => setCoverCompany(e.target.value)} />
                <textarea rows={4} placeholder="Job description (optional)" value={coverJd} onChange={(e) => setCoverJd(e.target.value)} />
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                  onClick={() => runAI(aiCoverLetter, {
                    content: activeCv.content,
                    job_title: coverJob,
                    company: coverCompany,
                    job_description: coverJd,
                    tone: activeCv.tone,
                  })}
                >
                  Generate Cover Letter
                </button>
              </div>
            )}

            {aiPanel === "career" && (
              <div className="ai-form">
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                  onClick={() => runAI(aiCareerGuidance, {
                    content: activeCv.content,
                    target_role: activeCv.content.job_title,
                  })}
                >
                  Get Career Guidance
                </button>
              </div>
            )}

            {aiPanel === "linkedin" && (
              <div className="ai-form">
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                  onClick={() => runAI(aiLinkedIn, {
                    content: activeCv.content,
                    tone: activeCv.tone,
                  })}
                >
                  Generate LinkedIn Bio
                </button>
              </div>
            )}

            {aiResult && (
              <div className="ai-result">
                <h4>AI Result</h4>
                <pre>{JSON.stringify(aiResult.data || aiResult, null, 2)}</pre>
                {aiResult.suggestions?.length > 0 && (
                  <ul>
                    {aiResult.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

      {loading && <div className="loading-overlay">Working with AI...</div>}
    </div>
  );
}
