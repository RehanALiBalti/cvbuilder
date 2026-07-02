export default function CVPreviewSkeleton() {
  return (
    <div className="cv-skeleton" aria-hidden="true">
      <div className="cv-skeleton-line cv-skeleton-line--title" />
      <div className="cv-skeleton-line cv-skeleton-line--subtitle" />
      <div className="cv-skeleton-line cv-skeleton-line--short" />
      <div className="cv-skeleton-gap" />
      <div className="cv-skeleton-line cv-skeleton-line--heading" />
      <div className="cv-skeleton-line" />
      <div className="cv-skeleton-line" />
      <div className="cv-skeleton-line cv-skeleton-line--medium" />
      <div className="cv-skeleton-gap" />
      <div className="cv-skeleton-line cv-skeleton-line--heading" />
      <div className="cv-skeleton-line" />
      <div className="cv-skeleton-line cv-skeleton-line--bullet" />
      <div className="cv-skeleton-line cv-skeleton-line--bullet" />
      <div className="cv-skeleton-line cv-skeleton-line--bullet" />
      <div className="cv-skeleton-gap" />
      <div className="cv-skeleton-line cv-skeleton-line--heading" />
      <div className="cv-skeleton-chips">
        <span /><span /><span /><span /><span />
      </div>
      <p className="cv-skeleton-hint">AI is crafting your CV…</p>
    </div>
  );
}
