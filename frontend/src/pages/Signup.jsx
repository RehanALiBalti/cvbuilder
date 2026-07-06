import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import AuthForm from "../components/AuthForm";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup, isAuthenticated, loading: authLoading, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  if (!isFirebaseConfigured) {
    return (
      <AppLayout mainClassName="site-main--app">
        <div className="auth-page" style={{ placeItems: "center", padding: 48, minHeight: "50vh" }}>
          <div className="auth-form-wrap" style={{ textAlign: "center" }}>
            <h2>Sign-up unavailable</h2>
            <p className="muted">Authentication is not available right now. Please try again later.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Back to home</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (authLoading) {
    return (
      <AppLayout mainClassName="site-main--app">
        <div className="auth-loading">
          <div className="auth-loading-spinner" />
          <p>Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/builder" replace />;
  }

  async function handleSubmit({ name, email, password }) {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await signup(name, email, password);
      setSuccess("Account created! Redirecting…");
      setTimeout(() => navigate("/builder", { replace: true }), 700);
    } catch (err) {
      setError(err.message || "Signup failed");
      setLoading(false);
    }
  }

  return (
    <AppLayout mainClassName="site-main--auth">
      <AuthLayout
        title="Start for free"
        subtitle="Every account starts on the free plan. Upgrade to Pro anytime from your dashboard."
        perks={["Basic plan included free", "5 CVs to get started", "Secure account & private workspace"]}
      >
        <AuthForm mode="signup" onSubmit={handleSubmit} loading={loading} error={error} success={success} />
      </AuthLayout>
    </AppLayout>
  );
}
