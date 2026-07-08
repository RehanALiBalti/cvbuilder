import { useState } from "react";

/**
 * Interactive choice card inside chat (Claude-style).
 * options: { id, label, value?, custom?, skipAlso? }
 */
export default function ChatGuidedChoices({
  guidedChoices,
  disabled,
  onSelect,
  onSkip,
}) {
  const [customText, setCustomText] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  if (!guidedChoices) return null;

  const { title, page = 1, totalPages = 1, options = [], stepId } = guidedChoices;

  function handleOption(opt) {
    if (opt.custom) {
      setShowCustom(true);
      return;
    }
    onSelect(stepId, opt);
  }

  function submitCustom() {
    const text = customText.trim();
    if (!text) return;
    const otherOpt = options.find((o) => o.custom) || { id: "other", custom: true };
    onSelect(stepId, { ...otherOpt, value: text }, text);
    setCustomText("");
    setShowCustom(false);
  }

  return (
    <div className="chat-guided-card">
      <div className="chat-guided-card-head">
        <span className="chat-guided-card-title">{title}</span>
        {totalPages > 1 && (
          <span className="chat-guided-card-page">
            {page} of {totalPages}
          </span>
        )}
      </div>

      {!showCustom ? (
        <ol className="chat-guided-options">
          {options.map((opt, i) => (
            <li key={opt.id}>
              <button
                type="button"
                className="chat-guided-option"
                disabled={disabled}
                onClick={() => handleOption(opt)}
              >
                <span className="chat-guided-option-num">{i + 1}</span>
                <span className="chat-guided-option-label">{opt.label}</span>
                <span className="chat-guided-option-arrow" aria-hidden>→</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="chat-guided-custom">
          <label className="chat-guided-custom-label">
            Type your field or job title
          </label>
          <input
            type="text"
            className="chat-guided-custom-input"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="e.g. Driver, Sales, Accountant, Electrician"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitCustom();
              }
            }}
            autoFocus
          />
          <div className="chat-guided-card-foot">
            <button
              type="button"
              className="btn btn-sm"
              disabled={disabled}
              onClick={() => setShowCustom(false)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={disabled || !customText.trim()}
              onClick={submitCustom}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {!showCustom && (
        <div className="chat-guided-card-foot">
          <button
            type="button"
            className="chat-guided-skip"
            disabled={disabled}
            onClick={onSkip}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
