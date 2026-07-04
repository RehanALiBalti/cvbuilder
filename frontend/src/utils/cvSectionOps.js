/** Instant CV section edits — no AI required. Role-aware professional placeholders. */

/** Prompts shown when user clicks any + section / starter button. */
export const SECTION_PROMPTS = {
  education: {
    ask: "Add Education — type your details below, then press Add to CV.\nExample: BSCS, University of Punjab, 2024",
    placeholder: "Degree, school/university, year",
  },
  experience: {
    ask: "Add Experience — type your job details below, then press Add to CV.\nExample: Software Engineer at Acme Corp, 2021–Present. Built customer portal.",
    placeholder: "Role at Company, years. What you did…",
  },
  skills: {
    ask: "Add Skills — type your skills separated by commas, then press Add to CV.\nExample: Communication, Leadership, Excel, Project management",
    placeholder: "Skill 1, Skill 2, Skill 3",
  },
  projects: {
    ask: "Add Project — type the project name and a short description, then press Add to CV.\nExample: Inventory app — tracked stock for a local shop",
    placeholder: "Project name — short description",
  },
  languages: {
    ask: "Add Languages — type languages separated by commas, then press Add to CV.\nExample: English, Urdu, Arabic",
    placeholder: "English, Urdu",
  },
  certifications: {
    ask: "Add Certificate — type the certificate name (and issuer if any), then press Add to CV.\nExample: Google Digital Marketing, Google",
    placeholder: "Certificate name, issuer",
  },
  summary: {
    ask: "Add Summary — write 2–3 lines about yourself and your goals, then press Add to CV.",
    placeholder: "I am a … with experience in …",
  },
  awards: {
    ask: "Add Award — type the award or achievement, then press Add to CV.",
    placeholder: "Award or achievement name",
  },
  name: {
    ask: "Type your full name below, then press Add to CV.\nExample: Ali Khan",
    placeholder: "Your full name",
  },
  professional: {
    ask: "Professional profile — type your full name and job title, then press Add to CV.\nExample: Sara Ahmed, Marketing Manager",
    placeholder: "Full name, job title",
  },
  graduate: {
    ask: "Early career — type your full name and university/college, then press Add to CV.\nExample: Hassan Ali, University of Punjab",
    placeholder: "Full name, university",
  },
  email: {
    ask: "Add Email — type your email address below, then press Add to CV.\nExample: you@email.com",
    placeholder: "you@email.com",
  },
  phone: {
    ask: "Add Phone — type your phone number below, then press Add to CV.\nExample: +92 300 1234567",
    placeholder: "+92 300 1234567",
  },
  links: {
    ask: "Add profile links — type LinkedIn and/or GitHub URLs (comma separated), then press Add to CV.\nExample: linkedin.com/in/yourname, github.com/yourname",
    placeholder: "LinkedIn URL, GitHub URL",
  },
  location: {
    ask: "Add Location — type your city/country, then press Add to CV.\nExample: Lahore, Pakistan",
    placeholder: "City, Country",
  },
};

/** Missing fields as short next-step chips (user-friendly checklist). */
export function getNextSteps(content) {
  const c = content || {};
  const steps = [];
  if (!c.full_name?.trim()) steps.push({ section: "name", label: "Your name" });
  if (!c.job_title?.trim()) steps.push({ section: "professional", label: "Job title" });
  if (!c.contact?.email?.trim()) steps.push({ section: "email", label: "Email" });
  if (!c.contact?.phone?.trim()) steps.push({ section: "phone", label: "Phone" });
  if (!c.summary?.trim()) steps.push({ section: "summary", label: "Summary" });
  if (!c.experience?.length) steps.push({ section: "experience", label: "Experience" });
  if (!c.education?.length) steps.push({ section: "education", label: "Education" });
  if (!c.skills?.length && !c.skill_groups?.length) steps.push({ section: "skills", label: "Skills" });
  if (!c.contact?.linkedin?.trim() && !c.contact?.github?.trim()) {
    steps.push({ section: "links", label: "LinkedIn / GitHub" });
  }
  return steps.slice(0, 5);
}

/**
 * Fast path: apply simple free-text without calling AI.
 * Returns { content, message } or null if AI is needed.
 */
export function tryApplyFreeTextLocally(content, text) {
  const t = (text || "").trim();
  if (!t) return null;

  // Plain email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    return applySectionAnswer(content, "email", t);
  }

  // Phone-like
  if (/^[\d\s+\-().]{10,18}$/.test(t) && (t.match(/\d/g) || []).length >= 10) {
    return applySectionAnswer(content, "phone", t);
  }

  // My name is X / I am X (short name only)
  const nameMatch = t.match(/^(?:my name is|i am|i'm)\s+([A-Za-z][A-Za-z\s.'-]{1,40})$/i);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    if (!/\b(engineer|developer|manager|student|graduate|years?)\b/i.test(name)) {
      return applySectionAnswer(content, "name", name);
    }
  }

  // Name, Job title
  if (/^[A-Za-z][A-Za-z\s.'-]{1,40},\s*[A-Za-z][A-Za-z\s/&-]{1,40}$/.test(t)
    && !t.includes("@")
    && t.length < 80) {
    return applySectionAnswer(content, "professional", t);
  }

  // Comma-separated skills only (3+ items, no long sentences)
  if (/^[\w.+#/& -]+(\s*,\s*[\w.+#/& -]+){2,}$/.test(t) && t.length < 140 && !/[.!?]$/.test(t)) {
    return applySectionAnswer(content, "skills", t);
  }

  // LinkedIn / GitHub URLs
  if (/linkedin\.com|github\.com/i.test(t) && t.length < 200) {
    return applySectionAnswer(content, "links", t);
  }

  return null;
}

/** Map AI suggestion text → section prompt id (for tap-to-fill flow). */
export function suggestionToSection(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("email")) return "email";
  if (t.includes("phone")) return "phone";
  if (t.includes("linkedin") || t.includes("github") || t.includes("profile url")) return "links";
  if (t.includes("location") || t.includes("city")) return "location";
  if (t.includes("full name") || t.includes("your name")) return "name";
  if (t.includes("summary") || t.includes("professional summary")) return "summary";
  if (t.includes("experience") || t.includes("achievement bullet") || t.includes("responsibilit")) return "experience";
  if (t.includes("education") || t.includes("degree") || t.includes("institution")) return "education";
  if (t.includes("skill")) return "skills";
  if (t.includes("project")) return "projects";
  if (t.includes("certif")) return "certifications";
  if (t.includes("language")) return "languages";
  if (t.includes("award")) return "awards";
  return null;
}

const LABELS = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certificates",
  languages: "Languages",
  awards: "Awards",
};

export function sectionLabel(id) {
  return LABELS[id] || id;
}

export function sectionHasData(content, id) {
  if (!content) return false;
  if (id === "summary") return Boolean(content.summary?.trim());
  if (id === "skills") return Boolean(content.skills?.length || content.skill_groups?.length);
  const val = content[id];
  return Array.isArray(val) ? val.length > 0 : Boolean(val);
}

/** Professional defaults based on job title — not always “Python developer”. */
export function professionalDefaults(content = {}) {
  const title = (content.job_title || "").trim();
  const t = title.toLowerCase();
  const role = title || "professional";

  if (/develop|engineer|software|programmer|devops|data scientist|it\b|tech/.test(t)) {
    return {
      skills: ["Problem solving", "Collaboration", "Technical communication", "Continuous learning"],
      summary: `Results-oriented ${role} with experience delivering reliable solutions and working effectively in team environments. Committed to quality, clear communication, and continuous improvement.`,
      experienceRole: title || "Professional",
      experienceBullets: [
        "Delivered assigned projects on time with attention to quality",
        "Collaborated with team members to solve day-to-day challenges",
      ],
    };
  }

  if (/market|sales|business development|account/.test(t)) {
    return {
      skills: ["Client communication", "Negotiation", "Relationship building", "Target orientation"],
      summary: `Driven ${role} focused on building strong client relationships and achieving business goals. Skilled at clear communication and delivering measurable results.`,
      experienceRole: title || "Sales Professional",
      experienceBullets: [
        "Built and maintained professional client relationships",
        "Met targets through structured planning and follow-up",
      ],
    };
  }

  if (/design|creative|ui|ux|graphic/.test(t)) {
    return {
      skills: ["Visual design", "Creativity", "Attention to detail", "Collaboration"],
      summary: `Creative ${role} with a strong eye for detail and user-focused design. Experienced in turning ideas into clear, professional deliverables.`,
      experienceRole: title || "Designer",
      experienceBullets: [
        "Created professional designs aligned with brand guidelines",
        "Collaborated with stakeholders to refine concepts",
      ],
    };
  }

  if (/teach|teacher|lectur|education|trainer/.test(t)) {
    return {
      skills: ["Communication", "Mentoring", "Lesson planning", "Classroom management"],
      summary: `Dedicated ${role} committed to student growth and clear instruction. Skilled at explaining concepts and supporting learners.`,
      experienceRole: title || "Educator",
      experienceBullets: [
        "Delivered lessons in a clear and engaging manner",
        "Supported learners to achieve academic goals",
      ],
    };
  }

  if (/manag|lead|director|head of|supervisor/.test(t)) {
    return {
      skills: ["Leadership", "Planning", "Team management", "Decision making"],
      summary: `Experienced ${role} with a track record of leading teams and delivering outcomes. Focused on clear priorities, accountability, and professional growth.`,
      experienceRole: title || "Manager",
      experienceBullets: [
        "Led team initiatives and tracked progress against goals",
        "Improved processes to increase efficiency and quality",
      ],
    };
  }

  if (/account|financ|audit|bank/.test(t)) {
    return {
      skills: ["Accuracy", "Financial analysis", "Reporting", "Compliance"],
      summary: `Detail-oriented ${role} with strong analytical skills and a commitment to accuracy. Experienced in structured reporting and professional standards.`,
      experienceRole: title || "Finance Professional",
      experienceBullets: [
        "Prepared accurate reports and maintained organized records",
        "Supported financial processes with attention to compliance",
      ],
    };
  }

  // Neutral professional default (any field)
  return {
    skills: ["Communication", "Teamwork", "Problem solving", "Time management"],
    summary: title
      ? `Dedicated ${role} with a strong work ethic and commitment to professional excellence. Skilled at collaborating with others and delivering quality results.`
      : "Dedicated professional with a strong work ethic and commitment to excellence. Skilled at collaborating with others and delivering quality results.",
    experienceRole: title || "Professional",
    experienceBullets: [
      "Completed responsibilities with reliability and attention to detail",
      "Worked effectively with colleagues to achieve shared goals",
    ],
  };
}

function withVisibility(content, sectionId, visible) {
  return {
    ...content,
    section_visibility: {
      ...(content.section_visibility || {}),
      [sectionId]: visible,
    },
  };
}

/** Add / enable a section with role-aware professional placeholders. */
export function addSection(content, sectionId) {
  const defaults = professionalDefaults(content);
  let next = withVisibility({ ...(content || {}) }, sectionId, true);

  if (sectionId === "summary" && !next.summary?.trim()) {
    next.summary = defaults.summary;
    return {
      content: next,
      message: "Professional summary added based on your role. Edit details or tap Polish CV to refine.",
    };
  }

  if (sectionId === "education") {
    const education = [...(next.education || [])];
    education.push({
      degree: "Degree / qualification",
      institution: "Institution name",
      field: "",
      start_date: "",
      end_date: "",
      gpa: "",
      highlights: [],
    });
    next.education = education;
    return { content: next, message: "Education section added. Replace placeholders with your real details." };
  }

  if (sectionId === "experience") {
    const experience = [...(next.experience || [])];
    experience.push({
      company: "Organization name",
      role: defaults.experienceRole,
      location: "",
      start_date: "",
      end_date: "Present",
      current: true,
      bullets: defaults.experienceBullets,
    });
    next.experience = experience;
    return {
      content: next,
      message: "Experience section added with professional wording for your role. Update company and specifics.",
    };
  }

  if (sectionId === "skills") {
    next.skills = next.skills?.length ? next.skills : defaults.skills;
    next.skill_groups = [{ category: "Core Skills", items: next.skills }];
    return {
      content: next,
      message: "Skills added to match a professional profile for your role. Adjust to your real strengths.",
    };
  }

  if (sectionId === "projects") {
    const projects = [...(next.projects || [])];
    projects.push({
      name: "Key project",
      url: "",
      technologies: [],
      description: "Brief description of impact and your contribution",
      bullets: [],
    });
    next.projects = projects;
    return { content: next, message: "Projects section added. Update with a real project name and outcome." };
  }

  if (sectionId === "languages") {
    next.languages = next.languages?.length
      ? next.languages
      : [
        { name: "English", proficiency: "Professional" },
        { name: "Urdu", proficiency: "Native" },
      ];
    return { content: next, message: "Languages section added. Adjust proficiency levels as needed." };
  }

  if (sectionId === "certifications") {
    const certifications = [...(next.certifications || [])];
    certifications.push({ name: "Professional certification", issuer: "Issuing body", date: "" });
    next.certifications = certifications;
    return { content: next, message: "Certificates section added. Replace with your real credentials." };
  }

  if (sectionId === "awards") {
    next.awards = next.awards?.length ? next.awards : ["Professional recognition"];
    return { content: next, message: "Awards section added." };
  }

  return { content: next, message: `${sectionLabel(sectionId)} enabled.` };
}

/** Remove section content and hide it (instant). */
export function removeSection(content, sectionId) {
  let next = withVisibility({ ...(content || {}) }, sectionId, false);

  if (sectionId === "summary") next.summary = "";
  else if (sectionId === "skills") {
    next.skills = [];
    next.skill_groups = [];
  } else if (Array.isArray(next[sectionId])) {
    next[sectionId] = [];
  }

  return {
    content: next,
    message: `${sectionLabel(sectionId)} removed from your CV.`,
  };
}

/** Apply a professional starter profile (role-aware, not fixed Python/dev data). */
export function applyStarterProfile(content, kind) {
  let next = { ...(content || {}) };
  const defaults = professionalDefaults(next);

  if (kind === "developer") {
    // Tech-oriented but not locked to Python/React unless user already set a title
    if (!next.job_title?.trim()) next.job_title = "Software Professional";
    const d = professionalDefaults(next);
    next = {
      ...next,
      summary: next.summary || d.summary,
      skills: next.skills?.length ? next.skills : d.skills,
      skill_groups: [{ category: "Core Skills", items: next.skills?.length ? next.skills : d.skills }],
      section_visibility: {
        ...(next.section_visibility || {}),
        summary: true,
        skills: true,
        experience: true,
      },
    };
    return {
      content: next,
      message: "Professional tech profile applied for your role. Add your name and work history, then tap Polish CV.",
    };
  }

  if (kind === "graduate") {
    if (!next.job_title?.trim()) next.job_title = "Graduate Professional";
    const d = professionalDefaults(next);
    next = {
      ...next,
      summary: next.summary
        || `Recent graduate prepared to begin a professional career. Strong academic foundation with ${d.skills.slice(0, 2).join(" and ").toLowerCase()} skills and a commitment to continuous learning.`,
      education: next.education?.length
        ? next.education
        : [{
          degree: "Bachelor's degree",
          institution: "University / College name",
          field: "",
          start_date: "",
          end_date: "",
          gpa: "",
          highlights: [],
        }],
      skills: next.skills?.length ? next.skills : d.skills,
      skill_groups: [{ category: "Core Skills", items: next.skills?.length ? next.skills : d.skills }],
      section_visibility: {
        ...(next.section_visibility || {}),
        summary: true,
        education: true,
        skills: true,
      },
    };
    return {
      content: next,
      message: "Early-career professional profile applied. Add your university and strengths, then tap Polish CV.",
    };
  }

  // Generic professional starter
  next = {
    ...next,
    job_title: next.job_title || "Professional",
    summary: next.summary || defaults.summary,
    skills: next.skills?.length ? next.skills : defaults.skills,
    skill_groups: [{ category: "Core Skills", items: next.skills?.length ? next.skills : defaults.skills }],
    section_visibility: {
      ...(next.section_visibility || {}),
      summary: true,
      skills: true,
    },
  };
  return { content: next, message: "Professional profile applied. Add your details, then tap Polish CV." };
}

function withSectionVisible(content, sectionId) {
  return withVisibility(content, sectionId, true);
}

/**
 * Attach user-typed answer to a section (no AI).
 * Called after user clicks +Education / +Skills and fills the input.
 */
export function applySectionAnswer(content, sectionId, answer) {
  const text = (answer || "").trim();
  if (!text) {
    return { content, message: "Please type your details, then press Add to CV." };
  }

  // Quick-start profiles collected from the input box
  if (sectionId === "name") {
    const next = { ...(content || {}), full_name: text };
    return { content: next, message: `Name set to ${text}.` };
  }

  if (sectionId === "email") {
    const email = text.replace(/^email\s*[:=]?\s*/i, "").trim();
    const next = {
      ...(content || {}),
      contact: { ...(content?.contact || {}), email },
    };
    return { content: next, message: `Email added: ${email}.` };
  }

  if (sectionId === "phone") {
    const phone = text.replace(/^(phone|mobile)\s*[:=]?\s*/i, "").trim();
    const next = {
      ...(content || {}),
      contact: { ...(content?.contact || {}), phone },
    };
    return { content: next, message: `Phone added: ${phone}.` };
  }

  if (sectionId === "location") {
    const location = text.replace(/^(location|city)\s*[:=]?\s*/i, "").trim();
    const next = {
      ...(content || {}),
      contact: { ...(content?.contact || {}), location },
    };
    return { content: next, message: `Location added: ${location}.` };
  }

  if (sectionId === "links") {
    const parts = text.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
    const contact = { ...(content?.contact || {}) };
    for (const part of parts) {
      const low = part.toLowerCase();
      if (low.includes("linkedin") || low.includes("linked.in")) contact.linkedin = part;
      else if (low.includes("github")) contact.github = part;
      else if (!contact.linkedin) contact.linkedin = part;
      else if (!contact.github) contact.github = part;
    }
    const next = { ...(content || {}), contact };
    return { content: next, message: "Profile link(s) added to your CV." };
  }

  if (sectionId === "professional") {
    const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
    const full_name = parts[0] || text;
    const job_title = parts[1] || content?.job_title || "Professional";
    let next = { ...(content || {}), full_name, job_title };
    const applied = applyStarterProfile(next, "professional");
    return {
      content: applied.content,
      message: `Profile saved for ${full_name} (${job_title}). Add more sections or tap Polish CV.`,
    };
  }

  if (sectionId === "graduate") {
    const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
    const full_name = parts[0] || text;
    const institution = parts[1] || "University / College name";
    let next = {
      ...(content || {}),
      full_name,
      job_title: content?.job_title || "Graduate Professional",
      education: [{
        degree: "Bachelor's degree",
        institution,
        field: "",
        start_date: "",
        end_date: "",
        gpa: "",
        highlights: [],
      }],
    };
    const applied = applyStarterProfile(next, "graduate");
    return {
      content: applied.content,
      message: `Early-career profile saved for ${full_name}. Update education/skills or tap Polish CV.`,
    };
  }

  let next = withSectionVisible({ ...(content || {}) }, sectionId);

  if (sectionId === "summary") {
    next.summary = text;
    return { content: next, message: "Summary added to your CV." };
  }

  if (sectionId === "skills") {
    const skills = text.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    if (!skills.length) {
      return { content, message: "Please list skills separated by commas." };
    }
    const merged = [...new Set([...(next.skills || []), ...skills])];
    next.skills = merged;
    next.skill_groups = [{ category: "Core Skills", items: merged }];
    return { content: next, message: `Added ${skills.length} skill(s) to your CV.` };
  }

  if (sectionId === "languages") {
    const langs = text.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    const items = langs.map((name) => ({ name, proficiency: "" }));
    next.languages = [...(next.languages || []).filter((l) => l?.name), ...items];
    return { content: next, message: `Added language(s): ${langs.join(", ")}.` };
  }

  if (sectionId === "education") {
    // "BSCS, Punjab University, 2024" or "High School from ABC School"
    const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
    let degree = parts[0] || text;
    let institution = parts[1] || "";
    let end_date = parts[2] || "";
    const fromMatch = text.match(/^(.+?)\s+from\s+(.+)$/i);
    if (fromMatch) {
      degree = fromMatch[1].trim();
      institution = fromMatch[2].trim();
    }
    const education = [...(next.education || [])];
    education.push({
      degree,
      institution,
      field: "",
      start_date: "",
      end_date,
      gpa: "",
      highlights: [],
    });
    next.education = education;
    return { content: next, message: `Education added: ${degree}${institution ? ` — ${institution}` : ""}.` };
  }

  if (sectionId === "experience") {
    // "Software Engineer at Acme, 2021-Present. Built portal."
    let role = "";
    let company = "";
    let rest = text;
    const atMatch = text.match(/^(.+?)\s+at\s+(.+)$/i);
    if (atMatch) {
      role = atMatch[1].trim();
      rest = atMatch[2].trim();
    }
    const bits = rest.split(/[.]/).map((b) => b.trim()).filter(Boolean);
    const head = bits[0] || rest;
    const headParts = head.split(",").map((p) => p.trim());
    if (!role) {
      role = headParts[0] || "Professional";
      company = headParts[1] || "";
    } else {
      company = headParts[0] || rest;
    }
    // dates like 2021-Present or 2021–2024
    let start_date = "";
    let end_date = "Present";
    const dateMatch = text.match(/(\d{4})\s*[-–—to]+\s*(\d{4}|present)/i);
    if (dateMatch) {
      start_date = dateMatch[1];
      end_date = /present/i.test(dateMatch[2]) ? "Present" : dateMatch[2];
    }
    const bullets = bits.slice(1);
    if (!bullets.length) {
      const afterDates = text.replace(/(\d{4})\s*[-–—to]+\s*(\d{4}|present)/i, "").trim();
      if (afterDates && afterDates !== text) {
        const extra = afterDates.replace(/^[,.\s]+/, "");
        if (extra.length > 10) bullets.push(extra);
      }
    }
    const experience = [...(next.experience || [])];
    experience.push({
      company: company || "Organization",
      role: role || defaultsRole(next),
      location: "",
      start_date,
      end_date,
      current: /present/i.test(end_date),
      bullets: bullets.length ? bullets : ["Key responsibilities and achievements"],
    });
    next.experience = experience;
    return { content: next, message: `Experience added: ${role}${company ? ` at ${company}` : ""}.` };
  }

  if (sectionId === "projects") {
    const [namePart, ...descParts] = text.split(/[-–—]/).map((p) => p.trim());
    const projects = [...(next.projects || [])];
    projects.push({
      name: namePart || text,
      url: "",
      technologies: [],
      description: descParts.join(" — ") || "",
      bullets: [],
    });
    next.projects = projects;
    return { content: next, message: `Project added: ${namePart || text}.` };
  }

  if (sectionId === "certifications") {
    const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
    const certifications = [...(next.certifications || [])];
    certifications.push({
      name: parts[0] || text,
      issuer: parts[1] || "",
      date: parts[2] || "",
    });
    next.certifications = certifications;
    return { content: next, message: `Certificate added: ${parts[0] || text}.` };
  }

  if (sectionId === "awards") {
    next.awards = [...(next.awards || []), text];
    return { content: next, message: `Award added: ${text}.` };
  }

  return { content: next, message: `${sectionLabel(sectionId)} updated.` };
}

function defaultsRole(content) {
  return (content?.job_title || "Professional").trim() || "Professional";
}
