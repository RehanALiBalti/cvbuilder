import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createCheckoutSession } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PRICING_PLANS, yearlySavingsPct } from "../config/pricing";

function PlanBadge({ plan }) {
  return (
    <span className={`plan-badge plan-badge--${plan || "starter"}`}>
      {plan === "pro" ? "Pro" : plan === "business" ? "Business" : "Free"}
    </span>
  );
}

export default function Account() {
  const {
    user,
    profile,
    plan,
    planLabel,
    refreshProfile,
    logout,
    updateProfileInfo,
    changePassword,
  } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  useEffect(() => {
    if (params.get("checkout") === "success") {
      setToast("Payment successful! Your plan is being updated…");
      refreshProfile();
    }
  }, [params, refreshProfile]);

  useEffect(() => {
    setProfileName(user?.name || "");
  }, [user?.name]);

  async function handleUpgrade(planId) {
    if (planId === plan) return;
    setError("");
    setLoadingPlan(planId);
    try {
      const { url } = await createCheckoutSession(planId, annual ? "yearly" : "monthly");
      window.location.href = url;
    } catch (err) {
      setError(err.message || "Checkout failed");
      setLoadingPlan(null);
    }
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setError("");
    setToast("");
    setProfileSaving(true);
    try {
      await updateProfileInfo({ name: profileName });
      setToast("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Could not update profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError("");
    setToast("");
    if (passwords.next !== passwords.confirm) {
      setError("New password and confirm password do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      setToast("Password changed successfully.");
    } catch (err) {
      setError(err.message || "Could not change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="cv-app account-page">
      <header className="cv-header-bar">
        <div className="brand">
          <div className="brand-mark">CV</div>
          <div>
            <h1>Account & Billing</h1>
            <p className="muted">{user?.email}</p>
          </div>
        </div>
        <div className="header-actions">
          <Link to="/builder" className="btn btn-ghost">← Back to builder</Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      {toast && <div className="account-toast">{toast}</div>}
      {error && <div className="auth-error">{error}</div>}

      <section className="panel account-header">
        <div>
          <h2>{user?.name}</h2>
          <p className="muted">Manage your subscription and usage</p>
        </div>
        <PlanBadge plan={plan} />
      </section>

      <div className="account-usage">
        <div className="account-usage-card">
          <strong>{planLabel}</strong>
          <span className="muted">Current plan</span>
        </div>
        <div className="account-usage-card">
          <strong>{profile?.ai_messages_used ?? 0}</strong>
          <span className="muted">AI messages this month</span>
        </div>
        <div className="account-usage-card">
          <strong>{profile?.max_cvs ?? 1}</strong>
          <span className="muted">CV limit</span>
        </div>
      </div>

      <div className="account-settings-grid">
        <section className="panel account-settings-card">
          <div className="account-section-title">
            <h2>Edit profile</h2>
            <p className="muted">Update the name shown in your account and builder.</p>
          </div>
          <form className="account-form" onSubmit={handleProfileSubmit}>
            <label>
              <span>Full name</span>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your name"
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={user?.email || ""} disabled />
              <small>Email is managed by Firebase Auth. Use password reset if you cannot access it.</small>
            </label>
            <button type="submit" className="btn btn-primary" disabled={profileSaving}>
              {profileSaving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </section>

        <section className="panel account-settings-card">
          <div className="account-section-title">
            <h2>Change password</h2>
            <p className="muted">For security, enter your current password first.</p>
          </div>
          <form className="account-form" onSubmit={handlePasswordSubmit}>
            <label>
              <span>Current password</span>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                autoComplete="current-password"
                required
              />
            </label>
            <label>
              <span>New password</span>
              <input
                type="password"
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            <label>
              <span>Confirm new password</span>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
              {passwordSaving ? "Updating…" : "Change password"}
            </button>
          </form>
        </section>
      </div>

      <section className="panel">
        <h2>Upgrade your plan</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Secure payments via Stripe. Cancel anytime.
        </p>

        <div className="landing-pricing-toggle-wrap">
          <div className="landing-pricing-toggle" role="group" aria-label="Billing period">
            <button type="button" className={!annual ? "is-active" : ""} onClick={() => setAnnual(false)}>Monthly</button>
            <button type="button" className={annual ? "is-active" : ""} onClick={() => setAnnual(true)}>
              Yearly <span className="landing-pricing-save">Save</span>
            </button>
          </div>
        </div>

        <div className="account-pricing-grid">
          {PRICING_PLANS.map((p) => {
            const price = annual ? p.yearlyPrice : p.monthlyPrice;
            const isCurrent = p.id === plan;
            const savings = yearlySavingsPct(p);
            return (
              <article
                key={p.id}
                className={`account-plan-card ${p.highlighted ? "account-plan-card--featured" : ""} ${isCurrent ? "account-plan-card--current" : ""}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>{p.name}</h3>
                  {isCurrent && <span className="plan-badge plan-badge--pro">Current</span>}
                </div>
                <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>{p.description}</p>
                <div>
                  <strong style={{ fontSize: "1.8rem" }}>
                    {p.monthlyPrice === 0 ? "Free" : `$${annual ? Math.round(price / 12) : price}`}
                  </strong>
                  {p.monthlyPrice > 0 && <span className="muted"> /mo</span>}
                  {annual && savings > 0 && p.yearlyPrice > 0 && (
                    <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.8rem" }}>
                      Billed ${price}/year · save {savings}%
                    </p>
                  )}
                </div>
                <ul>
                  {p.features.slice(0, 5).map((f) => <li key={f}>{f}</li>)}
                </ul>
                {p.id === "starter" ? (
                  <button type="button" className="btn btn-block" disabled={isCurrent}>
                    {isCurrent ? "Your current plan" : "Free tier"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`btn btn-block ${p.highlighted ? "btn-primary" : ""}`}
                    disabled={isCurrent || loadingPlan === p.id}
                    onClick={() => handleUpgrade(p.id)}
                  >
                    {loadingPlan === p.id ? "Redirecting…" : isCurrent ? "Current plan" : `Upgrade to ${p.name}`}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
