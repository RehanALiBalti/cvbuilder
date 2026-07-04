import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { createCheckoutSession } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatCvLimit, PRICING_PLANS, yearlySavingsPct } from "../config/pricing";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "security", label: "Security", icon: "🔒" },
  { id: "billing", label: "Billing", icon: "💳" },
];

function PlanBadge({ plan, large }) {
  return (
    <span className={`plan-badge plan-badge--${plan || "starter"} ${large ? "plan-badge--lg" : ""}`}>
      {plan === "pro" ? "Pro" : plan === "business" ? "Business" : "Basic"}
    </span>
  );
}

function UserAvatar({ name }) {
  const initial = (name || "U").charAt(0).toUpperCase();
  return <div className="account-avatar" aria-hidden="true">{initial}</div>;
}

export default function Account() {
  const {
    user,
    profile,
    plan,
    planLabel,
    refreshProfile,
    updateProfileInfo,
    changePassword,
  } = useAuth();
  const [params] = useSearchParams();
  const [activeSection, setActiveSection] = useState("profile");
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });

  const aiUsed = profile?.ai_messages_used ?? 0;
  const aiLimit = profile?.ai_messages_limit ?? 50;
  const aiPct = Math.min(100, Math.round((aiUsed / aiLimit) * 100));

  useEffect(() => {
    if (params.get("checkout") === "success") {
      setToast("Payment successful! Your plan is being updated.");
      setActiveSection("billing");
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

  return (
    <AppLayout mainClassName="site-main--app">
      <div className="account-shell">
        {/* Profile hero */}
        <div className="account-hero">
          <UserAvatar name={user?.name} />
          <div className="account-hero-info">
            <h1>{user?.name || "Your Account"}</h1>
            <p>{user?.email}</p>
          </div>
          <PlanBadge plan={plan} large />
        </div>

        {/* Alerts */}
        {toast && (
          <div className="account-alert account-alert--success" role="status">
            <span>✓</span> {toast}
          </div>
        )}
        {error && (
          <div className="account-alert account-alert--error" role="alert">
            <span>!</span> {error}
          </div>
        )}

        {/* Usage stats */}
        <div className="account-stats">
          <div className="account-stat">
            <span className="account-stat-label">Current plan</span>
            <strong>{planLabel}</strong>
          </div>
          <div className="account-stat">
            <span className="account-stat-label">CV limit</span>
            <strong>{formatCvLimit(profile?.max_cvs, plan)}</strong>
          </div>
          <div className="account-stat account-stat--wide">
            <div className="account-stat-row">
              <span className="account-stat-label">AI messages this month</span>
              <strong>{aiUsed} / {aiLimit}</strong>
            </div>
            <div className="account-progress">
              <div className="account-progress-fill" style={{ width: `${aiPct}%` }} />
            </div>
          </div>
        </div>

        <div className="account-body">
          {/* Sidebar nav */}
          <nav className="account-nav" aria-label="Account sections">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`account-nav-item ${activeSection === s.id ? "is-active" : ""}`}
                onClick={() => { setActiveSection(s.id); setError(""); }}
              >
                <span className="account-nav-icon" aria-hidden="true">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </nav>

          {/* Content panels */}
          <div className="account-content">
            {activeSection === "profile" && (
              <section className="account-card">
                <div className="account-card-head">
                  <h2>Profile information</h2>
                  <p>Update your display name shown across the app.</p>
                </div>
                <form className="account-form" onSubmit={handleProfileSubmit}>
                  <div className="account-form-row">
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
                      <span>Email address</span>
                      <input type="email" value={user?.email || ""} disabled />
                    </label>
                  </div>
                  <p className="account-form-hint">
                    Email cannot be changed here.
                    {" "}<Link to="/forgot-password">Reset password via email</Link>
                  </p>
                  <div className="account-form-actions">
                    <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                      {profileSaving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {activeSection === "security" && (
              <section className="account-card">
                <div className="account-card-head">
                  <h2>Password & security</h2>
                  <p>Keep your account secure with a strong password.</p>
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
                  <div className="account-form-row">
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
                  </div>
                  <div className="account-form-actions">
                    <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                      {passwordSaving ? "Updating…" : "Update password"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {activeSection === "billing" && (
              <section className="account-card">
                <div className="account-card-head">
                  <h2>Subscription & billing</h2>
                  <p>Manage your plan and subscription billing.</p>
                </div>

                <div className="account-billing-toggle">
                  <div className="landing-pricing-toggle" role="group" aria-label="Billing period">
                    <button type="button" className={!annual ? "is-active" : ""} onClick={() => setAnnual(false)}>
                      Monthly
                    </button>
                    <button type="button" className={annual ? "is-active" : ""} onClick={() => setAnnual(true)}>
                      Yearly <span className="landing-pricing-save">Save</span>
                    </button>
                  </div>
                </div>

                <div className="account-plans">
                  {PRICING_PLANS.map((p) => {
                    const price = annual ? p.yearlyPrice : p.monthlyPrice;
                    const isCurrent = p.id === plan;
                    const savings = yearlySavingsPct(p);
                    return (
                      <article
                        key={p.id}
                        className={`account-plan ${p.highlighted ? "account-plan--featured" : ""} ${isCurrent ? "account-plan--current" : ""}`}
                      >
                        <div className="account-plan-top">
                          <div>
                            <h3>{p.name}</h3>
                            <p>{p.description}</p>
                          </div>
                          {isCurrent && <span className="account-plan-current-tag">Current</span>}
                          {p.badge && !isCurrent && <span className="account-plan-popular-tag">{p.badge}</span>}
                        </div>
                        <div className="account-plan-price">
                          <strong>
                            {p.monthlyPrice === 0 ? "Free" : `$${annual ? Math.round(price / 12) : price}`}
                          </strong>
                          {p.monthlyPrice > 0 && <span>/month</span>}
                          {annual && savings > 0 && p.yearlyPrice > 0 && (
                            <em>Billed ${price}/yr · save {savings}%</em>
                          )}
                        </div>
                        <ul className="account-plan-features">
                          {p.features.map((f) => <li key={f}>{f}</li>)}
                        </ul>
                        {p.id === "starter" ? (
                          <button type="button" className="btn btn-block" disabled={isCurrent}>
                            {isCurrent ? "Your current plan" : "Included on Basic"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`btn btn-block ${p.highlighted && !isCurrent ? "btn-primary" : ""}`}
                            disabled={isCurrent || loadingPlan === p.id}
                            onClick={() => handleUpgrade(p.id)}
                          >
                            {loadingPlan === p.id
                              ? "Redirecting to checkout…"
                              : isCurrent
                                ? "Current plan"
                                : `Upgrade to ${p.name}`}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>

                <p className="account-stripe-note">
                  Payments are secure. We never store your card details.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
