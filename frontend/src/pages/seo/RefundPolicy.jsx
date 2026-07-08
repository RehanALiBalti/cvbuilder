import { Link } from "react-router-dom";
import AppLayout from "../../components/AppLayout";
import useSeo from "../../hooks/useSeo";
import { PAGE_SEO } from "../../config/seo";

export default function RefundPolicy() {
  useSeo(PAGE_SEO.refund);

  return (
    <AppLayout mainClassName="site-main--app">
      <div className="marketing-page">
        <header className="marketing-hero">
          <h1>Refund Policy</h1>
        </header>

        <div className="legal-content">
          <p className="legal-updated">Last updated: {new Date().getFullYear()}</p>

          <p>
            This Refund Policy applies to paid Pro and Business subscriptions on
            BuzzCVPilot, operated by Buzzware Tech.
          </p>

          <h2>Free plan</h2>
          <p>
            You can try BuzzCVPilot for free with the Basic plan before subscribing. We
            recommend using the free plan to confirm the service fits your needs.
          </p>

          <h2>Subscriptions</h2>
          <p>
            Paid plans are billed monthly or yearly. You can cancel at any time from your
            account; cancellation stops future billing, and you keep access until the end
            of the current billing period.
          </p>

          <h2>Refund requests</h2>
          <p>
            If you were charged in error or experienced a technical issue that prevented
            you from using a paid feature, contact us and we will review your request. Refunds,
            where granted, are issued to the original payment method.
          </p>

          <h2>How to request a refund</h2>
          <p>
            Please <Link to="/contact">contact us</Link> with your account email and order
            details, and we will respond as soon as possible.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
