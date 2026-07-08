// Central SEO configuration for public marketing pages.
// The canonical public site is the subdomain; canonicals always point here
// so the /cvbuilder/ IP deployment never competes for the same rankings.
export const SITE_URL = "https://cv.buzzwaretech.com";
export const SITE_NAME = "BuzzCVPilot";

export const DEFAULT_TITLE = "AI CV Builder & Resume Maker | BuzzCVPilot";
export const DEFAULT_DESCRIPTION =
  "Create professional, ATS-friendly CVs and resumes with BuzzCVPilot. Use AI to generate, edit, customize, and download your CV in minutes.";

/** Build an absolute canonical URL from a route path. */
export function absoluteUrl(path = "/") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean === "/" ? "/" : clean.replace(/\/$/, "")}`;
}

// Per-route metadata for public marketing pages.
export const PAGE_SEO = {
  home: {
    path: "/",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  aiCvBuilder: {
    path: "/ai-cv-builder",
    title: "AI CV Builder — Generate a Professional CV with AI | BuzzCVPilot",
    description:
      "Build a professional CV with AI. BuzzCVPilot writes summaries, experience bullets, and skills from a simple chat, then exports a clean, ATS-friendly CV.",
  },
  resumeBuilder: {
    path: "/resume-builder",
    title: "Online Resume Builder — Make a Resume Fast | BuzzCVPilot",
    description:
      "Create a job-ready resume online in minutes. Choose a template, add your details with AI help, and download a polished PDF or Word resume.",
  },
  cvTemplates: {
    path: "/cv-templates",
    title: "Professional CV Templates — Modern & ATS-Friendly | BuzzCVPilot",
    description:
      "Browse professional, ATS-friendly CV templates for every role. Pick a design, fill it with AI, and download your CV as PDF or Word.",
  },
  atsCvBuilder: {
    path: "/ats-cv-builder",
    title: "ATS-Friendly CV Builder — Pass Resume Screening | BuzzCVPilot",
    description:
      "Build an ATS-friendly CV that passes applicant tracking systems. Clean structure, clear headings, and keyword-ready formatting with BuzzCVPilot.",
  },
  pricing: {
    path: "/pricing",
    title: "Pricing — Free, Pro & Business Plans | BuzzCVPilot",
    description:
      "Simple pricing for the BuzzCVPilot AI CV builder. Start free with up to 5 CVs, or upgrade to Pro and Business for more CVs, templates, and features.",
  },
  about: {
    path: "/about",
    title: "About BuzzCVPilot — AI Resume Builder",
    description:
      "BuzzCVPilot is an AI-powered CV and resume builder that helps students, job seekers, and professionals create clean, ATS-friendly CVs in minutes.",
  },
  contact: {
    path: "/contact",
    title: "Contact BuzzCVPilot — Support & Feedback",
    description:
      "Get in touch with the BuzzCVPilot team. Report an issue, ask about billing, or share feedback about the AI CV builder.",
  },
  privacy: {
    path: "/privacy-policy",
    title: "Privacy Policy | BuzzCVPilot",
    description:
      "Read how BuzzCVPilot collects, uses, and protects your personal data when you use our AI CV and resume builder.",
  },
  terms: {
    path: "/terms-and-conditions",
    title: "Terms & Conditions | BuzzCVPilot",
    description:
      "The terms and conditions for using BuzzCVPilot, the AI-powered CV and resume builder.",
  },
  refund: {
    path: "/refund-policy",
    title: "Refund Policy | BuzzCVPilot",
    description:
      "Learn about the BuzzCVPilot refund policy for Pro and Business subscription plans.",
  },
};
