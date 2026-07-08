import { Link } from "react-router-dom";
import AppLayout from "../../components/AppLayout";
import PricingSection from "../../components/PricingSection";
import useSeo from "../../hooks/useSeo";
import { PAGE_SEO } from "../../config/seo";

export default function Pricing() {
  useSeo(PAGE_SEO.pricing);

  return (
    <AppLayout mainClassName="site-main--app">
      <div className="marketing-page">
        <header className="marketing-hero">
          <h1>Pricing</h1>
          <p className="marketing-hero-tagline">Simple plans for every job seeker.</p>
          <p className="marketing-hero-intro">
            Start free with up to 5 CVs and AI chat. Upgrade to Pro for more CVs and
            professional templates, or Business for unlimited CVs and every design.
            Cancel anytime.
          </p>
        </header>

        <PricingSection />

        <section className="marketing-cta-band">
          <h2>Not sure which plan to pick?</h2>
          <p>Start free — you can upgrade later from your account at any time.</p>
          <div className="marketing-hero-cta">
            <Link to="/signup" className="btn btn-primary btn-lg">Get started free</Link>
            <Link to="/contact" className="btn btn-lg landing-btn-outline">Contact sales</Link>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
