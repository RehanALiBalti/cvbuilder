/** Plan CV limits — keep in sync with backend/user_service.py PLAN_LIMITS */
export const PLAN_CV_LIMITS = {
  starter: 5,
  pro: 10,
  business: 100000,
};

/** CV limit for UI checks (ignores stale API/Firestore values on Basic). */
export function cvLimitForPlan(plan, maxCvsFromApi) {
  const p = plan || "starter";
  if (p === "business") return PLAN_CV_LIMITS.business;
  if (p === "starter") return PLAN_CV_LIMITS.starter;
  return maxCvsFromApi ?? PLAN_CV_LIMITS.pro;
}

/** Pricing tiers — mirrored in backend/billing.py (ChatGPT-style: Basic / Pro / Business) */

export const PRICING_PLANS = [
  {
    id: "starter",
    name: "Basic",
    description: "Free forever. Up to 5 CVs with AI chat.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "5 CV workspaces",
      "50 AI messages / month",
      "Default template (no template picker)",
      "PDF & Word export",
      "Chat history saved",
    ],
    cta: "Get started free",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For job seekers who want more templates and up to 10 CVs.",
    monthlyPrice: 12,
    yearlyPrice: 96,
    features: [
      "Up to 10 CVs",
      "Unlimited AI chat",
      "15 professional templates",
      "Styled PDF & Word export",
      "CV upload & profile photo",
      "Priority email support",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
    badge: "Most popular",
  },
  {
    id: "business",
    name: "Business",
    description: "Full access for teams, recruiters, and career coaches.",
    monthlyPrice: 29,
    yearlyPrice: 232,
    features: [
      "Everything in Pro",
      "Unlimited CVs",
      "All templates unlocked",
      "Custom color themes",
      "Up to 5 team seats",
      "Cover letter & LinkedIn AI",
      "Dedicated onboarding",
    ],
    cta: "Upgrade to Business",
    highlighted: false,
  },
];

/** Plan id → display label */
export function planLabel(plan) {
  const map = { starter: "Basic", pro: "Pro", business: "Business" };
  return map[plan] || "Basic";
}

/** Template access by plan (Basic hides picker; Pro ≤15 presets; Business = all incl. custom) */
export function templatesForPlan(templates, plan) {
  const list = Array.isArray(templates) ? templates : [];
  if (plan === "business") return list;
  if (plan === "pro") {
    return list.filter((t) => t.id !== "custom").slice(0, 15);
  }
  return [];
}

export function canUseTemplates(plan) {
  return plan === "pro" || plan === "business";
}

export function isFreePlan(plan) {
  return !plan || plan === "starter";
}

/** Display CV limit (Business is effectively unlimited). */
export function formatCvLimit(maxCvs, plan) {
  const p = plan || "starter";
  if (p === "business" || (maxCvs != null && maxCvs >= 1000)) return "Unlimited";
  if (p === "starter") return String(PLAN_CV_LIMITS.starter);
  if (p === "pro") return String(PLAN_CV_LIMITS.pro);
  return String(maxCvs ?? PLAN_CV_LIMITS.starter);
}

export function yearlySavingsPct(plan) {
  if (!plan.monthlyPrice || !plan.yearlyPrice) return 0;
  const fullYear = plan.monthlyPrice * 12;
  return Math.round((1 - plan.yearlyPrice / fullYear) * 100);
}
