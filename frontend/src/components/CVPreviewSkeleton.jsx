export default function CVPreviewSkeleton() {
  return (
    <div className="cv-skeleton" aria-hidden="true">
      {/* Header: name, title, contact row */}
      <div className="cv-skeleton-header">
        <div className="cv-skeleton-header-text">
          <div className="cv-skeleton-line cv-skeleton-line--title" />
          <div className="cv-skeleton-line cv-skeleton-line--subtitle" />
        </div>
        <div className="cv-skeleton-avatar" />
      </div>
      <div className="cv-skeleton-contact">
        <span /><span /><span />
      </div>

      <div className="cv-skeleton-divider" />

      {/* Summary */}
      <div className="cv-skeleton-block">
        <div className="cv-skeleton-line cv-skeleton-line--heading" />
        <div className="cv-skeleton-line" />
        <div className="cv-skeleton-line" />
        <div className="cv-skeleton-line cv-skeleton-line--medium" />
      </div>

      {/* Experience */}
      <div className="cv-skeleton-block">
        <div className="cv-skeleton-line cv-skeleton-line--heading" />
        <div className="cv-skeleton-row">
          <div className="cv-skeleton-line cv-skeleton-line--role" />
          <div className="cv-skeleton-line cv-skeleton-line--date" />
        </div>
        <div className="cv-skeleton-line cv-skeleton-line--bullet" />
        <div className="cv-skeleton-line cv-skeleton-line--bullet" />
        <div className="cv-skeleton-row">
          <div className="cv-skeleton-line cv-skeleton-line--role" />
          <div className="cv-skeleton-line cv-skeleton-line--date" />
        </div>
        <div className="cv-skeleton-line cv-skeleton-line--bullet" />
        <div className="cv-skeleton-line cv-skeleton-line--bullet" />
      </div>

      {/* Skills */}
      <div className="cv-skeleton-block">
        <div className="cv-skeleton-line cv-skeleton-line--heading" />
        <div className="cv-skeleton-chips">
          <span /><span /><span /><span /><span /><span />
        </div>
      </div>

      <div className="cv-skeleton-hint">
        <span className="cv-skeleton-hint-dot" />
        AI is crafting your CV…
      </div>
    </div>
  );
}
