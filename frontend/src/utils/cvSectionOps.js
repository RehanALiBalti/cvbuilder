/** Instant CV section edits — no AI required. */

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

function withVisibility(content, sectionId, visible) {
  return {
    ...content,
    section_visibility: {
      ...(content.section_visibility || {}),
      [sectionId]: visible,
    },
  };
}

/** Add / enable a section with a light placeholder (instant preview). */
export function addSection(content, sectionId) {
  let next = withVisibility({ ...(content || {}) }, sectionId, true);

  if (sectionId === "summary" && !next.summary?.trim()) {
    next.summary = "Motivated professional ready to contribute and grow. Update this summary with your strengths.";
    return { content: next, message: "Summary added. You can edit it in chat or run “Polish CV” for a stronger version." };
  }

  if (sectionId === "education") {
    const education = [...(next.education || [])];
    education.push({
      degree: "Your degree / qualification",
      institution: "School or university",
      field: "",
      start_date: "",
      end_date: "",
      gpa: "",
      highlights: [],
    });
    next.education = education;
    return { content: next, message: "Education section added. Replace the placeholder with your real school and degree." };
  }

  if (sectionId === "experience") {
    const experience = [...(next.experience || [])];
    experience.push({
      company: "Company name",
      role: "Your role",
      location: "",
      start_date: "",
      end_date: "Present",
      current: true,
      bullets: ["Describe one achievement or responsibility"],
    });
    next.experience = experience;
    return { content: next, message: "Experience section added. Update company, role, and bullet points with your details." };
  }

  if (sectionId === "skills") {
    next.skills = next.skills?.length ? next.skills : ["Communication", "Teamwork"];
    next.skill_groups = [{ category: "Core Skills", items: next.skills }];
    return { content: next, message: "Skills section added. Tell me your real skills in chat (e.g. Python, React) to replace these." };
  }

  if (sectionId === "projects") {
    const projects = [...(next.projects || [])];
    projects.push({
      name: "Project name",
      url: "",
      technologies: [],
      description: "Short project description",
      bullets: [],
    });
    next.projects = projects;
    return { content: next, message: "Projects section added. Update the project name and description." };
  }

  if (sectionId === "languages") {
    next.languages = next.languages?.length
      ? next.languages
      : [{ name: "English", proficiency: "Fluent" }, { name: "Urdu", proficiency: "Native" }];
    return { content: next, message: "Languages section added. Adjust names and proficiency as needed." };
  }

  if (sectionId === "certifications") {
    const certifications = [...(next.certifications || [])];
    certifications.push({ name: "Certificate name", issuer: "", date: "" });
    next.certifications = certifications;
    return { content: next, message: "Certificates section added. Replace with your real certificate names." };
  }

  if (sectionId === "awards") {
    next.awards = next.awards?.length ? next.awards : ["Award or achievement"];
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

/** Apply a simple starter profile without AI. */
export function applyStarterProfile(content, kind) {
  let next = { ...(content || {}) };
  if (kind === "developer") {
    next = {
      ...next,
      job_title: next.job_title || "Software Developer",
      summary: next.summary || "Software developer with hands-on experience building web applications. Skilled in modern tools and collaborative delivery.",
      skills: next.skills?.length ? next.skills : ["Python", "JavaScript", "React", "Problem solving"],
      skill_groups: [{ category: "Core Skills", items: next.skills?.length ? next.skills : ["Python", "JavaScript", "React", "Problem solving"] }],
      section_visibility: {
        ...(next.section_visibility || {}),
        summary: true,
        skills: true,
        experience: true,
      },
    };
    return { content: next, message: "Developer profile applied. Add your name, company, and projects — then tap Polish CV." };
  }
  if (kind === "graduate") {
    next = {
      ...next,
      job_title: next.job_title || "Graduate",
      summary: next.summary || "Recent graduate eager to start a professional career. Strong foundation in academics and ready to learn quickly.",
      education: next.education?.length
        ? next.education
        : [{ degree: "Bachelor's degree", institution: "Your university", field: "", start_date: "", end_date: "", gpa: "", highlights: [] }],
      skills: next.skills?.length ? next.skills : ["Communication", "Teamwork", "MS Office"],
      skill_groups: [{ category: "Core Skills", items: ["Communication", "Teamwork", "MS Office"] }],
      section_visibility: {
        ...(next.section_visibility || {}),
        summary: true,
        education: true,
        skills: true,
      },
    };
    return { content: next, message: "Fresh graduate profile applied. Add your real university and skills — then tap Polish CV." };
  }
  return { content: next, message: "" };
}
