import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "✨",
    title: "AI-Powered Writing",
    text: "Professional summaries, achievement bullets, and skills — generated from your chat.",
  },
  {
    icon: "🎨",
    title: "13 Modern Templates",
    text: "Random start, switch via chat, or create custom color themes instantly.",
  },
  {
    icon: "📄",
    title: "Styled PDF & Word",
    text: "Download your CV with the exact template design you preview on screen.",
  },
  {
    icon: "📤",
    title: "Upload & Import",
    text: "Bring your existing resume (PDF/Word) or add a professional profile photo.",
  },
  {
    icon: "🎯",
    title: "ATS-Friendly",
    text: "Clean structure, categorized skills, and formatted certifications & languages.",
  },
  {
    icon: "🔒",
    title: "Your Workspace",
    text: "Sign in to save multiple CVs and continue building anytime.",
  },
];

const STEPS = [
  { n: "01", title: "Sign up free", text: "Create your account in seconds." },
  { n: "02", title: "Chat with AI", text: "Share your experience or upload an existing CV." },
  { n: "03", title: "Download", text: "Export a polished PDF or Word file." },
];

export default function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link to="/" className="landing-logo">
          <span className="landing-logo-mark">CV</span>
          <span>ResumeAI</span>
        </Link>
        <div className="landing-nav-actions">
          <Link to="/login" className="btn btn-ghost">Log in</Link>
          <Link to="/signup" className="btn btn-primary">Get started free</Link>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-hero-content">
          <p className="landing-eyebrow">AI CV Builder · Professional & Modern</p>
          <h1>
            Build a standout CV
            <span className="landing-gradient-text"> in minutes</span>
          </h1>
          <p className="landing-hero-sub">
            Chat with AI to create a polished, ATS-friendly resume. Pick from 13 templates,
            upload your existing CV, add your photo, and download PDF or Word — all in one place.
          </p>
          <div className="landing-hero-cta">
            <Link to="/signup" className="btn btn-primary btn-lg">Start building — it&apos;s free</Link>
            <Link to="/login" className="btn btn-lg landing-btn-outline">I already have an account</Link>
          </div>
          <div className="landing-hero-stats">
            <div><strong>13+</strong><span>Templates</span></div>
            <div><strong>AI</strong><span>Chat builder</span></div>
            <div><strong>PDF</strong><span>& Word export</span></div>
          </div>
        </div>
        <div className="landing-hero-visual" aria-hidden="true">
          <div className="landing-mock-card landing-mock-card--back" />
          <div className="landing-mock-card landing-mock-card--front">
            <div className="landing-mock-header">
              <div className="landing-mock-avatar" />
              <div>
                <div className="landing-mock-line landing-mock-line--lg" />
                <div className="landing-mock-line landing-mock-line--sm" />
              </div>
            </div>
            <div className="landing-mock-section">
              <div className="landing-mock-line landing-mock-line--title" />
              <div className="landing-mock-line" />
              <div className="landing-mock-line" />
              <div className="landing-mock-line landing-mock-line--short" />
            </div>
            <div className="landing-mock-tags">
              <span>Python</span><span>React</span><span>AWS</span>
            </div>
          </div>
        </div>
      </header>

      <section className="landing-section">
        <h2>Everything you need for a professional CV</h2>
        <p className="landing-section-sub">No design skills needed — AI and beautiful templates do the work.</p>
        <div className="landing-features">
          {FEATURES.map((f) => (
            <article key={f.title} className="landing-feature-card">
              <span className="landing-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--dark">
        <h2>How it works</h2>
        <div className="landing-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="landing-step">
              <span className="landing-step-num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta-band">
        <h2>Ready to land your next role?</h2>
        <p>Create your professional CV today — free to start.</p>
        <Link to="/signup" className="btn btn-primary btn-lg">Create free account</Link>
      </section>

      <footer className="landing-footer">
        <Link to="/" className="landing-logo">
          <span className="landing-logo-mark">CV</span>
          <span>ResumeAI</span>
        </Link>
        <p className="muted">© {new Date().getFullYear()} ResumeAI · AI CV Builder</p>
      </footer>
    </div>
  );
}
