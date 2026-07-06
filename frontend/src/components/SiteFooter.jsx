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
              AI-powered resume builder — professional CVs in minutes.
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
                  <Link to="/contact">Contact us</Link>
                </div>
              </>
            ) : (
              <>
                <div className="site-footer-col">
                  <span className="site-footer-col-title">Product</span>
                  <Link to="/">Home</Link>
                  <Link to={{ pathname: "/", hash: "#pricing" }}>Pricing</Link>
                  <Link to={{ pathname: "/", hash: "#faq" }}>FAQ</Link>
                  <Link to="/contact">Contact us</Link>
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
            © {year} BuzzCVPilot. All rights reserved.
          </p>
          <p className="site-footer-meta">
            Secure payments · Your data stays private
          </p>
        </div>
      </div>
    </footer>
  );
}
