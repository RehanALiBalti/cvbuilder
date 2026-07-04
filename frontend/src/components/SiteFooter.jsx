import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SiteFooter() {
  const { isAuthenticated } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <div className="site-footer-brand">
            <Link to={isAuthenticated ? "/builder" : "/"} className="landing-logo">
              <span className="landing-logo-mark">CV</span>
              <span>ResumeAI</span>
            </Link>
            <p className="site-footer-tagline">
              Build standout, ATS-friendly CVs with AI — professional results in minutes.
            </p>
          </div>

          <nav className="site-footer-nav" aria-label="Footer">
            {isAuthenticated ? (
              <>
                <div className="site-footer-col">
                  <span className="site-footer-col-title">Workspace</span>
                  <Link to="/builder">My CVs</Link>
                  <Link to="/builder/account">Account</Link>
                  <Link to="/builder/account">Billing</Link>
                </div>
                <div className="site-footer-col">
                  <span className="site-footer-col-title">Product</span>
                  <Link to="/">Home</Link>
                  <Link to="/builder">Builder</Link>
                </div>
              </>
            ) : (
              <>
                <div className="site-footer-col">
                  <span className="site-footer-col-title">Product</span>
                  <Link to="/">Home</Link>
                  <Link to={{ pathname: "/", hash: "#pricing" }}>Pricing</Link>
                  <Link to={{ pathname: "/", hash: "#faq" }}>FAQ</Link>
                </div>
                <div className="site-footer-col">
                  <span className="site-footer-col-title">Get started</span>
                  <Link to="/login">Log in</Link>
                  <Link to="/signup">Sign up</Link>
                </div>
              </>
            )}
          </nav>
        </div>

        <div className="site-footer-bottom">
          <p className="site-footer-copy">
            © {year} ResumeAI. All rights reserved.
          </p>
          <p className="site-footer-meta">
            Secure payments by Stripe · Your data stays private
          </p>
        </div>
      </div>
    </footer>
  );
}
