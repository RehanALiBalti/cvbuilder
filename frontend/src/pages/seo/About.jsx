import MarketingPage from "../../components/MarketingPage";
import { PAGE_SEO } from "../../config/seo";

export default function About() {
  return (
    <MarketingPage
      seo={PAGE_SEO.about}
      h1="About BuzzCVPilot"
      tagline="An AI CV and resume builder for everyone."
      intro="BuzzCVPilot helps students, job seekers, and professionals create clean, ATS-friendly CVs in minutes. We combine AI writing with professional templates so anyone can produce a high-quality CV without design or writing experience."
      primaryCta={{ to: "/signup", label: "Create My CV" }}
      secondaryCta={{ to: "/contact", label: "Contact us" }}
      sections={[
        {
          h2: "What we do",
          body: [
            "We make CV writing simple. You describe your background in plain language and our AI structures and refines it into a professional CV. You choose a template, preview it live, and download it as PDF or Word.",
          ],
        },
        {
          h2: "Our approach",
          body: [
            "We focus on accuracy and clarity. The AI improves and organizes the information you provide — it does not invent fake experience or credentials. Your data stays private to your account.",
          ],
        },
        {
          h2: "Powered by Buzzware Tech",
          body: [
            "BuzzCVPilot is built and maintained by Buzzware Tech. We are committed to a reliable, privacy-focused product and responsive support.",
          ],
        },
      ]}
    />
  );
}
