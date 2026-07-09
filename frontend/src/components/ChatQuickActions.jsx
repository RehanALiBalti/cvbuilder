import { sectionHasData } from "../utils/cvSectionOps";

const ADD_ACTIONS = [
  { id: "education", label: "+ Education" },
  { id: "experience", label: "+ Experience" },
  { id: "skills", label: "+ Skills" },
  { id: "projects", label: "+ Projects" },
  { id: "languages", label: "+ Languages" },
  { id: "certifications", label: "+ Certificates" },
  { id: "summary", label: "+ Summary" },
];

const REMOVE_ACTIONS = [
  { id: "certifications", label: "− Certificates" },
  { id: "projects", label: "− Projects" },
  { id: "languages", label: "− Languages" },
  { id: "awards", label: "− Awards" },
  { id: "summary", label: "− Summary" },
  { id: "experience", label: "− Experience" },
  { id: "education", label: "− Education" },
  { id: "skills", label: "− Skills" },
];

/**
 * onAction({ type, section?, starter?, fillText? })
 * type: add | remove | polish | download | fill | starter
 */
export default function ChatQuickActions({
  content,
  messagesEmpty,
  disabled,
  onAction,
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
          <span className="chat-quick-label">Quick start · type details</span>
          <div className="chat-quick-chips">
            <button
              type="button"
              className="chat-quick-chip chat-quick-chip--start"
              disabled={disabled}
              onClick={() => onAction({ type: "fill", fillText: "My name is " })}
            >
              Start with my name
            </button>
            <button
              type="button"
              className="chat-quick-chip chat-quick-chip--start"
              disabled={disabled}
              onClick={() => onAction({ type: "starter", starter: "professional" })}
            >
              Professional profile
            </button>
            <button
              type="button"
              className="chat-quick-chip chat-quick-chip--start"
              disabled={disabled}
              onClick={() => onAction({ type: "starter", starter: "graduate" })}
            >
              Early career
            </button>
          </div>
        </div>
      )}

      <div className="chat-quick-group chat-quick-group--inline">
        <span className="chat-quick-label">AI tools</span>
        <div className="chat-quick-chips">
          <button
            type="button"
            className="chat-quick-chip chat-quick-chip--ai"
            disabled={disabled}
            onClick={() => onAction({ type: "polish" })}
          >
            Polish CV
          </button>
          <button
            type="button"
            className="chat-quick-chip"
            disabled={disabled}
            onClick={() => onAction({ type: "download" })}
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
