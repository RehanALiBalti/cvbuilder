import { useMemo, useState } from "react";

const STEPS = [
  { id: "basics", title: "About you", subtitle: "Name and role" },
  { id: "contact", title: "Contact", subtitle: "How recruiters reach you" },
  { id: "experience", title: "Experience", subtitle: "One or more jobs" },
  { id: "education", title: "Education", subtitle: "One or more schools" },
  { id: "skills", title: "Skills", subtitle: "What you are good at" },
  { id: "extras", title: "Extras", subtitle: "Optional details" },
  { id: "finish", title: "Generate", subtitle: "One AI polish" },
];

function emptyContent(base = {}) {
  return {
    full_name: "",
    job_title: "",
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    skill_groups: [],
    certifications: [],
    languages: [],
    awards: [],
    section_visibility: {
      summary: true,
      experience: true,
      education: true,
      projects: true,
      skills: true,
      certifications: false,
      languages: true,
      awards: true,
    },
    ...base,
    contact: { email: "", phone: "", location: "", linkedin: "", website: "", github: "", ...(base.contact || {}) },
  };
}

export default function GuidedBuilder({
  initialContent,
  tone,
  generating,
  onLiveUpdate,
  onGenerate,
  onSwitchToChat,
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => emptyContent(initialContent || {}));
  const emptyExp = () => ({ company: "", role: "", start_date: "", end_date: "", bullets: "" });
  const emptyEdu = () => ({ degree: "", institution: "", end_date: "" });

  const [experiences, setExperiences] = useState(() => {
    const list = initialContent?.experience || [];
    if (!list.length) return [emptyExp()];
    return list.map((e) => ({
      company: e?.company || "",
      role: e?.role || "",
      start_date: e?.start_date || "",
      end_date: e?.end_date || "",
      bullets: (e?.bullets || []).join("\n"),
    }));
  });
  const [educations, setEducations] = useState(() => {
    const list = initialContent?.education || [];
    if (!list.length) return [emptyEdu()];
    return list.map((e) => ({
      degree: e?.degree || "",
      institution: e?.institution || "",
      end_date: e?.end_date || "",
    }));
  });
  const [skillsText, setSkillsText] = useState(() => (initialContent?.skills || []).join(", "));
  const [languagesText, setLanguagesText] = useState(() =>
    (initialContent?.languages || []).map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean).join(", "),
  );
  const [projectText, setProjectText] = useState(() => initialContent?.projects?.[0]?.name || "");

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

  function patchForm(partial) {
    setForm((prev) => {
      const next = { ...prev, ...partial };
      if (partial.contact) next.contact = { ...prev.contact, ...partial.contact };
      return next;
    });
  }

  function buildContent() {
    const skills = skillsText.split(",").map((s) => s.trim()).filter(Boolean);
    const languages = languagesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, proficiency: "" }));

    const experience = experiences
      .filter((exp) => exp.company || exp.role || exp.bullets.trim())
      .map((exp) => ({
        company: exp.company,
        role: exp.role,
        location: "",
        start_date: exp.start_date,
        end_date: exp.end_date,
        current: !exp.end_date || /present/i.test(exp.end_date),
        bullets: exp.bullets.split("\n").map((b) => b.trim()).filter(Boolean),
      }));

    const education = educations
      .filter((edu) => edu.degree || edu.institution)
      .map((edu) => ({
        degree: edu.degree,
        institution: edu.institution,
        field: "",
        start_date: "",
        end_date: edu.end_date,
        gpa: "",
        highlights: [],
      }));

    const projects = [];
    if (projectText.trim()) {
      projects.push({
        name: projectText.trim(),
        url: "",
        technologies: [],
        description: "",
        bullets: [],
      });
    }

    return {
      ...form,
      experience,
      education,
      projects,
      skills,
      skill_groups: skills.length ? [{ category: "Core Skills", items: skills }] : [],
      languages,
      section_visibility: {
        ...form.section_visibility,
        experience: experience.length > 0,
        education: education.length > 0,
        projects: projects.length > 0,
        skills: skills.length > 0,
        languages: languages.length > 0,
      },
    };
  }

  function pushLive() {
    const content = buildContent();
    onLiveUpdate?.(content);
    return content;
  }

  function next() {
    pushLive();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finish() {
    const content = pushLive();
    await onGenerate(content);
  }

  const current = STEPS[step];

  return (
    <div className="guided-builder">
      <div className="guided-builder-top">
        <div>
          <p className="guided-eyebrow">Fast CV builder</p>
          <h3>{current.title}</h3>
          <p className="guided-sub">{current.subtitle}</p>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onSwitchToChat}>
          Free chat
        </button>
      </div>

      <div className="guided-progress" aria-hidden="true">
        <div className="guided-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="guided-steps-dots">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`guided-dot ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
            onClick={() => { pushLive(); setStep(i); }}
            title={s.title}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="guided-panel">
        {step === 0 && (
          <div className="guided-fields">
            <label>
              <span>Full name</span>
              <input
                value={form.full_name}
                onChange={(e) => patchForm({ full_name: e.target.value })}
                placeholder="e.g. Ali Khan"
                autoFocus
              />
            </label>
            <label>
              <span>Job title</span>
              <input
                value={form.job_title}
                onChange={(e) => patchForm({ job_title: e.target.value })}
                placeholder="e.g. Software Engineer"
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="guided-fields">
            <label>
              <span>Email</span>
              <input
                type="email"
                value={form.contact.email}
                onChange={(e) => patchForm({ contact: { email: e.target.value } })}
                placeholder="you@email.com"
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                value={form.contact.phone}
                onChange={(e) => patchForm({ contact: { phone: e.target.value } })}
                placeholder="+92 300 0000000"
              />
            </label>
            <label>
              <span>City / Location</span>
              <input
                value={form.contact.location}
                onChange={(e) => patchForm({ contact: { location: e.target.value } })}
                placeholder="Lahore, Pakistan"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="guided-fields">
            {experiences.map((exp, idx) => (
              <div key={idx} className="guided-multi-card">
                <div className="guided-multi-head">
                  <strong>Job {idx + 1}</strong>
                  {experiences.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setExperiences((list) => list.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <label>
                  <span>Company</span>
                  <input
                    value={exp.company}
                    onChange={(e) => setExperiences((list) => list.map((row, i) => (i === idx ? { ...row, company: e.target.value } : row)))}
                    placeholder="Company name"
                  />
                </label>
                <label>
                  <span>Role</span>
                  <input
                    value={exp.role}
                    onChange={(e) => setExperiences((list) => list.map((row, i) => (i === idx ? { ...row, role: e.target.value } : row)))}
                    placeholder="Your role"
                  />
                </label>
                <div className="guided-row">
                  <label>
                    <span>Start</span>
                    <input
                      value={exp.start_date}
                      onChange={(e) => setExperiences((list) => list.map((row, i) => (i === idx ? { ...row, start_date: e.target.value } : row)))}
                      placeholder="2022"
                    />
                  </label>
                  <label>
                    <span>End</span>
                    <input
                      value={exp.end_date}
                      onChange={(e) => setExperiences((list) => list.map((row, i) => (i === idx ? { ...row, end_date: e.target.value } : row)))}
                      placeholder="Present"
                    />
                  </label>
                </div>
                <label>
                  <span>What did you do? (one point per line)</span>
                  <textarea
                    rows={3}
                    value={exp.bullets}
                    onChange={(e) => setExperiences((list) => list.map((row, i) => (i === idx ? { ...row, bullets: e.target.value } : row)))}
                    placeholder={"Led a key project\nImproved results by 20%"}
                  />
                </label>
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={() => setExperiences((list) => [...list, emptyExp()])}>
              + Add another job
            </button>
            <p className="guided-hint">Students can skip and continue.</p>
          </div>
        )}

        {step === 3 && (
          <div className="guided-fields">
            {educations.map((edu, idx) => (
              <div key={idx} className="guided-multi-card">
                <div className="guided-multi-head">
                  <strong>Education {idx + 1}</strong>
                  {educations.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setEducations((list) => list.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <label>
                  <span>Degree / qualification</span>
                  <input
                    value={edu.degree}
                    onChange={(e) => setEducations((list) => list.map((row, i) => (i === idx ? { ...row, degree: e.target.value } : row)))}
                    placeholder="BSCS / High School / Intermediate"
                  />
                </label>
                <label>
                  <span>School / University</span>
                  <input
                    value={edu.institution}
                    onChange={(e) => setEducations((list) => list.map((row, i) => (i === idx ? { ...row, institution: e.target.value } : row)))}
                    placeholder="Institution name"
                  />
                </label>
                <label>
                  <span>Year</span>
                  <input
                    value={edu.end_date}
                    onChange={(e) => setEducations((list) => list.map((row, i) => (i === idx ? { ...row, end_date: e.target.value } : row)))}
                    placeholder="2024"
                  />
                </label>
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={() => setEducations((list) => [...list, emptyEdu()])}>
              + Add another school
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="guided-fields">
            <label>
              <span>Skills (comma separated)</span>
              <textarea
                rows={3}
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="Python, React, Communication, Teamwork"
              />
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="guided-fields">
            <label>
              <span>Languages (optional)</span>
              <input value={languagesText} onChange={(e) => setLanguagesText(e.target.value)} placeholder="English, Urdu" />
            </label>
            <label>
              <span>One project name (optional)</span>
              <input value={projectText} onChange={(e) => setProjectText(e.target.value)} placeholder="Portfolio website" />
            </label>
            <p className="guided-hint">Optional — skip if you want.</p>
          </div>
        )}

        {step === 6 && (
          <div className="guided-finish">
            <div className="guided-finish-card">
              <h4>Ready to generate</h4>
              <p>
                We collected your details section by section. AI will polish everything
                <strong> once</strong> into a professional CV — faster than chatting line by line.
              </p>
              <ul>
                <li>{form.full_name || "Name"} · {form.job_title || "Role"}</li>
                <li>{form.contact.email || "No email yet"}</li>
                <li>{skillsText ? "Skills added" : "No skills yet"}</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="guided-actions">
        <button type="button" className="btn" onClick={back} disabled={step === 0 || generating}>
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary builder-btn-glow" onClick={next} disabled={generating}>
            Continue
          </button>
        ) : (
          <button
            type="button"
            className={`btn btn-primary builder-btn-glow ${generating ? "is-loading" : ""}`}
            onClick={finish}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate professional CV"}
          </button>
        )}
      </div>
    </div>
  );
}
