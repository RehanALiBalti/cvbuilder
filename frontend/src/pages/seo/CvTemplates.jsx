import MarketingPage from "../../components/MarketingPage";
import { PAGE_SEO } from "../../config/seo";

const TEMPLATES = [
  { name: "Professional", color: "#1d4ed8" },
  { name: "Modern Sidebar", color: "#0f766e" },
  { name: "Executive", color: "#0f2744" },
  { name: "Minimal", color: "#475569" },
  { name: "Fresh Graduate", color: "#7c3aed" },
  { name: "Creative", color: "#ec4899" },
  { name: "Tech", color: "#0f172a" },
  { name: "Elegant", color: "#c9a227" },
  { name: "Corporate", color: "#1e3a5f" },
  { name: "Academic", color: "#7f1d1d" },
  { name: "International", color: "#0369a1" },
  { name: "Portfolio", color: "#db2777" },
];

export default function CvTemplates() {
  return (
    <MarketingPage
      seo={PAGE_SEO.cvTemplates}
      h1="Professional CV Templates"
      tagline="Modern, ATS-friendly designs for every role."
      intro="Choose from a range of professional CV templates. Every design is clean, recruiter-friendly, and optimized for applicant tracking systems. Pick a template, fill it with AI, and download your CV as PDF or Word."
      primaryCta={{ to: "/signup", label: "Create My CV" }}
      secondaryCta={{ to: "/ats-cv-builder", label: "ATS-friendly CVs" }}
      sections={[
        {
          h2: "Templates for every stage of your career",
          body: [
            "Whether you are a student applying for your first role, a professional changing jobs, or an executive updating your CV, there is a layout that fits. Basic includes a clean default template, Pro unlocks 15 designs, and Business unlocks every template plus custom color themes.",
          ],
        },
      ]}
    >
      <section className="marketing-section">
        <h2>Popular CV template styles</h2>
        <div className="marketing-tpl-grid">
          {TEMPLATES.map((t) => (
            <div key={t.name} className="marketing-tpl-card">
              <div className="marketing-tpl-swatch" style={{ "--tpl-color": t.color }} />
              <span>{t.name}</span>
            </div>
          ))}
        </div>
      </section>
    </MarketingPage>
  );
}
