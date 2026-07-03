import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SiteHeader({ actions }) {
  const { isAuthenticated, logout, plan, planLabel, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="landing-logo">
          <span className="landing-logo-mark">CV</span>
          <span>ResumeAI</span>
        </Link>

        <nav className="site-header-nav" aria-label="Main">
          <Link to={{ pathname: "/", hash: "#pricing" }}>Pricing</Link>
          <Link to={{ pathname: "/", hash: "#faq" }}>FAQ</Link>
          {isAuthenticated && (
            <Link to="/builder" className={pathname === "/builder" ? "is-active" : ""}>Builder</Link>
          )}
          {isAuthenticated && (
            <Link to="/builder/account" className={pathname.startsWith("/builder/account") ? "is-active" : ""}>
              Account
            </Link>
          )}
        </nav>

        <div className="site-header-actions">
          {actions}
          {isAuthenticated ? (
            <>
              {user?.name && (
                <span className="site-header-user" title={user.email}>
                  {user.name.split(" ")[0]}
                </span>
              )}
              <span className={`plan-badge plan-badge--${plan || "starter"}`}>{planLabel}</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/signup" className="btn btn-primary btn-sm landing-btn-glow">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
