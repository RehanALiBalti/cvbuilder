import MarketingPage from "../../components/MarketingPage";
import { PAGE_SEO } from "../../config/seo";

export default function AtsCvBuilder() {
  return (
    <MarketingPage
      seo={PAGE_SEO.atsCvBuilder}
      h1="ATS-Friendly CV Builder"
      tagline="Build a CV that passes resume screening."
      intro="Many companies use applicant tracking systems (ATS) to scan CVs before a human reviews them. BuzzCVPilot creates CVs with a clean structure and clear formatting so your information is parsed correctly and your application gets seen."
      sections={[
        {
          h2: "What makes a CV ATS-friendly",
          list: [
            "Standard section headings the ATS can recognize",
            "Simple, single-column-friendly layout without hidden text",
            "Clear job titles, dates, and company names",
            "Relevant skills and keywords for your target role",
            "Clean fonts and consistent formatting",
          ],
        },
        {
          h2: "How BuzzCVPilot helps",
          body: [
            "Every template is designed to be readable by both people and software. The AI organizes your experience into clear bullet points and categorizes your skills, which improves how accurately an ATS reads your CV.",
          ],
        },
        {
          h2: "Check and improve your CV",
          body: [
            "As you build, BuzzCVPilot shows an ATS readiness indicator and highlights missing sections, so you know what to add before you apply.",
          ],
        },
      ]}
    />
  );
}
