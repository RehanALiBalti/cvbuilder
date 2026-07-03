/** Detect template id from natural language (client-side fast hints). */

const KEYWORDS = [
  ["fresh_graduate", /\b(fresh\s*graduate|graduate|student|intern|fresher)\b/i],
  ["international", /\b(international|global)\b/i],
  ["professional", /\b(professional|classic|ats)\b/i],
  ["corporate", /\b(corporate|finance|consulting)\b/i],
  ["executive", /\b(executive|leadership|director)\b/i],
  ["academic", /\b(academic|research|professor|phd)\b/i],
  ["startup", /\b(startup|product|growth)\b/i],
  ["creative", /\b(creative|designer|design)\b/i],
  ["minimal", /\b(minimal|minimalist|simple)\b/i],
  ["elegant", /\b(elegant|premium|formal)\b/i],
  ["modern", /\b(modern|sidebar)\b/i],
  ["tech", /\b(tech|developer|engineer|software|programmer)\b/i],
  ["custom", /\b(custom|apna|personal)\b/i],
];

export function matchTemplateFromText(text) {
  const m = text || "";
  for (const [id, pattern] of KEYWORDS) {
    if (pattern.test(m)) return id;
  }
  return null;
}

export function detectCreateCvWithTemplate(text) {
  const m = (text || "").toLowerCase();
  if (!/\b(new|naya|create|banao)\b/.test(m) || !/\b(cv|resume)\b/.test(m)) return null;
  return matchTemplateFromText(text) || "professional";
}

export const TEMPLATE_CHAT_EXAMPLES = [
  "use modern template",
  "switch to tech template",
  "list templates",
  "recommend template for software engineer",
  "create custom template blue and gold",
  "new CV with startup template",
];
