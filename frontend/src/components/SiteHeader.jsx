import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../context/AuthContext";

export default function SiteHeader({ actions }) {
  const { isAuthenticated, logout, plan, planLabel, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("buzzcvpilot-theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", dark);
    localStorage.setItem("buzzcvpilot-theme", dark ? "dark" : "light");
  }, [dark]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  const onBuilderApp = pathname === "/builder" || pathname.startsWith("/builder/");

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <BrandLogo to={isAuthenticated ? "/builder" : "/"} />

        <div className={`site-header-actions ${onBuilderApp ? "site-header-actions--grow" : ""}`}>
          {actions}
          <button
            type="button"
            className="btn btn-sm btn-ghost theme-toggle"
            onClick={() => setDark((v) => !v)}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? "Light" : "Dark"}
          </button>
          {isAuthenticated ? (
            <>
              <Link to="/builder/account" className="site-header-profile" title={user?.email || "Account"}>
                <span className="site-header-avatar" aria-hidden="true">{initial}</span>
                <span className={`plan-badge plan-badge--${plan || "starter"}`}>{planLabel}</span>
              </Link>
              <button type="button" className="btn btn-sm btn-ghost site-header-logout" onClick={handleLogout}>
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
