/** Instant CV section edits — no AI required. Role-aware professional placeholders. */

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
