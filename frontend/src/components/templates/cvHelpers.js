export const SECTIONS = [
  "summary", "experience", "education", "projects",
  "skills", "certifications", "languages", "awards",
];

export function getContactLine(contact) {
  return [contact?.email, contact?.phone, contact?.location, contact?.linkedin, contact?.website, contact?.github]
    .filter(Boolean);
}

export function hasCvContent(c) {
  return !!(
    c?.full_name?.trim() || c?.summary?.trim() || c?.experience?.length ||
    c?.skills?.length || c?.skill_groups?.length || c?.education?.length ||
    c?.projects?.length || c?.job_title?.trim()
  );
}

export function hasProfilePhoto(cv) {
  const photo = cv?.content?.profile_photo;
  return typeof photo === "string" && photo.trim().length > 0;
}

export function getProfilePhotoUrl(cv) {
  const photo = cv?.content?.profile_photo;
  if (!photo || !String(photo).trim()) return null;

  const base = (import.meta.env.VITE_API_URL || import.meta.env.BASE_URL.replace(/\/$/, "")).replace(/\/$/, "");
  if (photo.startsWith("http")) {
    return `${photo}${photo.includes("?") ? "&" : "?"}t=${encodeURIComponent(cv?.updated_at || "")}`;
  }

  const apiPath = photo.startsWith("/") ? photo : `/${photo}`;
  return `${base}${apiPath}?t=${encodeURIComponent(cv?.updated_at || "")}`;
}

export function visibleSections(c) {
  const order = c?.section_order || SECTIONS;
  const vis = c?.section_visibility || {};
  return order.filter((s) => vis[s] !== false);
}

export function getSkillGroups(c) {
  if (c?.skill_groups?.length) return c.skill_groups;
  if (c?.skills?.length) return [{ category: "Core Skills", items: c.skills }];
  return [];
}

export function formatCertification(cert) {
  if (typeof cert === "string") return cert;
  const parts = [cert?.name].filter(Boolean);
  if (cert?.issuer) parts.push(cert.issuer);
  if (cert?.date) parts.push(cert.date);
  return parts.join(" — ");
}

export function formatLanguage(lang) {
  if (typeof lang === "string") return lang;
  if (!lang?.name) return "";
  return lang.proficiency ? `${lang.name} — ${lang.proficiency}` : lang.name;
}

export function sectionBlocks(c, sections) {
  const blocks = [];
  const skillGroups = getSkillGroups(c);

  for (const section of sections) {
    if (section === "summary" && c.summary) {
      blocks.push({ type: "summary", title: "Professional Summary", text: c.summary });
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
    if (section === "skills" && (skillGroups.length || c.skills?.length)) {
      blocks.push({
        type: skillGroups.length > 1 || (skillGroups[0]?.category && skillGroups[0].category !== "Core Skills")
          ? "skill_groups"
          : "skills",
        title: "Skills",
        items: c.skills || [],
        groups: skillGroups,
      });
    }
    if (section === "certifications" && c.certifications?.length) {
      blocks.push({
        type: "certifications",
        title: "Certifications",
        items: c.certifications.map(formatCertification),
      });
    }
    if (section === "languages" && c.languages?.length) {
      blocks.push({
        type: "languages",
        title: "Languages",
        items: c.languages.map(formatLanguage).filter(Boolean),
      });
    }
    if (section === "awards" && c.awards?.length) {
      blocks.push({ type: "list", title: "Awards", items: c.awards });
    }
  }
  return blocks;
}
