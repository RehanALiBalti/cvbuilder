"""Shared CV JSON schema and AI writing rules for prompts."""

CV_JSON_SCHEMA = """{
  "full_name": "",
  "job_title": "",
  "contact": {"email":"","phone":"","location":"","linkedin":"","website":"","github":""},
  "summary": "",
  "experience": [{
    "company": "", "role": "", "location": "", "start_date": "", "end_date": "",
    "current": false,
    "bullets": ["Achievement-oriented bullet with action verb and impact"]
  }],
  "education": [{
    "institution": "", "degree": "", "field": "", "start_date": "", "end_date": "",
    "gpa": "", "highlights": []
  }],
  "projects": [{
    "name": "", "url": "", "technologies": ["Python","AWS"],
    "description": "One-line impact-focused description",
    "bullets": ["Measurable outcome or technical achievement"]
  }],
  "skills": ["skill1", "skill2"],
  "skill_groups": [
    {"category": "Programming", "items": ["Python", "JavaScript"]},
    {"category": "Cloud & DevOps", "items": ["AWS", "Docker"]},
    {"category": "Soft Skills", "items": ["Leadership", "Communication"]}
  ],
  "certifications": [],
  "languages": [
    {"name": "English", "proficiency": "Fluent"},
    {"name": "Urdu", "proficiency": "Native"}
  ],
  "awards": []
}"""

CV_WRITING_RULES = """
SECTION RULES (modern, clean, ATS-friendly):

1. PROFESSIONAL SUMMARY (field: summary)
   - 3-4 concise lines, third person without "I"
   - Lead with years of experience + core expertise + value proposition
   - Include target role keywords naturally

2. EXPERIENCE (field: experience)
   - Convert responsibilities into achievement-oriented bullets
   - Start each bullet with strong action verbs (Led, Delivered, Optimized, Architected, Increased)
   - Add metrics/impact when user provided numbers; otherwise use reasonable qualitative impact
   - 3-5 bullets per role; never use vague phrases like "responsible for" or "worked on"

3. PROJECTS (field: projects)
   - Clear description + technologies + impact bullets
   - Highlight business/technical outcome, not just tasks

4. SKILLS (fields: skill_groups AND skills)
   - Organize into skill_groups by category (Technical, Tools, Soft Skills, Domain, etc.)
   - Also populate flat skills array with all items combined
   - 8-15 relevant skills when enough context exists

5. CERTIFICATIONS (field: certifications)
   - Use objects: name, issuer, date (year or Mon YYYY)
   - Only include certifications the user explicitly mentioned — never invent
   - Leave certifications as [] unless the user provided certificate names
   - Do not add certifications based on job title or experience alone

6. LANGUAGES (field: languages)
   - Use objects: name + proficiency
   - Proficiency must be one of: Native, Fluent, Professional, Intermediate, Basic
   - Only languages user mentioned

7. MISSING DATA — CRITICAL
   - NEVER fabricate fake employers, degrees, certifications, projects, or contact details
   - Only improve, rephrase, and structure information the user actually provided
   - Leave fields empty if user did not provide that information
   - You may infer reasonable achievement bullets FROM stated responsibilities (not invented jobs)

8. FORMATTING
   - summary must be a plain string, never nested
   - Modern clean prose, no fluff, no clichés ("hard worker", "team player" alone)
   - Consistent date format (e.g. Jan 2020 – Present)
"""
