import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../context/AuthContext";

export default function SiteFooter() {
  const { isAuthenticated } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <div className="site-footer-brand">
            <BrandLogo
              to={isAuthenticated ? "/builder" : "/"}
              variant="white"
              className="brand-logo--footer"
            />
            <p className="site-footer-tagline">
              AI-powered CV &amp; resume builder — professional, ATS-friendly CVs in minutes.
            </p>
            <ul className="site-footer-trust" aria-label="Trust">
              <li>Secure payments</li>
              <li>Privacy-focused</li>
              <li>ATS-friendly CVs</li>
            </ul>
          </div>

          <nav className="site-footer-nav" aria-label="Footer">
            <div className="site-footer-col">
              <span className="site-footer-col-title">Product</span>
              <Link to="/ai-cv-builder">AI CV Builder</Link>
              <Link to="/resume-builder">Resume Builder</Link>
              <Link to="/cv-templates">CV Templates</Link>
              <Link to="/ats-cv-builder">ATS CV Builder</Link>
              <Link to="/pricing">Pricing</Link>
            </div>

            <div className="site-footer-col">
              <span className="site-footer-col-title">Company</span>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
              {isAuthenticated ? (
                <Link to="/builder">My CVs</Link>
              ) : (
                <Link to="/signup">Get started</Link>
              )}
            </div>

            <div className="site-footer-col">
              <span className="site-footer-col-title">Legal</span>
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>
              <Link to="/refund-policy">Refund Policy</Link>
            </div>
          </nav>
        </div>

        <div className="site-footer-bottom">
          <p className="site-footer-copy">
            © {year} BuzzCVPilot. All rights reserved.
          </p>
          <p className="site-footer-meta">
            Powered by Buzzware Tech · Secure payments · Your data stays private
          </p>
        </div>
      </div>
    </footer>
  );
}
