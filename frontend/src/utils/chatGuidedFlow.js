import { applySectionAnswer } from "./cvSectionOps";

/** Order of fields we collect one-by-one in chat. */
export const GUIDED_STEP_ORDER = [
  "name",
  "job_title",
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
  "experience",
  "education",
  "skills",
  "email",
  "phone",
  "location",
  "links",
]);

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

function stepIsFilled(content, stepId) {
  const c = content || {};
  switch (stepId) {
    case "name":
      return Boolean(c.full_name?.trim());
    case "job_title":
      return Boolean(c.job_title?.trim());
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

export function getNextGuidedStep(content, skipped = []) {
  const skipSet = new Set(skipped);
  for (const stepId of GUIDED_STEP_ORDER) {
    if (skipSet.has(stepId)) continue;
    if (!stepIsFilled(content, stepId)) return stepId;
  }
  return null;
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

export function buildGuidedQuestion(stepId, content) {
  const first = (content.full_name || "").trim().split(/\s+/)[0] || "there";

  const questions = {
    name: {
      text: "Let's start with the basics — what is your full name?",
      example: "e.g. Rehan Ali",
    },
    job_title: {
      text: first !== "there"
        ? `What job or role are you aiming for, ${first}?`
        : "What job or role are you aiming for?",
      example: "e.g. Software Developer, Marketing Executive, Fresh Graduate",
    },
    experience: {
      text:
        "Tell me about your work experience — role, company, dates, and what you did.\n" +
        "If you're a fresher with no job yet, type \"fresher\" or tap Skip.",
      example: "Software Engineer at ABC Tech, 2021–Present. Built web apps…",
    },
    education: {
      text: "What is your education? Share degree, school/university, and year.",
      example: "BSCS, University of Punjab, 2024",
    },
    skills: {
      text: "What are your main skills? List them separated by commas.",
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
      text: "Do you have a LinkedIn or GitHub profile? Paste the link(s), or skip.",
      example: "linkedin.com/in/yourname",
    },
  };

  const q = questions[stepId] || { text: "Please share the next detail for your CV.", example: "" };
  const skippable = SKIPPABLE.has(stepId);
  let text = q.text;
  if (q.example) text += `\n\n(${q.example})`;
  if (skippable) {
    text += "\n\nType your answer below, or tap **Skip for now** to move on.";
  } else {
    text += "\n\nType your answer below.";
  }

  return {
    text,
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
