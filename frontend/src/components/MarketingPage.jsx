import { Link } from "react-router-dom";
import AppLayout from "./AppLayout";
import useSeo from "../hooks/useSeo";

/**
 * Reusable public, SEO-friendly marketing page.
 * Renders real crawlable content (H1/H2, paragraphs, lists) inside the shared
 * site header/footer, plus per-page metadata and a CTA back to the builder.
 */
export default function MarketingPage({
  seo,
  h1,
  tagline,
  intro,
  sections = [],
  primaryCta = { to: "/signup", label: "Create My CV" },
  secondaryCta = { to: "/cv-templates", label: "View Templates" },
  jsonLd,
  children,
}) {
  useSeo({ ...seo, jsonLd });

  return (
    <AppLayout mainClassName="site-main--app">
      <div className="marketing-page">
        <header className="marketing-hero">
          <h1>{h1}</h1>
          {tagline && <p className="marketing-hero-tagline">{tagline}</p>}
          {intro && <p className="marketing-hero-intro">{intro}</p>}
          <div className="marketing-hero-cta">
            {primaryCta && (
              <Link to={primaryCta.to} className="btn btn-primary btn-lg">
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link to={secondaryCta.to} className="btn btn-lg landing-btn-outline">
                {secondaryCta.label}
              </Link>
            )}
          </div>
        </header>

        {sections.map((section) => (
          <section key={section.h2} className="marketing-section">
            <h2>{section.h2}</h2>
            {section.body?.map((p, i) => (
              <p key={i} className="marketing-text">{p}</p>
            ))}
            {section.list && (
              <ul className="marketing-list">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {children}

        <section className="marketing-cta-band">
          <h2>Ready to build your CV?</h2>
          <p>Start free — no credit card required. Create an ATS-friendly CV with AI in minutes.</p>
          <div className="marketing-hero-cta">
            <Link to="/signup" className="btn btn-primary btn-lg">Create My CV</Link>
            <Link to="/pricing" className="btn btn-lg landing-btn-outline">See pricing</Link>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
