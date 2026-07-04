/** Local ATS score — no AI. */

export function computeAtsScore(content = {}) {
  const checks = [];
  let score = 0;

  const add = (ok, points, label) => {
    checks.push({ ok: Boolean(ok), label, points });
    if (ok) score += points;
  };

  add(content.full_name?.trim(), 10, "Full name");
  add(content.job_title?.trim(), 8, "Job title");
  add(content.contact?.email?.trim(), 10, "Email");
  add(content.contact?.phone?.trim(), 6, "Phone");
  add(content.contact?.location?.trim(), 4, "Location");
  add(content.summary?.trim() && content.summary.trim().length >= 40, 12, "Professional summary");
  add(content.experience?.length > 0, 14, "Work experience");
  add(
    (content.experience || []).some((e) => (e.bullets || []).some((b) => (b || "").trim().length >= 20)),
    8,
    "Achievement bullets",
  );
  add(content.education?.length > 0, 10, "Education");
  add((content.skills?.length || 0) >= 3 || (content.skill_groups || []).length > 0, 10, "Skills (3+)");
  add(content.contact?.linkedin?.trim() || content.contact?.github?.trim(), 4, "LinkedIn or GitHub");
  add((content.languages || []).length > 0, 2, "Languages");
  add((content.certifications || []).length > 0 || (content.projects || []).length > 0, 2, "Projects or certificates");

  const total = Math.min(100, score);
  let grade = "Needs work";
  if (total >= 85) grade = "Excellent";
  else if (total >= 70) grade = "Strong";
  else if (total >= 50) grade = "Good start";

  return { score: total, grade, checks };
}
