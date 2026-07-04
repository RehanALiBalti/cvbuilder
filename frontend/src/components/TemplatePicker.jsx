export default function TemplatePicker({ templates, activeId, onSelect, onClose, plan }) {
  const subtitle =
    plan === "business"
      ? "All templates unlocked on Business"
      : plan === "pro"
        ? "15 templates on Pro — upgrade to Business for custom themes"
        : "Choose a template";

  return (
    <div className="template-picker-overlay" onClick={onClose} role="presentation">
      <div className="template-picker" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Choose CV template">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Choose a template</h2>
            <p className="muted">{subtitle}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="template-picker-grid">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`template-card ${activeId === t.id ? "is-active" : ""}`}
              onClick={() => { onSelect(t.id); onClose(); }}
            >
              <div className={`template-card-preview tprev-${t.id}`} />
              <div className="template-card-info">
                <strong>{t.name}</strong>
                <span>{t.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
