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
  const { user, profile, plan, planLabel, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (params.get("checkout") === "success") {
      setToast("Payment successful! Your plan is being updated…");
      refreshProfile();
    }
  }, [params, refreshProfile]);

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
