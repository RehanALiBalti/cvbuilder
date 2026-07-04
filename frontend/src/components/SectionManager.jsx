const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "certifications", label: "Certificates" },
  { id: "languages", label: "Languages" },
  { id: "awards", label: "Awards" },
];

function hasData(content, id) {
  if (!content) return false;
  if (id === "summary") return Boolean(content.summary?.trim());
  if (id === "skills") return Boolean(content.skills?.length || content.skill_groups?.length);
  const val = content[id];
  return Array.isArray(val) ? val.length > 0 : Boolean(val);
}

export default function SectionManager({ content, onToggle, onAdd, onRemove, disabled }) {
  const visibility = content?.section_visibility || {};

  return (
    <div className="section-manager">
      <div className="section-manager-head">
        <h4>CV sections</h4>
        <p>Show, hide, add, or remove sections instantly</p>
      </div>
      <div className="section-manager-list">
        {SECTIONS.map((s) => {
          const visible = visibility[s.id] !== false;
          const filled = hasData(content, s.id);
          return (
            <div key={s.id} className={`section-manager-row ${visible ? "is-on" : "is-off"}`}>
              <label className="section-manager-toggle">
                <input
                  type="checkbox"
                  checked={visible}
                  disabled={disabled}
                  onChange={() => onToggle(s.id, !visible)}
                />
                <span>{s.label}</span>
                {filled && <em className="section-manager-dot" title="Has content" />}
              </label>
              <div className="section-manager-actions">
                {!filled ? (
                  <button
                    type="button"
                    className="section-manager-btn section-manager-btn--add"
                    disabled={disabled}
                    onClick={() => onAdd(s.id)}
                  >
                    Add
                  </button>
                ) : (
                  <button
                    type="button"
                    className="section-manager-btn section-manager-btn--remove"
                    disabled={disabled}
                    onClick={() => onRemove(s.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
