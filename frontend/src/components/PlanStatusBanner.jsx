import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function PlanStatusBanner() {
  const { profile, plan } = useAuth();
  const status = (profile?.subscription_status || "").toLowerCase();
  const periodEnd = profile?.plan_period_end || "";

  if (status === "expired" || status === "canceled" || profile?.plan_expired) {
    return (
      <div className="plan-status-banner plan-status-banner--expired" role="status">
        <div>
          <strong>Your paid plan has expired.</strong>
          <span> You are now on the Basic plan. Extra CVs stay saved, but new CVs and Pro templates are locked.</span>
        </div>
        <Link to="/builder/account" className="btn btn-sm btn-primary">Renew plan</Link>
      </div>
    );
  }

  if (status === "canceling" && plan !== "starter") {
    const when = formatDate(periodEnd);
    return (
      <div className="plan-status-banner plan-status-banner--canceling" role="status">
        <div>
          <strong>Your subscription is ending{when ? ` on ${when}` : ""}.</strong>
          <span> You keep Pro/Business access until then, then you move to Basic.</span>
        </div>
        <Link to="/builder/account" className="btn btn-sm btn-primary">Manage billing</Link>
      </div>
    );
  }

  if (status === "past_due" && plan !== "starter") {
    return (
      <div className="plan-status-banner plan-status-banner--past-due" role="status">
        <div>
          <strong>Payment failed.</strong>
          <span> Update your payment method to keep your plan. Access may end if payment is not completed.</span>
        </div>
        <Link to="/builder/account" className="btn btn-sm btn-primary">View billing</Link>
      </div>
    );
  }

  return null;
}
