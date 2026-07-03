/** Pricing tiers — mirrored in backend/billing.py */
export const PRICING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect to try ResumeAI and build your first CV.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "1 CV workspace",
      "50 AI messages / month",
      "5 core templates",
      "PDF preview",
      "Basic export (1 / month)",
    ],
    cta: "Get started free",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "Everything you need to land interviews faster.",
    monthlyPrice: 12,
    yearlyPrice: 96,
    features: [
      "Unlimited CVs",
      "Unlimited AI chat",
      "All 13 templates + custom themes",
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
    description: "For teams, recruiters, and career coaches.",
    monthlyPrice: 29,
    yearlyPrice: 232,
    features: [
      "Everything in Pro",
      "Up to 5 team seats",
      "Cover letter & LinkedIn AI",
      "Shared template library",
      "Dedicated onboarding",
    ],
    cta: "Upgrade to Business",
    highlighted: false,
  },
];

export function yearlySavingsPct(plan) {
  if (!plan.monthlyPrice || !plan.yearlyPrice) return 0;
  const fullYear = plan.monthlyPrice * 12;
  return Math.round((1 - plan.yearlyPrice / fullYear) * 100);
}
