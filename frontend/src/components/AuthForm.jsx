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
  onGoogleSignIn,
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

      {typeof onGoogleSignIn === "function" && (
        <>
          <button
            type="button"
            className="btn btn-block auth-google-btn"
            onClick={onGoogleSignIn}
            disabled={loading || success}
          >
            <svg className="auth-google-icon" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.5 6.6l.1.1 6.2 5.2C36.9 41.1 44 36 44 24c0-1.3-.1-2.5-.4-3.5z" />
            </svg>
            Continue with Google
          </button>
          <div className="auth-divider" role="separator">
            <span>or</span>
          </div>
        </>
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
          ? "Basic plan by default · upgrade anytime inside your account."
          : "Your account is protected with secure sign-in."}
      </p>
    </div>
  );
}
