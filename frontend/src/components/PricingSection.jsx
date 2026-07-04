import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createCheckoutSession, fetchBillingPlans } from "../api/client";
import { PRICING_PLANS, yearlySavingsPct } from "../config/pricing";
import Reveal from "./Reveal";

function formatPrice(amount) {
  if (!amount) return "0";
  return amount.toString();
}

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");
  const [stripeReady, setStripeReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBillingPlans()
      .then((data) => setStripeReady(Boolean(data.stripe_configured)))
      .catch(() => setStripeReady(false));
  }, []);

  async function handlePlanClick(plan) {
    setError("");
    if (plan.id === "starter") {
      navigate("/signup");
      return;
    }

    if (!stripeReady) {
      navigate("/signup", { state: { plan: plan.id, billing: annual ? "yearly" : "monthly" } });
      return;
    }

    setLoadingPlan(plan.id);
    try {
      const { url } = await createCheckoutSession(plan.id, annual ? "yearly" : "monthly");
      window.location.href = url;
    } catch (err) {
      setError(err.message || "Could not start checkout. Try again or contact support.");
      setLoadingPlan(null);
    }
  }

  return (
    <Reveal className="landing-section landing-pricing" id="pricing">
      <p className="landing-pricing-eyebrow">Simple pricing</p>
      <h2>Basic, Pro, or Business</h2>
      <p className="landing-section-sub">
        Start free on Basic. Upgrade to Pro or Business when you need more — monthly or yearly, cancel anytime.
      </p>

      <div className="landing-pricing-toggle-wrap">
        <div className="landing-pricing-toggle" role="group" aria-label="Billing period">
          <button
            type="button"
            className={!annual ? "is-active" : ""}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            type="button"
            className={annual ? "is-active" : ""}
            onClick={() => setAnnual(true)}
          >
            Yearly
            <span className="landing-pricing-save">Save up to 33%</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="landing-pricing-error" role="alert">
          {error}
        </p>
      )}

      <div className="landing-pricing-grid">
        {PRICING_PLANS.map((plan, i) => {
          const price = annual ? plan.yearlyPrice : plan.monthlyPrice;
          const savings = yearlySavingsPct(plan);
          const isFree = plan.id === "starter";

          return (
            <article
              key={plan.id}
              className={`landing-pricing-card ${plan.highlighted ? "landing-pricing-card--featured" : ""}`}
              style={{ "--card-i": i }}
            >
              {plan.badge && (
                <span className="landing-pricing-badge">{plan.badge}</span>
              )}
              <h3>{plan.name}</h3>
              <p className="landing-pricing-desc">{plan.description}</p>

              <div className="landing-pricing-amount">
                <span className="landing-pricing-currency">$</span>
                <span className="landing-pricing-value">
                  {annual && !isFree ? Math.round(price / 12) : formatPrice(price)}
                </span>
                <span className="landing-pricing-period">
                  {isFree ? "forever" : "/mo"}
                </span>
              </div>

              {!isFree && annual && savings > 0 && (
                <p className="landing-pricing-billed">
                  Billed ${price}/year · save {savings}%
                </p>
              )}
              {!isFree && !annual && (
                <p className="landing-pricing-billed">Billed monthly · cancel anytime</p>
              )}

              <ul className="landing-pricing-features">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              {isFree ? (
                <Link to="/signup" className="btn btn-lg landing-pricing-btn">
                  {plan.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  className={`btn btn-lg landing-pricing-btn ${plan.highlighted ? "btn-primary landing-btn-glow" : "landing-btn-outline"}`}
                  disabled={loadingPlan === plan.id}
                  onClick={() => handlePlanClick(plan)}
                >
                  {loadingPlan === plan.id
                    ? "Redirecting to checkout…"
                    : stripeReady
                      ? plan.cta
                      : "Sign up — pay after account"}
                </button>
              )}
            </article>
          );
        })}
      </div>

      <p className="landing-pricing-stripe">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"
            fill="currentColor"
            opacity="0.5"
          />
        </svg>
        Payments are secure. We never store your card details.
      </p>
    </Reveal>
  );
}
