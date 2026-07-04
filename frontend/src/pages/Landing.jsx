import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import LandingLoader from "../components/LandingLoader";
import PricingSection from "../components/PricingSection";
import Reveal from "../components/Reveal";

const FEATURES = [
  { icon: "✨", title: "AI-Powered Writing", text: "Professional summaries, achievement bullets, and skills — generated from your chat." },
  { icon: "🎨", title: "Pro Templates", text: "Upgrade for 15 designs on Pro, or unlock every template and custom themes on Business." },
  { icon: "📄", title: "Styled PDF & Word", text: "Download your CV with the exact template design you preview on screen." },
  { icon: "📤", title: "Upload & Import", text: "Bring your existing resume (PDF/Word) or add a professional profile photo." },
  { icon: "🎯", title: "ATS-Friendly", text: "Clean structure, categorized skills, and formatted certifications & languages." },
  { icon: "🔒", title: "Your Workspace", text: "Sign in to save multiple CVs and continue building anytime." },
];

const STEPS = [
  { n: "01", title: "Sign up free", text: "Create your account in seconds." },
  { n: "02", title: "Chat with AI", text: "Share your experience or upload an existing CV." },
  { n: "03", title: "Download", text: "Export a polished PDF or Word file." },
];

const TEMPLATES = [
  { id: "professional", name: "Professional", color: "#1d4ed8" },
  { id: "modern", name: "Modern Sidebar", color: "#0f766e" },
  { id: "executive", name: "Executive", color: "#0f2744" },
  { id: "minimal", name: "Minimal", color: "#475569" },
  { id: "fresh_graduate", name: "Fresh Graduate", color: "#7c3aed" },
  { id: "creative", name: "Creative", color: "#ec4899" },
  { id: "tech", name: "Tech", color: "#0f172a" },
  { id: "elegant", name: "Elegant", color: "#c9a227" },
  { id: "corporate", name: "Corporate", color: "#1e3a5f" },
  { id: "startup", name: "Startup", color: "#6366f1" },
  { id: "academic", name: "Academic", color: "#7f1d1d" },
  { id: "international", name: "International", color: "#0369a1" },
  { id: "portfolio", name: "Portfolio", color: "#db2777" },
  { id: "simple", name: "Simple", color: "#334155" },
  { id: "bold", name: "Bold", color: "#b91c1c" },
  { id: "slate", name: "Slate", color: "#475569" },
  { id: "nordic", name: "Nordic", color: "#0ea5e9" },
  { id: "metro", name: "Metro", color: "#0f172a" },
  { id: "luxe", name: "Luxe", color: "#111827" },
  { id: "horizon", name: "Horizon", color: "#0284c7" },
  { id: "atlas", name: "Atlas", color: "#1e40af" },
  { id: "prism", name: "Prism", color: "#4f46e5" },
  { id: "summit", name: "Summit", color: "#047857" },
  { id: "nova", name: "Nova", color: "#7c3aed" },
  { id: "apex", name: "Apex", color: "#1f2937" },
];

const TESTIMONIALS = [
  { quote: "I built a complete CV in 10 minutes. The chat felt like talking to a career coach.", name: "Sara A.", role: "Software Engineer" },
  { quote: "Uploaded my old PDF and the AI restructured everything beautifully.", name: "Hassan R.", role: "Product Manager" },
  { quote: "Template switch via chat is genius — Modern sidebar looked perfect for my profile.", name: "Ayesha K.", role: "Data Analyst" },
];

const FAQ = [
  { q: "Is BuzzCVPilot free to start?", a: "Yes — the Basic plan is free forever. Build your first CV and try AI chat with no credit card." },
  { q: "How does billing work?", a: "Pro and Business are billed monthly or yearly. Cancel anytime from your account." },
  { q: "What is the difference between plans?", a: "Basic includes 1 CV and a default template. Pro unlocks up to 10 CVs and 15 templates. Business unlocks unlimited CVs, all templates, and custom themes." },
  { q: "Can I upload my existing resume?", a: "Yes. Upload PDF, Word, or TXT and AI will import your content. Available on Pro and Business." },
  { q: "Will the PDF match the preview?", a: "Yes — PDF export uses your live preview design exactly as shown on screen." },
  { q: "Is my payment information secure?", a: "Yes — payments are processed securely. We never see or store your card details." },
  { q: "Does AI invent fake experience?", a: "No — we only improve and structure information you provide. Missing sections get suggestions, not fake data." },
];

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div className={`landing-faq-item ${open ? "is-open" : ""}`}>
      <button type="button" className="landing-faq-q" onClick={onToggle}>
        <span>{q}</span>
        <span className="landing-faq-icon" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div className="landing-faq-a">
        <div className="landing-faq-a-inner">
          <p>{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);
  const finishLoad = useCallback(() => setLoading(false), []);

  return (
    <>
      {loading && <LandingLoader onDone={finishLoad} />}

      <AppLayout>
        <div className={`landing ${loading ? "landing--hidden" : "landing--ready"}`}>
          <div className="landing-bg" aria-hidden="true">
            <div className="landing-blob landing-blob--1" />
            <div className="landing-blob landing-blob--2" />
            <div className="landing-blob landing-blob--3" />
          </div>

          <header className="landing-hero">
          <div className="landing-hero-content">
            <p className="landing-eyebrow landing-animate landing-animate--2">
              <span className="landing-eyebrow-dot" /> AI CV Builder · Professional & Modern
            </p>
            <h1 className="landing-animate landing-animate--3">
              Build a standout CV
              <span className="landing-gradient-text"> in minutes</span>
            </h1>
            <p className="landing-hero-sub landing-animate landing-animate--4">
              Chat with AI to create a polished, ATS-friendly resume. Upload your existing CV,
              add your photo, and download PDF or Word — all in one place.
            </p>
            <div className="landing-hero-cta landing-animate landing-animate--5">
              <Link to="/signup" className="btn btn-primary btn-lg landing-btn-glow">Start building — it&apos;s free</Link>
              <Link to="/login" className="btn btn-lg landing-btn-outline">I already have an account</Link>
            </div>
            <div className="landing-hero-stats landing-animate landing-animate--6">
              <div><strong>AI</strong><span>Chat builder</span></div>
              <div><strong>PDF</strong><span>& Word export</span></div>
              <div><strong>Free</strong><span>Basic plan</span></div>
            </div>
          </div>

          <div className="landing-hero-visual landing-animate landing-animate--7" aria-hidden="true">
            <div className="landing-mock-glow" />
            <div className="landing-mock-card landing-mock-card--back" />
            <div className="landing-mock-card landing-mock-card--front landing-mock-float">
              <div className="landing-mock-badge">Live preview</div>
              <div className="landing-mock-header">
                <div className="landing-mock-avatar landing-shimmer" />
                <div>
                  <div className="landing-mock-line landing-mock-line--lg landing-shimmer" />
                  <div className="landing-mock-line landing-mock-line--sm landing-shimmer" />
                </div>
              </div>
              <div className="landing-mock-section">
                <div className="landing-mock-line landing-mock-line--title landing-shimmer" />
                <div className="landing-mock-line landing-shimmer" />
                <div className="landing-mock-line landing-shimmer" />
                <div className="landing-mock-line landing-mock-line--short landing-shimmer" />
              </div>
              <div className="landing-mock-tags">
                <span>Python</span><span>React</span><span>AWS</span>
              </div>
            </div>
          </div>
        </header>

        {/* Marquee trust strip */}
        <div className="landing-marquee-wrap">
          <div className="landing-marquee">
            {[...TEMPLATES, ...TEMPLATES].map((t, i) => (
              <span key={`${t.id}-${i}`} className="landing-marquee-item">
                <i style={{ background: t.color }} />
                {t.name}
              </span>
            ))}
          </div>
        </div>

        <Reveal className="landing-section">
          <h2>Everything you need for a professional CV</h2>
          <p className="landing-section-sub">No design skills needed — AI and beautiful templates do the work.</p>
          <div className="landing-features">
            {FEATURES.map((f, i) => (
              <article key={f.title} className="landing-feature-card" style={{ "--card-i": i }}>
                <span className="landing-feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </Reveal>

        {/* Template showcase */}
        <Reveal className="landing-section landing-templates-section">
          <div className="landing-templates-inner">
            <h2>Pick a design that fits your role</h2>
            <p className="landing-section-sub">
              {TEMPLATES.length} professional layouts — Pro unlocks 15, Business unlocks every design and custom themes.
            </p>
            <div className="landing-template-grid">
              {TEMPLATES.map((t) => (
                <div key={t.id} className="landing-template-card">
                  <div className="landing-template-preview" style={{ "--tpl-color": t.color }}>
                    <div className="landing-template-preview-bar" />
                    <div className="landing-template-preview-lines">
                      <span /><span /><span />
                    </div>
                  </div>
                  <span>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <PricingSection />

        <section className="landing-section landing-section--dark">
          <Reveal>
            <h2>How it works</h2>
            <p className="landing-section-sub">Three simple steps to your dream job application.</p>
          </Reveal>
          <div className="landing-steps">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} className="landing-step" delay={i * 120} as="div">
                <span className="landing-step-num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <Reveal className="landing-section landing-testimonials">
          <h2>Loved by job seekers</h2>
          <p className="landing-section-sub">Real stories from people who built their CV with AI.</p>
          <div className="landing-testimonial-grid">
            {TESTIMONIALS.map((t, i) => (
              <blockquote key={t.name} className="landing-testimonial-card" style={{ "--card-i": i }}>
                <p>&ldquo;{t.quote}&rdquo;</p>
                <footer>
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </Reveal>

        {/* FAQ */}
        <Reveal className="landing-section landing-faq-section" id="faq">
          <h2>FAQ</h2>
          <p className="landing-section-sub">Answers to common questions about plans, billing, and AI.</p>
          <div className="landing-faq-list">
            {FAQ.map((item, i) => (
              <FaqItem
                key={item.q}
                q={item.q}
                a={item.a}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
              />
            ))}
          </div>
        </Reveal>

        <Reveal className="landing-cta-band">
          <div className="landing-cta-card">
            <h2>Ready to land your next role?</h2>
            <p>Create your professional CV today — free to start, no credit card required.</p>
            <Link to="/signup" className="btn btn-primary btn-lg landing-btn-glow">Create free account</Link>
          </div>
        </Reveal>
        </div>
      </AppLayout>
    </>
  );
}
