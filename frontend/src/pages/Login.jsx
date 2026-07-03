import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, isAuthenticated, loading: authLoading, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/builder";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isFirebaseConfigured) {
    return (
      <div className="auth-page" style={{ placeItems: "center", padding: 48 }}>
        <div className="auth-form-wrap" style={{ textAlign: "center" }}>
          <h2>Firebase not configured</h2>
          <p className="muted">Set VITE_FIREBASE_* environment variables to enable login.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Back to home</Link>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/builder" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel auth-panel--brand">
        <Link to="/" className="landing-logo landing-logo--light">
          <span className="landing-logo-mark">CV</span>
          <span>ResumeAI</span>
        </Link>
        <h1>Welcome back</h1>
        <p>Sign in to continue building and downloading your professional CVs.</p>
        <ul className="auth-perks">
          <li>13 professional templates</li>
          <li>AI chat CV builder</li>
          <li>PDF & Word export</li>
        </ul>
      </div>

      <div className="auth-panel auth-panel--form">
        <div className="auth-form-wrap">
          <h2>Log in</h2>
          <p className="auth-switch">
            Don&apos;t have an account? <Link to="/signup">Sign up free</Link>
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Signing in…" : "Log in"}
            </button>
          </form>

          <p className="auth-note muted">Secure sign-in powered by Firebase Authentication.</p>
        </div>
      </div>
    </div>
  );
}
