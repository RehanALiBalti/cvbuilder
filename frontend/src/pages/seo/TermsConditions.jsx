import { Link } from "react-router-dom";
import AppLayout from "../../components/AppLayout";
import useSeo from "../../hooks/useSeo";
import { PAGE_SEO } from "../../config/seo";

export default function TermsConditions() {
  useSeo(PAGE_SEO.terms);

  return (
    <AppLayout mainClassName="site-main--app">
      <div className="marketing-page">
        <header className="marketing-hero">
          <h1>Terms &amp; Conditions</h1>
        </header>

        <div className="legal-content">
          <p className="legal-updated">Last updated: {new Date().getFullYear()}</p>

          <p>
            These Terms &amp; Conditions govern your use of BuzzCVPilot, an AI CV and
            resume builder operated by Buzzware Tech. By creating an account or using the
            service, you agree to these terms.
          </p>

          <h2>Using the service</h2>
          <p>
            You may use BuzzCVPilot to create, edit, and download CVs for lawful purposes.
            You are responsible for the accuracy of the information you enter and for
            keeping your account credentials secure.
          </p>

          <h2>Accounts and plans</h2>
          <p>
            Some features require a paid subscription. Plan limits and features are shown
            on our <Link to="/pricing">pricing page</Link>. We may update features and
            limits to improve the service.
          </p>

          <h2>Acceptable use</h2>
          <p>
            You agree not to misuse the service, attempt to disrupt it, or use it to
            create misleading or fraudulent documents.
          </p>

          <h2>Content ownership</h2>
          <p>
            You own the CV content you create. You grant us the limited permission needed
            to store and process your content in order to provide the service.
          </p>

          <h2>Changes to these terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the service
            after changes means you accept the updated terms.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about these terms? <Link to="/contact">Contact us</Link>.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
