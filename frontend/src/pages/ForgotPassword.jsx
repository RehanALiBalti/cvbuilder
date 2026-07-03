import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

export default function ForgotPassword() {
  const { sendPasswordReset, isFirebaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isFirebaseConfigured) {
    return (
      <div className="auth-page" style={{ placeItems: "center", padding: 48 }}>
        <div className="auth-form-wrap" style={{ textAlign: "center" }}>
          <h2>Firebase not configured</h2>
          <p className="muted">Set VITE_FIREBASE_* in frontend/.env.production and rebuild.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Back to home</Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccess("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(err.message || "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email and we will send a secure reset link."
      perks={["Firebase secure reset email", "No admin required", "Back to builder after login"]}
    >
      <div className="auth-form-wrap auth-form-animated">
        <h2>Forgot password</h2>
        <p className="auth-switch">
          Remembered it? <Link to="/login">Log in</Link>
        </p>

        {error && (
          <div className="auth-error auth-error--animated" role="alert">
            <span className="auth-error-icon">!</span>
            {error}
          </div>
        )}
        {success && (
          <div className="auth-success auth-success--animated" role="status">
            <span className="auth-success-check">✓</span>
            {success}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <button
            type="submit"
            className={`btn btn-primary btn-block auth-submit ${loading ? "auth-submit--loading" : ""}`}
            disabled={loading}
          >
            {loading && <span className="auth-submit-spinner" aria-hidden="true" />}
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
