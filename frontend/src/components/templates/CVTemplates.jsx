import { forwardRef } from "react";
import {
  getContactLine,
  getProfilePhotoUrl,
  getSkillGroups,
  hasCvContent,
  sectionBlocks,
  visibleSections,
} from "./cvHelpers";

function ProfilePhoto({ cv, className = "" }) {
  const url = getProfilePhotoUrl(cv);
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Profile"
      className={`tpl-profile-photo ${className}`.trim()}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}

function HeaderWithPhoto({ cv, children, className = "" }) {
  if (!getProfilePhotoUrl(cv)) return children;
  return (
    <div className={`tpl-header-with-photo ${className}`.trim()}>
      <ProfilePhoto cv={cv} />
      <div className="tpl-header-text">{children}</div>
    </div>
  );
}

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

function SkillsGrouped({ groups }) {
  return (
    <div className="tpl-skill-groups">
      {groups.map((g, i) => (
        <div key={i} className="tpl-skill-group">
          {g.category && <h4 className="tpl-skill-cat">{g.category}</h4>}
          <div className="tpl-skill-row">
            {(g.items || []).map((s, j) => <span key={j} className="tpl-skill-tag">{s}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function BlockContent({ block }) {
  if (block.type === "summary") return <p>{block.text}</p>;
  if (block.type === "experience") return <ExpList items={block.items} />;
  if (block.type === "education") return <EduList items={block.items} />;
  if (block.type === "projects") return <ProjList items={block.items} />;
  if (block.type === "skill_groups") return <SkillsGrouped groups={block.groups} />;
  if (block.type === "skills") {
    return (
      <div className="tpl-skill-row">
        {block.items.map((s, j) => <span key={j} className="tpl-skill-tag">{s}</span>)}
      </div>
    );
  }
  if (block.type === "certifications" || block.type === "languages") {
    return <ul className="tpl-formatted-list">{block.items.map((x, j) => <li key={j}>{x}</li>)}</ul>;
  }
  if (block.type === "list") {
    return <ul className="tpl-simple-list">{block.items.map((x, j) => <li key={j}>{x}</li>)}</ul>;
  }
  if (block.type === "chips") {
    return (
      <div className="tpl-skill-row">
        {block.items.map((s, j) => <span key={j} className="tpl-chip">{s}</span>)}
      </div>
    );
  }
  return null;
}

function MainSections({ c, classPrefix = "" }) {
  const sections = visibleSections(c);
  const blocks = sectionBlocks(c, sections);
  return blocks.map((block, i) => (
    <section key={i} className={`${classPrefix} tpl-section`}>
      <h3 className="tpl-section-title">{block.title}</h3>
      <BlockContent block={block} />
    </section>
  ));
}

function EmptyPreview({ cv }) {
  const url = getProfilePhotoUrl(cv);
  return (
    <div className="cv-empty-preview">
      {url && <img src={url} alt="" className="tpl-profile-photo tpl-profile-photo--empty" />}
      <p>Your CV will appear here as you chat with AI.</p>
    </div>
  );
}

/* 1 — Professional: classic single column */
export function ProfessionalTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-professional">
      <header className="tpl-professional-header">
        <HeaderWithPhoto cv={cv}>
          <h1>{c.full_name || "Your Name"}</h1>
          <p className="tpl-job">{c.job_title}</p>
          <p className="tpl-contact">{contact.join(" | ")}</p>
        </HeaderWithPhoto>
      </header>
      <MainSections c={c} />
    </div>
  );
}

/* 2 — Modern: dark sidebar */
export function ModernTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  const skillGroups = getSkillGroups(c);
  const mainSections = visibleSections(c).filter((s) => !["skills", "education", "languages"].includes(s));
  const sideBlocks = sectionBlocks(c, visibleSections(c).filter((s) => ["education", "languages", "certifications"].includes(s)));

  return (
    <div className="tpl tpl-modern">
      <aside className="tpl-modern-side">
        <ProfilePhoto cv={cv} className="tpl-profile-photo--sidebar" />
        <h1>{c.full_name || "Your Name"}</h1>
        <p className="tpl-job">{c.job_title}</p>
        <div className="tpl-side-block">
          <h4>Contact</h4>
          {contact.map((line, i) => <p key={i}>{line}</p>)}
        </div>
        {skillGroups.length > 0 && (
          <div className="tpl-side-block">
            <h4>Skills</h4>
            <SkillsGrouped groups={skillGroups} />
          </div>
        )}
        {sideBlocks.map((b, i) => (
          <div key={i} className="tpl-side-block">
            <h4>{b.title}</h4>
            {b.type === "education" && <EduList items={b.items} />}
            {(b.type === "languages" || b.type === "certifications") && (
              <ul className="tpl-side-list">{b.items.map((x, j) => <li key={j}>{x}</li>)}</ul>
            )}
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
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-executive">
      <header className="tpl-executive-banner">
        <HeaderWithPhoto cv={cv} className="tpl-header-with-photo--center">
          <h1>{c.full_name || "Your Name"}</h1>
          <p className="tpl-job">{c.job_title}</p>
          <div className="tpl-executive-rule" />
          <p className="tpl-contact">{contact.join("  ·  ")}</p>
        </HeaderWithPhoto>
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
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-minimal">
      <header>
        <HeaderWithPhoto cv={cv}>
          <h1>{c.full_name || "Your Name"}</h1>
          <p className="tpl-job">{c.job_title}</p>
          <p className="tpl-contact">{contact.join(" / ")}</p>
        </HeaderWithPhoto>
      </header>
      <MainSections c={c} classPrefix="tpl-minimal-" />
    </div>
  );
}

/* 5 — Fresh Graduate: education first */
export function FreshGraduateTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  const order = ["education", "summary", "experience", "projects", "skills", "certifications", "languages", "awards"]
    .filter((s) => visibleSections(c).includes(s));
  return (
    <div className="tpl tpl-fresh">
      <header className="tpl-fresh-header">
        <HeaderWithPhoto cv={cv}>
          <h1>{c.full_name || "Your Name"}</h1>
          <p className="tpl-job">{c.job_title}</p>
          <p className="tpl-contact">{contact.join(" · ")}</p>
        </HeaderWithPhoto>
      </header>
      <MainSections c={{ ...c, section_order: order }} />
    </div>
  );
}

/* 6 — Creative: gradient + cards */
export function CreativeTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  const blocks = sectionBlocks(c, visibleSections(c));
  return (
    <div className="tpl tpl-creative">
      <header className="tpl-creative-hero">
        <HeaderWithPhoto cv={cv}>
          <h1>{c.full_name || "Your Name"}</h1>
          <p>{c.job_title}</p>
          <p className="tpl-contact">{contact.join(" · ")}</p>
        </HeaderWithPhoto>
      </header>
      <div className="tpl-creative-grid">
        {blocks.map((block, i) => (
          <div key={i} className="tpl-creative-card">
            <h3>{block.title}</h3>
            <BlockContent block={block} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* 7 — Tech: dark top bar */
export function TechTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-tech">
      <header className="tpl-tech-bar">
        <div className="tpl-tech-bar-left">
          <ProfilePhoto cv={cv} />
          <div>
            <h1>{c.full_name || "Your Name"}</h1>
            <p>{c.job_title}</p>
          </div>
        </div>
        <div className="tpl-tech-contact">
          {contact.map((line, i) => <span key={i}>{line}</span>)}
        </div>
      </header>
      {getSkillGroups(c).length > 0 && (
        <div className="tpl-tech-skills">
          {getSkillGroups(c).flatMap((g) => g.items || []).map((s, i) => <code key={i}>{s}</code>)}
        </div>
      )}
      <MainSections c={{ ...c, skills: [] }} />
    </div>
  );
}

/* 8 — Elegant: serif + gold accent */
export function ElegantTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-elegant">
      <header>
        <HeaderWithPhoto cv={cv}>
          <p className="tpl-elegant-label">Curriculum Vitae</p>
          <h1>{c.full_name || "Your Name"}</h1>
          <p className="tpl-job">{c.job_title}</p>
          <p className="tpl-contact">{contact.join("  |  ")}</p>
        </HeaderWithPhoto>
      </header>
      <MainSections c={c} />
    </div>
  );
}

/* 9 — Corporate: two column */
export function CorporateTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  const leftSections = ["summary", "experience", "projects"].filter((s) => visibleSections(c).includes(s));
  const rightSections = ["education", "skills", "certifications", "languages", "awards"].filter((s) => visibleSections(c).includes(s));
  return (
    <div className="tpl tpl-corporate">
      <header className="tpl-corporate-header">
        <HeaderWithPhoto cv={cv}>
          <h1>{c.full_name || "Your Name"}</h1>
          <p className="tpl-job">{c.job_title}</p>
          <p className="tpl-contact">{contact.join(" · ")}</p>
        </HeaderWithPhoto>
      </header>
      <div className="tpl-corporate-grid">
        <div><MainSections c={{ ...c, section_order: leftSections }} /></div>
        <div><MainSections c={{ ...c, section_order: rightSections }} classPrefix="tpl-corporate-side-" /></div>
      </div>
    </div>
  );
}

/* 10 — Startup: bold header */
export function StartupTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-startup">
      <header className="tpl-startup-hero">
        <HeaderWithPhoto cv={cv}>
          <h1>{c.full_name || "Your Name"}</h1>
          <p className="tpl-job">{c.job_title}</p>
          <p className="tpl-contact">{contact.join("  ·  ")}</p>
        </HeaderWithPhoto>
      </header>
      <MainSections c={c} classPrefix="tpl-startup-" />
    </div>
  );
}

/* 11 — Academic */
export function AcademicTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  const order = ["education", "summary", "experience", "projects", "skills", "certifications", "languages", "awards"]
    .filter((s) => visibleSections(c).includes(s));
  return (
    <div className="tpl tpl-academic">
      <header>
        <HeaderWithPhoto cv={cv}>
          <p className="tpl-academic-label">Curriculum Vitae</p>
          <h1>{c.full_name || "Your Name"}</h1>
          <p className="tpl-job">{c.job_title}</p>
          <p className="tpl-contact">{contact.join(" | ")}</p>
        </HeaderWithPhoto>
      </header>
      <MainSections c={{ ...c, section_order: order }} />
    </div>
  );
}

/* 12 — International */
export function InternationalTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  const blocks = sectionBlocks(c, visibleSections(c));
  return (
    <div className="tpl tpl-international">
      <header className="tpl-intl-header">
        <HeaderWithPhoto cv={cv}>
          <div>
            <h1>{c.full_name || "Your Name"}</h1>
            <p className="tpl-job">{c.job_title}</p>
          </div>
        </HeaderWithPhoto>
        <div className="tpl-intl-contact">
          {contact.map((line, i) => <span key={i}>{line}</span>)}
        </div>
      </header>
      {blocks.map((block, i) => (
        <div key={i} className="tpl-intl-block">
          <h3>{block.title}</h3>
          <BlockContent block={block} />
        </div>
      ))}
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
  corporate: CorporateTemplate,
  startup: StartupTemplate,
  academic: AcademicTemplate,
  international: InternationalTemplate,
  custom: CustomTemplate,
};

/* 13 — Custom: user-defined theme (via chat) */
export function CustomTemplate({ cv }) {
  const c = cv.content;
  if (!hasCvContent(c)) return <EmptyPreview cv={cv} />;
  const contact = getContactLine(c.contact);
  return (
    <div className="tpl tpl-professional tpl-custom">
      <header className="tpl-professional-header">
        <HeaderWithPhoto cv={cv}>
          <h1>{c.full_name || "Your Name"}</h1>
          <p className="tpl-job">{c.job_title}</p>
          <p className="tpl-contact">{contact.join(" | ")}</p>
        </HeaderWithPhoto>
      </header>
      <MainSections c={c} />
    </div>
  );
}

function buildThemeStyle(theme) {
  if (!theme?.accent_color) return undefined;
  const style = {
    "--cv-accent": theme.accent_color,
    "--cv-header-bg": theme.header_bg || theme.accent_color,
    "--cv-sidebar-bg": theme.sidebar_bg || theme.accent_color,
  };
  if (theme.font_family) style["--cv-font"] = theme.font_family;
  return style;
}

export default forwardRef(function TemplateRenderer({ cv, template }, ref) {
  const id = template?.id || cv?.template_id || "professional";
  const Component = MAP[id] || ProfessionalTemplate;
  const themeStyle = buildThemeStyle(cv?.theme_override);
  const themed = id === "custom" || themeStyle;
  return (
    <div
      className={`cv-preview-paper${themed ? " cv-themed" : ""}`}
      style={themeStyle}
      ref={ref}
    >
      <Component cv={cv} template={template} />
    </div>
  );
});
