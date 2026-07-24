import { Link } from "react-router-dom";
import { computeAtsScore } from "../utils/atsScore";

const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "builder", label: "Builder" },
  { id: "ats", label: "ATS" },
  { id: "templates", label: "Templates" },
  { id: "profile", label: "Profile" },
];

const BUILDER_SECTIONS = [
  { icon: "♙", label: "Personal Info", complete: true },
  { icon: "◷", label: "Work Experience", complete: true },
  { icon: "♧", label: "Skills", complete: false },
  { icon: "✓", label: "Education", complete: true },
  { icon: "〆", label: "Summary", complete: false },
];

const TEMPLATE_META = [
  { name: "Executive", tone: "blue", badge: "Popular" },
  { name: "Technical", tone: "violet", badge: "ATS-Safe" },
  { name: "Creative", tone: "purple", badge: "Bold" },
  { name: "Minimal", tone: "cyan", badge: "Entry" },
];

function NavIcon({ id }) {
  const paths = {
    home: <><path d="M3 10.8 12 3l9 7.8" /><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" /></>,
    builder: <><path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16Z" /><path d="m14.7 6.5 3 3M4 20h16" /></>,
    ats: <><path d="M5 20V11M12 20V4M19 20v-6" /><path d="M3 20h18" /></>,
    templates: <><path d="m12 3 9 4.5-9 4.5-9-4.5Z" /><path d="m3 12 9 4.5 9-4.5M3 16.5l9 4.5 9-4.5" /></>,
    profile: <><circle cx="12" cy="7" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {paths[id]}
    </svg>
  );
}

function BottomNav({ active, onChange }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="App sections">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={active === item.id ? "is-active" : ""}
          onClick={() => onChange(item.id)}
        >
          <span className="mobile-nav-icon"><NavIcon id={item.id} /></span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function HomeScreen({ user, cvs, score, onCreate, onOpen }) {
  const firstName = user?.name?.split(" ")[0] || "there";
  const recent = cvs.slice(0, 3);

  return (
    <>
      <div className="mobile-welcome">
        <div>
          <p>Good morning 👋</p>
          <h1>{user?.name || "Your workspace"}</h1>
        </div>
        <div className="mobile-welcome-actions">
          <button type="button" aria-label="Notifications">♧</button>
          <span>{(user?.name || user?.email || "U").slice(0, 2).toUpperCase()}</span>
        </div>
      </div>

      <section className="mobile-score-card">
        <span>Your ATS Score</span>
        <strong>{score}<small>%</small></strong>
        <p>↗ Keep improving your CV</p>
        <i /><b />
      </section>

      <div className="mobile-quick-actions">
        <button type="button" onClick={onCreate}><strong>＋</strong><span>New CV</span></button>
        <button type="button" className="is-green" onClick={() => onOpen(recent[0]?.id)}><strong>◎</strong><span>Open CV</span></button>
        <button type="button" className="is-amber" onClick={() => onOpen(recent[0]?.id)}><strong>⇩</strong><span>Export</span></button>
      </div>

      <div className="mobile-section-title">
        <h2>{recent.length ? "Recent CVs" : `Welcome, ${firstName}`}</h2>
        {recent.length > 0 && <button type="button" onClick={() => onOpen(recent[0].id)}>See all</button>}
      </div>

      <div className="mobile-role-list">
        {recent.length ? recent.map((cv, index) => (
          <button key={cv.id} type="button" className="mobile-role-card" onClick={() => onOpen(cv.id)}>
            <span className="mobile-role-letter">{(cv.name || "CV").charAt(0).toUpperCase()}</span>
            <span className="mobile-role-copy">
              <strong>{cv.name || "Untitled CV"}</strong>
              <small>{cv.job_title || `Updated ${new Date(cv.updated_at).toLocaleDateString()}`}</small>
            </span>
            <span className={`mobile-role-score score-${index}`}><b>{score}%</b><small>score</small></span>
          </button>
        )) : (
          <button type="button" className="mobile-empty-card" onClick={onCreate}>
            <strong>Create your first CV</strong>
            <span>Start building a professional, ATS-ready CV with AI.</span>
          </button>
        )}
      </div>
    </>
  );
}

function BuilderScreen({ hasCv, onCreate, onOpen }) {
  return (
    <>
      <div className="mobile-title-row">
        <h1>CV Builder</h1>
        <span className="mobile-ai-pill">ϟ AI On</span>
      </div>

      <section className="mobile-progress-card">
        <div><span>Profile Completion</span><strong>{hasCv ? "72%" : "0%"}</strong></div>
        <div className="mobile-progress"><i style={{ width: hasCv ? "72%" : "0%" }} /></div>
        <p>{hasCv ? "3 sections incomplete — add them to boost your score" : "Create a CV to start completing your profile"}</p>
      </section>

      <h2 className="mobile-list-heading">Sections</h2>
      <div className="mobile-builder-sections">
        {BUILDER_SECTIONS.map((section) => (
          <button key={section.label} type="button" onClick={hasCv ? onOpen : onCreate}>
            <span className="mobile-section-icon">{section.icon}</span>
            <strong>{section.label}</strong>
            <span className={section.complete && hasCv ? "is-complete" : ""}>
              {section.complete && hasCv ? "✓" : "›"}
            </span>
          </button>
        ))}
      </div>

      <button type="button" className="mobile-ai-tip" onClick={hasCv ? onOpen : onCreate}>
        <strong>✣ AI tip:</strong> Add measurable results to make your experience stand out.
      </button>
    </>
  );
}

function AtsScreen({ cv, scoreData, onOpen }) {
  const score = scoreData.score;
  const circumference = 289;
  const offset = circumference - (score / 100) * circumference;
  const missing = scoreData.checks.filter((check) => !check.ok).slice(0, 4);

  return (
    <>
      <div className="mobile-page-heading">
        <h1>ATS Optimizer</h1>
        <p>{cv?.content?.full_name || cv?.name || "Create a CV to calculate your score"}</p>
      </div>

      <div className="mobile-ats-ring">
        <svg viewBox="0 0 104 104" aria-hidden="true">
          <circle cx="52" cy="52" r="46" />
          <circle className="ring-value" cx="52" cy="52" r="46" style={{ strokeDashoffset: offset }} />
        </svg>
        <div><strong>{score}</strong><span>ATS Score</span></div>
      </div>

      <div className="mobile-ats-stats">
        <div><strong>{Math.min(100, score + 3)}%</strong><span>Keywords</span></div>
        <div className="is-green"><strong>{score >= 50 ? "100%" : "60%"}</strong><span>Format</span></div>
        <div className="is-amber"><strong>{Math.max(score, 10)}%</strong><span>Impact</span></div>
      </div>

      <div className="mobile-metrics">
        {[
          ["Keyword Match", Math.min(100, score + 3)],
          ["Formatting", score >= 50 ? 100 : 60],
          ["Impact Phrases", Math.max(score, 10)],
          ["Readability", Math.min(100, score + 1)],
        ].map(([label, value]) => (
          <div key={label}>
            <p><span>{label}</span><strong>{value}%</strong></p>
            <i><b style={{ width: `${value}%` }} /></i>
          </div>
        ))}
      </div>

      <h2 className="mobile-list-heading">Missing sections</h2>
      <div className="mobile-keywords">
        {missing.length ? missing.map((item) => <span key={item.label}>• {item.label}</span>) : <span className="is-clear">✓ Your CV covers every key section</span>}
      </div>

      <button type="button" className="mobile-primary-action" onClick={onOpen}>ϟ Improve with AI</button>
    </>
  );
}

function TemplatesScreen({ templates, onOpen }) {
  const cards = TEMPLATE_META.map((meta, index) => ({
    ...meta,
    source: templates[index],
    name: templates[index]?.name || meta.name,
  }));

  return (
    <>
      <div className="mobile-page-heading"><h1>Templates</h1></div>
      <label className="mobile-search"><span>⌕</span><input aria-label="Search templates" placeholder="Search templates..." /></label>
      <div className="mobile-filters">
        <button type="button" className="is-active">All</button>
        <button type="button">ATS-Safe</button>
        <button type="button">Creative</button>
        <button type="button">Minimal</button>
      </div>
      <div className="mobile-template-grid">
        {cards.map((template) => (
          <button key={template.name} type="button" className="mobile-template-card" onClick={onOpen}>
            <span className={`mobile-template-preview is-${template.tone}`}>
              <i /><i /><i /><i /><i />
              <b>{template.badge}</b>
            </span>
            <span className="mobile-template-name"><strong>{template.name}</strong><small>⊙</small></span>
          </button>
        ))}
      </div>
    </>
  );
}

function ProfileScreen({ user, planLabel, cvs, score, billingEnabled }) {
  const initial = (user?.name || user?.email || "U").slice(0, 2).toUpperCase();
  return (
    <>
      <div className="mobile-page-heading"><h1>Profile</h1></div>
      <div className="mobile-profile-hero">
        <span>{initial}</span>
        <div><h2>{user?.name || "Your Profile"}</h2><p>{user?.email || "CV professional"}</p><small>★★★★★ <b>{planLabel} Member</b></small></div>
      </div>
      <div className="mobile-profile-stats">
        <div><strong>{cvs.length}</strong><span>CVs Made</span></div>
        <div><strong>{score}%</strong><span>Avg Score</span></div>
        <div><strong>0</strong><span>Interviews</span></div>
      </div>
      <div className="mobile-profile-menu">
        <button type="button"><span>▣</span><strong>My CVs</strong><i>›</i></button>
        {billingEnabled && (
          <Link to="/builder/account"><span>ϟ</span><strong>Subscription · {planLabel}</strong><em>Active</em><i>›</i></Link>
        )}
        <button type="button"><span>▯</span><strong>Job Tracker</strong><i>›</i></button>
        <Link to="/builder/account"><span>⚙</span><strong>Settings</strong><i>›</i></Link>
      </div>
    </>
  );
}

export default function MobileWorkspace({
  tab,
  onTabChange,
  user,
  features,
  planLabel,
  cvs,
  templates,
  mobileCv,
  onCreate,
  onOpen,
}) {
  const scoreData = computeAtsScore(mobileCv?.content || {});
  const score = scoreData.score;
  const firstCvId = mobileCv?.id || cvs[0]?.id;
  const openFirst = () => firstCvId ? onOpen(firstCvId) : onCreate();

  return (
    <div className="mobile-workspace">
      <main className={`mobile-workspace-content mobile-screen--${tab}`}>
        {tab === "home" && <HomeScreen user={user} cvs={cvs} score={score} onCreate={onCreate} onOpen={onOpen} />}
        {tab === "builder" && <BuilderScreen hasCv={Boolean(firstCvId)} onCreate={onCreate} onOpen={openFirst} />}
        {tab === "ats" && <AtsScreen cv={mobileCv} scoreData={scoreData} onOpen={openFirst} />}
        {tab === "templates" && <TemplatesScreen templates={templates} onOpen={openFirst} />}
        {tab === "profile" && (
          <ProfileScreen
            user={user}
            planLabel={planLabel}
            cvs={cvs}
            score={score}
            billingEnabled={features?.billing_enabled === true}
          />
        )}
      </main>
      <BottomNav active={tab} onChange={onTabChange} />
    </div>
  );
}
