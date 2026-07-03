import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

function passwordStrength(password) {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Excellent"];
  return { score, label: labels[score] || "" };
}

export default function AuthForm({
  mode,
  onSubmit,
  loading,
  error,
  success,
}) {
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [shake, setShake] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  function validate() {
    const errs = {};
    if (isSignup && !name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "At least 6 characters";
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ name: name.trim(), email: email.trim(), password });
  }

  return (
    <div className={`auth-form-wrap auth-form-animated ${shake ? "auth-form--shake" : ""} ${success ? "auth-form--success" : ""}`}>
      <h2>{isSignup ? "Create account" : "Log in"}</h2>
      <p className="auth-switch">
        {isSignup ? (
          <>Already have an account? <Link to="/login">Log in</Link></>
        ) : (
          <>Don&apos;t have an account? <Link to="/signup">Sign up free</Link></>
        )}
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

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {isSignup && (
          <label className={`auth-field ${fieldErrors.name ? "auth-field--error" : ""}`}>
            <span>Full name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: "" })); }}
              placeholder="Ali Khan"
              autoComplete="name"
              disabled={loading || success}
            />
            {fieldErrors.name && <em className="auth-field-error">{fieldErrors.name}</em>}
          </label>
        )}

        <label className={`auth-field ${fieldErrors.email ? "auth-field--error" : ""}`}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); }}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading || success}
          />
          {fieldErrors.email && <em className="auth-field-error">{fieldErrors.email}</em>}
        </label>

        <label className={`auth-field ${fieldErrors.password ? "auth-field--error" : ""}`}>
          <span>Password</span>
          <div className="auth-password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: "" })); }}
              placeholder={isSignup ? "At least 6 characters" : "••••••••"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              disabled={loading || success}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {fieldErrors.password && <em className="auth-field-error">{fieldErrors.password}</em>}
          {isSignup && password && (
            <div className="auth-password-strength">
              <div className="auth-password-bars">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={i <= strength.score ? `on s${strength.score}` : ""} />
                ))}
              </div>
              <small>{strength.label}</small>
            </div>
          )}
        </label>

        <button
          type="submit"
          className={`btn btn-primary btn-block auth-submit ${loading ? "auth-submit--loading" : ""}`}
          disabled={loading || success}
        >
          {loading && <span className="auth-submit-spinner" aria-hidden="true" />}
          {success ? "Success!" : loading
            ? (isSignup ? "Creating account…" : "Signing in…")
            : (isSignup ? "Sign up & build CV" : "Log in")}
        </button>
      </form>

      <p className="auth-note muted">
        {isSignup
          ? "Free plan by default · upgrade anytime inside your account."
          : "Secure sign-in powered by Firebase Authentication."}
      </p>
    </div>
  );
}
