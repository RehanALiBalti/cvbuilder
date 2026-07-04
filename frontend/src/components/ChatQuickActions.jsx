const STARTER_PROMPTS = [
  { label: "Start with my name", text: "My name is " },
  { label: "I'm a developer", text: "I am a software developer with 3 years of experience in Python and React." },
  { label: "Fresh graduate", text: "I am a fresh graduate looking for an entry-level role. Help me build a strong CV." },
  { label: "Upload tip", text: "How do I import my existing resume?" },
];

const ADD_ACTIONS = [
  { id: "education", label: "+ Education", text: "Add education to my CV" },
  { id: "experience", label: "+ Experience", text: "Add work experience to my CV" },
  { id: "skills", label: "+ Skills", text: "Add skills to my CV" },
  { id: "projects", label: "+ Projects", text: "Add projects to my CV" },
  { id: "languages", label: "+ Languages", text: "Add languages to my CV" },
  { id: "certifications", label: "+ Certificates", text: "Add certifications to my CV" },
  { id: "summary", label: "+ Summary", text: "Write a professional summary for my CV" },
];

const REMOVE_ACTIONS = [
  { id: "certifications", label: "− Certificates", text: "Remove certifications from my CV" },
  { id: "projects", label: "− Projects", text: "Remove projects from my CV" },
  { id: "languages", label: "− Languages", text: "Remove languages from my CV" },
  { id: "awards", label: "− Awards", text: "Remove awards from my CV" },
  { id: "summary", label: "− Summary", text: "Remove summary from my CV" },
];

const EXTRA_ACTIONS = [
  { label: "Improve summary", text: "Improve my professional summary" },
  { label: "Make it professional", text: "Make my CV more professional and ATS-friendly" },
  { label: "Download PDF", text: "Download PDF" },
];

function sectionHasData(content, id) {
  if (!content) return false;
  if (id === "summary") return Boolean(content.summary?.trim());
  if (id === "skills") return Boolean(content.skills?.length || content.skill_groups?.length);
  const val = content[id];
  return Array.isArray(val) ? val.length > 0 : Boolean(val);
}

export default function ChatQuickActions({
  content,
  messagesEmpty,
  disabled,
  onPick,
}) {
  const removeActions = REMOVE_ACTIONS.filter((a) => sectionHasData(content, a.id));
  const addActions = ADD_ACTIONS.filter((a) => {
    if (a.id === "summary") return !sectionHasData(content, "summary");
    return true;
  });

  return (
    <div className="chat-quick-actions">
      {messagesEmpty && (
        <div className="chat-quick-group">
          <span className="chat-quick-label">Quick start</span>
          <div className="chat-quick-chips">
            {STARTER_PROMPTS.map((a) => (
              <button
                key={a.label}
                type="button"
                className="chat-quick-chip chat-quick-chip--start"
                disabled={disabled}
                onClick={() => onPick(a.text, { send: !a.text.endsWith(" ") })}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-quick-group">
        <span className="chat-quick-label">Add section</span>
        <div className="chat-quick-chips">
          {addActions.map((a) => (
            <button
              key={a.id}
              type="button"
              className="chat-quick-chip chat-quick-chip--add"
              disabled={disabled}
              onClick={() => onPick(a.text, { send: true })}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {removeActions.length > 0 && (
        <div className="chat-quick-group">
          <span className="chat-quick-label">Remove section</span>
          <div className="chat-quick-chips">
            {removeActions.map((a) => (
              <button
                key={a.id}
                type="button"
                className="chat-quick-chip chat-quick-chip--remove"
                disabled={disabled}
                onClick={() => onPick(a.text, { send: true })}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!messagesEmpty && (
        <div className="chat-quick-group">
          <span className="chat-quick-label">More</span>
          <div className="chat-quick-chips">
            {EXTRA_ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                className="chat-quick-chip"
                disabled={disabled}
                onClick={() => onPick(a.text, { send: true })}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
