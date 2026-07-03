import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, isAuthenticated, loading: authLoading, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/builder";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

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

  async function handleSubmit({ email, password }) {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await login(email, password);
      setSuccess("Welcome back! Redirecting…");
      setTimeout(() => navigate(from, { replace: true }), 600);
    } catch (err) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue building and downloading your professional CVs."
      perks={["Your own CV workspace", "Saved chat history per CV", "Free plan · upgrade inside app"]}
    >
      <AuthForm mode="login" onSubmit={handleSubmit} loading={loading} error={error} success={success} />
      <p className="auth-forgot-link">
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
    </AuthLayout>
  );
}
