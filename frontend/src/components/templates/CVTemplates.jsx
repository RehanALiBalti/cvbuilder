import {
  getContactLine,
  hasCvContent,
  sectionBlocks,
  visibleSections,
} from "./cvHelpers";

function ExpList({ items }) {
  return items.map((exp, i) => (
    <div key={exp.id || i} className="tpl-exp">
      <div className="tpl-exp-head">
        <strong>{exp.role}</strong>
        <span>{exp.company}</span>
      </div>
      <div className="tpl-meta">{exp.location} {exp.location && "·"} {exp.start_date} – {exp.end_date || "Present"}</div>
      {exp.bullets?.length > 0 && (
        <ul>{exp.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
      )}
    </div>
  ));
}

function EduList({ items }) {
  return items.map((edu, i) => (
    <div key={edu.id || i} className="tpl-edu">
      <strong>{edu.degree}</strong> {edu.field && `in ${edu.field}`}
      <div className="tpl-meta">{edu.institution} · {edu.start_date}–{edu.end_date}</div>
    </div>
  ));
}

function ProjList({ items }) {
  return items.map((p, i) => (
    <div key={p.id || i} className="tpl-proj">
      <strong>{p.name}</strong>
      {p.description && <p>{p.description}</p>}
      {p.bullets?.length > 0 && <ul>{p.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}
    </div>
  ));
}

function MainSections({ c, classPrefix = "" }) {
  const sections = visibleSections(c);
  const blocks = sectionBlocks(c, sections);
  return blocks.map((block, i) => (
    <section key={i} className={`${classPrefix} tpl-section`}>
      <h3 className="tpl-section-title">{block.title}</h3>
      {block.type === "summary" && <p>{block.text}</p>}
      {block.type === "experience" && <ExpList items={block.items} />}
      {block.type === "education" && <EduList items={block.items} />}
      {block.type === "projects" && <ProjList items={block.items} />}
      {block.type === "skills" && (
        <div className="tpl-skill-row">
          {block.items.map((s, j) => <span key={j} className="tpl-skill-tag">{s}</span>)}
        </div>
      )}
      {block.type === "chips" && (
        <div className="tpl-skill-row">
          {block.items.map((s, j) => <span key={j} className="tpl-chip">{s}</span>)}
        </div>
      )}
      {block.type === "list" && <ul className="tpl-simple-list">{block.items.map((x, j) => <li key={j}>{x}</li>)}</ul>}
    </section>
  ));
}

function EmptyPreview() {
  return <div className="cv-empty-preview"><p>Your CV will appear here as you chat with AI.</p></div>;
}

/* 1 — Professional: classic single column */
export function ProfessionalTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-professional">
      <header className="tpl-professional-header">
        <h1>{c.full_name || "Your Name"}</h1>
        <p className="tpl-job">{c.job_title}</p>
        <p className="tpl-contact">{contact.join(" | ")}</p>
      </header>
      <MainSections c={c} />
    </div>
  );
}

/* 2 — Modern: dark sidebar */
export function ModernTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview />;
  const contact = getContactLine(c.contact);
  const sidebarSkills = c.skills || [];
  const sidebarEdu = c.education || [];
  const mainSections = visibleSections(c).filter((s) => !["skills", "education", "languages"].includes(s));
  const sideBlocks = sectionBlocks(c, visibleSections(c).filter((s) => ["education", "languages", "certifications"].includes(s)));

  return (
    <div className="tpl tpl-modern">
      <aside className="tpl-modern-side">
        <h1>{c.full_name || "Your Name"}</h1>
        <p className="tpl-job">{c.job_title}</p>
        <div className="tpl-side-block">
          <h4>Contact</h4>
          {contact.map((line, i) => <p key={i}>{line}</p>)}
        </div>
        {sidebarSkills.length > 0 && (
          <div className="tpl-side-block">
            <h4>Skills</h4>
            <div className="tpl-skill-col">
              {sidebarSkills.map((s, i) => <span key={i}>{s}</span>)}
            </div>
          </div>
        )}
        {sideBlocks.map((b, i) => (
          <div key={i} className="tpl-side-block">
            <h4>{b.title}</h4>
            {b.type === "education" && <EduList items={b.items} />}
            {b.type === "chips" && b.items.map((x, j) => <p key={j}>{x}</p>)}
            {b.type === "list" && <ul className="tpl-simple-list">{b.items.map((x, j) => <li key={j}>{x}</li>)}</ul>}
          </div>
        ))}
      </aside>
      <main className="tpl-modern-main">
        <MainSections c={{ ...c, section_order: mainSections, skills: [], education: [], languages: [], certifications: [] }} />
      </main>
    </div>
  );
}

/* 3 — Executive: centered banner */
export function ExecutiveTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-executive">
      <header className="tpl-executive-banner">
        <h1>{c.full_name || "Your Name"}</h1>
        <p className="tpl-job">{c.job_title}</p>
        <div className="tpl-executive-rule" />
        <p className="tpl-contact">{contact.join("  ·  ")}</p>
      </header>
      <div className="tpl-executive-body">
        <MainSections c={c} />
      </div>
    </div>
  );
}

/* 4 — Minimal */
export function MinimalTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-minimal">
      <header>
        <h1>{c.full_name || "Your Name"}</h1>
        <p className="tpl-job">{c.job_title}</p>
        <p className="tpl-contact">{contact.join(" / ")}</p>
      </header>
      <MainSections c={c} classPrefix="tpl-minimal-" />
    </div>
  );
}

/* 5 — Fresh Graduate: education first */
export function FreshGraduateTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview />;
  const contact = getContactLine(c.contact);
  const order = ["education", "summary", "experience", "projects", "skills", "certifications", "languages", "awards"]
    .filter((s) => visibleSections(c).includes(s));
  return (
    <div className="tpl tpl-fresh">
      <header className="tpl-fresh-header">
        <h1>{c.full_name || "Your Name"}</h1>
        <p className="tpl-job">{c.job_title}</p>
        <p className="tpl-contact">{contact.join(" · ")}</p>
      </header>
      <MainSections c={{ ...c, section_order: order }} />
    </div>
  );
}

/* 6 — Creative: gradient + cards */
export function CreativeTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview />;
  const contact = getContactLine(c.contact);
  const blocks = sectionBlocks(c, visibleSections(c));
  return (
    <div className="tpl tpl-creative">
      <header className="tpl-creative-hero">
        <h1>{c.full_name || "Your Name"}</h1>
        <p>{c.job_title}</p>
        <p className="tpl-contact">{contact.join(" · ")}</p>
      </header>
      <div className="tpl-creative-grid">
        {blocks.map((block, i) => (
          <div key={i} className="tpl-creative-card">
            <h3>{block.title}</h3>
            {block.type === "summary" && <p>{block.text}</p>}
            {block.type === "experience" && <ExpList items={block.items} />}
            {block.type === "education" && <EduList items={block.items} />}
            {block.type === "projects" && <ProjList items={block.items} />}
            {block.type === "skills" && (
              <div className="tpl-skill-row">{block.items.map((s, j) => <span key={j} className="tpl-skill-tag">{s}</span>)}</div>
            )}
            {block.type === "list" && <ul>{block.items.map((x, j) => <li key={j}>{x}</li>)}</ul>}
            {block.type === "chips" && <p>{block.items.join(" · ")}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 7 — Tech: dark top bar */
export function TechTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-tech">
      <header className="tpl-tech-bar">
        <div>
          <h1>{c.full_name || "Your Name"}</h1>
          <p>{c.job_title}</p>
        </div>
        <div className="tpl-tech-contact">
          {contact.map((line, i) => <span key={i}>{line}</span>)}
        </div>
      </header>
      {c.skills?.length > 0 && (
        <div className="tpl-tech-skills">
          {c.skills.map((s, i) => <code key={i}>{s}</code>)}
        </div>
      )}
      <MainSections c={{ ...c, skills: [] }} />
    </div>
  );
}

/* 8 — Elegant: serif + gold accent */
export function ElegantTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-elegant">
      <header>
        <p className="tpl-elegant-label">Curriculum Vitae</p>
        <h1>{c.full_name || "Your Name"}</h1>
        <p className="tpl-job">{c.job_title}</p>
        <p className="tpl-contact">{contact.join("  |  ")}</p>
      </header>
      <MainSections c={c} />
    </div>
  );
}

const MAP = {
  professional: ProfessionalTemplate,
  modern: ModernTemplate,
  executive: ExecutiveTemplate,
  minimal: MinimalTemplate,
  fresh_graduate: FreshGraduateTemplate,
  creative: CreativeTemplate,
  tech: TechTemplate,
  elegant: ElegantTemplate,
};

export default function TemplateRenderer({ cv, template }) {
  const id = template?.id || cv?.template_id || "professional";
  const Component = MAP[id] || ProfessionalTemplate;
  return (
    <div className="cv-preview-paper">
      <Component cv={cv} template={template} />
    </div>
  );
}
