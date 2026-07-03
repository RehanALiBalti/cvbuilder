import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link to="/" className="landing-logo">
            <span className="landing-logo-mark">CV</span>
            <span>ResumeAI</span>
          </Link>
          <p className="site-footer-tagline">AI-powered professional CV builder</p>
        </div>

        <nav className="site-footer-nav" aria-label="Footer">
          <Link to={{ pathname: "/", hash: "#pricing" }}>Pricing</Link>
          <Link to={{ pathname: "/", hash: "#faq" }}>FAQ</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
        </nav>

        <p className="site-footer-copy muted">
          © {new Date().getFullYear()} ResumeAI · All rights reserved
        </p>
      </div>
    </footer>
  );
}
