import { applySectionAnswer } from "./cvSectionOps";

/** Order of fields we collect one-by-one in chat. */
export const GUIDED_STEP_ORDER = [
  "name",
  "job_title",
  "experience_level",
  "experience",
  "education",
  "skills",
  "email",
  "phone",
  "location",
  "links",
];

const SKIPPABLE = new Set([
  "job_title",
  "experience_level",
  "experience",
  "education",
  "skills",
  "email",
  "phone",
  "location",
  "links",
]);

/** Choice cards for steps that work better as tap-to-select. */
export const GUIDED_CHOICE_STEPS = {
  job_title: {
    title: "What is your field or target job?",
    page: 1,
    totalPages: 2,
    options: [
      { id: "it", label: "IT / Software", value: "Software Developer" },
      { id: "business", label: "Business / Marketing", value: "Marketing Professional" },
      { id: "teaching", label: "Teaching / Education", value: "Teacher" },
      {
        id: "fresher",
        label: "Fresh graduate / no experience yet",
        value: "Fresh Graduate",
        skipAlso: ["experience_level", "experience"],
      },
      { id: "other", label: "Something else", custom: true },
    ],
  },
  experience_level: {
    title: "What is your experience level?",
    page: 2,
    totalPages: 2,
    options: [
      {
        id: "none",
        label: "No experience yet",
        skipAlso: ["experience"],
      },
      { id: "0-1", label: "Less than 1 year" },
      { id: "1-3", label: "1–3 years" },
      { id: "3plus", label: "3+ years" },
    ],
  },
};

const ROLE_WORDS =
  "developer|engineer|manager|designer|analyst|consultant|specialist|officer|" +
  "accountant|teacher|student|programmer|intern|executive|director|freelancer|devops";

function titleCase(text) {
  return text
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function cvHasSubstance(content = {}) {
  return Boolean(
    content.experience?.length ||
      content.education?.length ||
      content.skills?.length ||
      content.skill_groups?.length ||
      (content.summary || "").trim() ||
      content.projects?.length
  );
}

/** Pull name / role from a free-text intro (no API needed). */
export function extractIdentityFromMessage(message) {
  const m = (message || "").trim();
  const updates = {};

  const nameMatch = m.match(
    /\b(?:my name is|my name's|this is|i am called|i'?m called|name\s*[:\-]\s*)\s*([A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+){0,3})/i
  );
  if (nameMatch) {
    let raw = nameMatch[1].trim();
    raw = raw.split(/\s+(?:i\s*am|i'?m|and|who)\b/i)[0].trim();
    raw = raw.replace(new RegExp(`\\b(?:${ROLE_WORDS})\\b.*$`, "i"), "").trim(" .,-");
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length >= 1 && words.length <= 4) {
      updates.full_name = titleCase(words.join(" "));
    }
  }

  const titleMatch = m.match(
    new RegExp(
      `\\b(?:i\\s*am|i'?m|work(?:ing)?\\s+as)\\s+(?:an?\\s+)?([a-z][a-z /+&.-]*?\\b(?:${ROLE_WORDS}))\\b`,
      "i"
    )
  );
  if (titleMatch) {
    let title = titleMatch[1].replace(/\s+/g, " ").trim(" .,-");
    title = title.replace(/^(?:a|an|the)\s+/i, "").trim();
    if (title && title.length <= 45) updates.job_title = titleCase(title);
  }

  return updates;
}

export function shouldStartGuidedFlow(message, content) {
  const m = (message || "").trim().toLowerCase();
  if (cvHasSubstance(content)) return false;

  const cvIntent =
    /\b(make|create|build|start|need|want|help|write|prepare)\b[\w\s'’]{0,25}\b(cv|resume)\b/.test(m) ||
    /\b(cv|resume)\b[\w\s]{0,15}\b(bana|banao|banana|chahiye|chahta|chahti)\b/.test(m);

  const intro =
    /\b(my name is|my name's|this is|i am|i'm)\b/.test(m) || cvIntent;

  return intro && (cvIntent || /\b(my name is|this is)\b/.test(m));
}

export function isSkipMessage(text) {
  const t = (text || "").trim().toLowerCase();
  return /^(skip|skip for now|next|later|pass|nahi|na|no|none|not now|baad mein|baad mai|choro|chhoro|agay|aagey)$/i.test(t) ||
    /\b(skip|don't have|do not have|no experience|fresher|fresh graduate)\b/.test(t);
}

export function isBuildNowMessage(text) {
  const t = (text || "").trim().toLowerCase();
  return (
    /\b(build|finish|done|complete|polish|generate|bas|ab)\b[\w\s]{0,20}\b(cv|resume)\b/.test(t) ||
    /\b(cv|resume)\b[\w\s]{0,15}\b(bana do|banado|bana de|ready)\b/.test(t) ||
    /^(build cv now|polish cv|finish)$/i.test(t)
  );
}

export function messageProvidesBulkData(text) {
  const m = (text || "").trim().toLowerCase();
  if (m.length > 120) return true;
  return /\b(company|worked|university|college|degree|bachelor|master|matric|@|\+?\d[\d\s-]{8,})\b/.test(m);
}

function stepIsFilled(content, stepId, meta = {}) {
  const c = content || {};
  switch (stepId) {
    case "name":
      return Boolean(c.full_name?.trim());
    case "job_title":
      return Boolean(c.job_title?.trim());
    case "experience_level":
      return Boolean(meta.experienceLevel);
    case "experience":
      return Boolean(c.experience?.length);
    case "education":
      return Boolean(c.education?.length);
    case "skills":
      return Boolean(c.skills?.length || c.skill_groups?.length);
    case "email":
      return Boolean(c.contact?.email?.trim());
    case "phone":
      return Boolean(c.contact?.phone?.trim());
    case "location":
      return Boolean(c.contact?.location?.trim());
    case "links":
      return Boolean(c.contact?.linkedin?.trim() || c.contact?.github?.trim());
    default:
      return true;
  }
}

export function getNextGuidedStep(content, skipped = [], meta = {}) {
  const skipSet = new Set(skipped);
  for (const stepId of GUIDED_STEP_ORDER) {
    if (skipSet.has(stepId)) continue;
    if (stepId === "experience_level" && skipSet.has("experience")) continue;
    if (!stepIsFilled(content, stepId, meta)) return stepId;
  }
  return null;
}

/** Short professional confirmation after a field is saved. */
export function buildStepAcknowledgment(stepId, detail = "") {
  const labels = {
    name: "Name saved to your CV",
    job_title: "Job title saved",
    email: "Email added to your CV",
    phone: "Phone number saved",
    location: "Location saved",
    links: "Profile link saved",
    education: "Education added",
    skills: "Skills added",
    experience: "Experience added",
    experience_level: "Got it",
  };
  const base = labels[stepId] || "Saved to your CV";
  const extra = detail && stepId !== "experience_level" ? ` (${detail})` : "";
  return `${base}${extra} ✓\n\nLet's add the remaining details to complete your CV:`;
}

/** Numbered list of what's still needed (shown after job + experience level). */
export function buildRemainingDetailsList(content, skipped = []) {
  const skipSet = new Set(skipped);
  const items = [];
  if (!skipSet.has("experience") && !content.experience?.length) {
    items.push("Work experience — company, role, dates, and 2–3 main tasks");
  }
  if (!skipSet.has("education") && !content.education?.length) {
    items.push("Education — degree, institute, year");
  }
  if (!skipSet.has("skills") && !content.skills?.length && !content.skill_groups?.length) {
    items.push("Skills — 3–4 key skills for your field");
  }
  if (!content.contact?.phone?.trim() && !skipSet.has("phone")) {
    items.push("Phone number");
  }
  if (!content.contact?.location?.trim() && !skipSet.has("location")) {
    items.push("City / location");
  }
  if (!content.full_name?.trim() && !skipSet.has("name")) {
    items.push("Full name");
  }
  if (items.length === 0) return "";
  const numbered = items.map((t, i) => `${i + 1}. ${t}`).join("\n");
  return (
    `Share whatever you have — even roughly — and I'll organize it into your CV:\n\n${numbered}\n\n` +
    "You can send one section at a time, or paste several details together."
  );
}

export function buildGuidedWelcome(content) {
  const first = (content.full_name || "").trim().split(/\s+/)[0];
  if (first) {
    return (
      `Nice to meet you, ${first}! I'll help you build your CV step by step — ` +
      `one question at a time. Skip anything you don't have; we'll keep going.\n\n`
    );
  }
  return (
    "I'll help you build your CV step by step — one question at a time. " +
    "Skip anything you don't have; we'll keep going.\n\n"
  );
}

export function buildGuidedQuestion(stepId, content, meta = {}) {
  const first = (content.full_name || "").trim().split(/\s+/)[0] || "there";

  const choiceDef = GUIDED_CHOICE_STEPS[stepId];
  if (choiceDef) {
    return {
      text: choiceDef.title,
      choices: { ...choiceDef, stepId },
      actions: ["Skip for now", "Build CV now"],
    };
  }

  const questions = {
    name: {
      text: "What is your full name?",
      example: "e.g. Rehan Ali",
    },
    experience: {
      text:
        meta.experienceLevel === "3plus" || meta.experienceLevel === "1-3"
          ? "Tell me about your work experience — for each job: company, role, dates, and 2–3 things you achieved."
          : "Share any work experience you have — role, company, dates, and what you did.\nIf none yet, type \"fresher\" or tap Skip.",
      example: "Software Engineer at ABC Tech, 2021–Present. Built customer portal…",
    },
    education: {
      text: "What is your education? Degree, school/university, and year.",
      example: "BSCS, University of Punjab, 2024",
    },
    skills: {
      text: `What are your main skills${content.job_title ? ` for a ${content.job_title}` : ""}? List 3–6 separated by commas.`,
      example: "Python, React, Communication, Teamwork",
    },
    email: {
      text: "What email should recruiters use to contact you?",
      example: "you@email.com",
    },
    phone: {
      text: "What's your phone number?",
      example: "+92 300 1234567",
    },
    location: {
      text: "Which city or country are you based in?",
      example: "Lahore, Pakistan",
    },
    links: {
      text: "LinkedIn or GitHub link? Paste here, or tap Skip.",
      example: "linkedin.com/in/yourname",
    },
  };

  const q = questions[stepId] || { text: "Please share the next detail for your CV.", example: "" };
  const skippable = SKIPPABLE.has(stepId);
  let text = q.text;
  if (first !== "there" && stepId === "name") {
    text = `Hi! ${text}`;
  }
  if (q.example) text += `\n\n(${q.example})`;

  return {
    text,
    choices: null,
    actions: skippable ? ["Skip for now", "Build CV now"] : ["Build CV now"],
  };
}

export function applyGuidedAnswer(content, sectionId, answer) {
  const text = (answer || "").trim();
  if (!text) {
    return { content, message: "Please type something, or tap Skip for now." };
  }

  if (sectionId === "job_title") {
    const next = { ...(content || {}), job_title: text };
    return { content: next, message: `Role set to ${text}.` };
  }

  if (
    sectionId === "experience" &&
    /^(fresher|fresh(er)?\s*graduate|no experience|student|none|n\/a|na)$/i.test(text)
  ) {
    return {
      content,
      message: "No problem — we'll skip work experience for now.",
      treatAsSkip: true,
    };
  }

  return applySectionAnswer(content, sectionId, text);
}

export function buildGuidedCompleteMessage(content) {
  const name = (content.full_name || "").trim();
  const hasCore =
    name &&
    (content.job_title ||
      content.experience?.length ||
      content.education?.length ||
      content.skills?.length);

  if (hasCore) {
    return (
      `Great${name ? `, ${name.split(/\s+/)[0]}` : ""}! Your CV has the main details — ` +
      `check the preview on the right.\n\n` +
      `You can keep chatting to add more, or tap **Polish CV** for a professional AI finish.`
    );
  }
  return (
    "You can keep adding details in chat anytime, or tap **Polish CV** when you're ready."
  );
}
