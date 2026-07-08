import MarketingPage from "../../components/MarketingPage";
import { PAGE_SEO } from "../../config/seo";

export default function AiCvBuilder() {
  return (
    <MarketingPage
      seo={PAGE_SEO.aiCvBuilder}
      h1="AI CV Builder"
      tagline="Generate a professional CV with AI in minutes."
      intro="BuzzCVPilot uses AI to turn a simple chat into a polished, ATS-friendly CV. Share your experience, skills, and education — the AI writes clear summaries and achievement bullets, then you download your CV as PDF or Word."
      sections={[
        {
          h2: "How the AI CV builder works",
          body: [
            "Instead of filling long forms, you describe your background in plain language. The AI structures your details into standard CV sections, improves the wording, and keeps everything factual — it only formats and refines the information you provide.",
          ],
        },
        {
          h2: "What the AI helps you write",
          list: [
            "Professional summary tailored to your role",
            "Clear, results-focused experience bullet points",
            "Categorized skills and technologies",
            "Education, certifications, and languages",
            "Consistent, recruiter-friendly formatting",
          ],
        },
        {
          h2: "Why job seekers use BuzzCVPilot",
          body: [
            "It is fast, simple, and produces a clean CV that reads well and passes applicant tracking systems. You stay in control: edit any section through chat and preview changes live before you download.",
          ],
        },
      ]}
    />
  );
}
