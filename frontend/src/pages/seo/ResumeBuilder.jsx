import MarketingPage from "../../components/MarketingPage";
import { PAGE_SEO } from "../../config/seo";

export default function ResumeBuilder() {
  return (
    <MarketingPage
      seo={PAGE_SEO.resumeBuilder}
      h1="Online Resume Builder"
      tagline="Make a job-ready resume fast."
      intro="Create a professional resume online with BuzzCVPilot. Choose a template, add your details with AI assistance, and download a clean PDF or Word resume you can send to employers right away."
      sections={[
        {
          h2: "Build your resume in three steps",
          list: [
            "Enter your details through a simple guided chat",
            "Choose a professional resume template",
            "Download your resume as PDF or Word",
          ],
        },
        {
          h2: "A resume that gets read",
          body: [
            "BuzzCVPilot keeps your resume clean and scannable, with clear headings and consistent spacing. The layout is optimized for both recruiters and applicant tracking systems, so your resume looks professional and parses correctly.",
          ],
        },
        {
          h2: "Edit anytime",
          body: [
            "Your resume is saved to your workspace. Come back to update it for a new role, switch templates, or tailor it to a specific job description whenever you need to.",
          ],
        },
      ]}
    />
  );
}
