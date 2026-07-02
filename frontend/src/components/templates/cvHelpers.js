export const SECTIONS = [
  "summary", "experience", "education", "projects",
  "skills", "certifications", "languages", "awards",
];

export function getContactLine(contact) {
  return [contact?.email, contact?.phone, contact?.location, contact?.linkedin, contact?.website]
    .filter(Boolean);
}

export function hasCvContent(c) {
  return !!(c?.full_name || c?.summary || c?.experience?.length || c?.skills?.length || c?.education?.length);
}

export function visibleSections(c) {
  const order = c?.section_order || SECTIONS;
  const vis = c?.section_visibility || {};
  return order.filter((s) => vis[s] !== false);
}

export function sectionBlocks(c, sections) {
  const blocks = [];
  for (const section of sections) {
    if (section === "summary" && c.summary) {
      blocks.push({ type: "summary", title: "Summary", text: c.summary });
    }
    if (section === "experience" && c.experience?.length) {
      blocks.push({ type: "experience", title: "Experience", items: c.experience });
    }
    if (section === "education" && c.education?.length) {
      blocks.push({ type: "education", title: "Education", items: c.education });
    }
    if (section === "projects" && c.projects?.length) {
      blocks.push({ type: "projects", title: "Projects", items: c.projects });
    }
    if (section === "skills" && c.skills?.length) {
      blocks.push({ type: "skills", title: "Skills", items: c.skills });
    }
    if (section === "certifications" && c.certifications?.length) {
      blocks.push({ type: "list", title: "Certifications", items: c.certifications });
    }
    if (section === "languages" && c.languages?.length) {
      blocks.push({ type: "chips", title: "Languages", items: c.languages });
    }
    if (section === "awards" && c.awards?.length) {
      blocks.push({ type: "list", title: "Awards", items: c.awards });
    }
  }
  return blocks;
}
