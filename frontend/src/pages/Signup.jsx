import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup, isAuthenticated, loading: authLoading, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isFirebaseConfigured) {
    return (
      <div className="auth-page" style={{ placeItems: "center", padding: 48 }}>
        <div className="auth-form-wrap" style={{ textAlign: "center" }}>
          <h2>Firebase not configured</h2>
          <p className="muted">Set VITE_FIREBASE_* environment variables to enable signup.</p>
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
      await signup(name, email, password);
      navigate("/builder", { replace: true });
    } catch (err) {
      setError(err.message || "Signup failed");
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
        <h1>Start for free</h1>
        <p>Create your account and build a professional CV with AI in minutes.</p>
        <ul className="auth-perks">
          <li>Random template on start</li>
          <li>Upload existing resume</li>
          <li>Profile photo support</li>
        </ul>
      </div>

      <div className="auth-panel auth-panel--form">
        <div className="auth-form-wrap">
          <h2>Create account</h2>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}
            <label>
              Full name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ali Khan"
                required
                autoComplete="name"
              />
            </label>
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
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Creating account…" : "Sign up & build CV"}
            </button>
          </form>

          <p className="auth-note muted">Your account and CVs are stored securely in Firebase.</p>
        </div>
      </div>
    </div>
  );
}
