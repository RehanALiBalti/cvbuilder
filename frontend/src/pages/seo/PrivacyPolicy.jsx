import { Link } from "react-router-dom";
import AppLayout from "../../components/AppLayout";
import useSeo from "../../hooks/useSeo";
import { PAGE_SEO } from "../../config/seo";

export default function PrivacyPolicy() {
  useSeo(PAGE_SEO.privacy);

  return (
    <AppLayout mainClassName="site-main--app">
      <div className="marketing-page">
        <header className="marketing-hero">
          <h1>Privacy Policy</h1>
        </header>

        <div className="legal-content">
          <p className="legal-updated">Last updated: {new Date().getFullYear()}</p>

          <p>
            This Privacy Policy explains how BuzzCVPilot ("we", "us"), operated by
            Buzzware Tech, collects, uses, and protects your information when you use our
            AI CV and resume builder.
          </p>

          <h2>Information we collect</h2>
          <p>
            We collect the account information you provide (such as your name and email),
            the CV content you create, and basic usage data needed to run the service.
            Payment information is processed securely by our payment provider — we do not
            store your card details.
          </p>

          <h2>How we use your information</h2>
          <p>
            We use your information to provide the service, save and generate your CVs,
            process subscriptions, and provide support. We do not sell your personal data.
          </p>

          <h2>Data storage and security</h2>
          <p>
            Your CV data is stored securely and is private to your account. We apply
            reasonable technical measures to protect your information from unauthorized
            access.
          </p>

          <h2>Your choices</h2>
          <p>
            You can update your account details or request deletion of your data by
            contacting us. Deleting your account removes your saved CVs from the service.
          </p>

          <h2>Contact</h2>
          <p>
            If you have questions about this policy, please <Link to="/contact">contact us</Link>.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
