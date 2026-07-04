import { computeAtsScore } from "../utils/atsScore";

export default function AtsScoreMeter({ content }) {
  const { score, grade, checks } = computeAtsScore(content);
  const missing = checks.filter((c) => !c.ok).slice(0, 3);

  return (
    <div className="ats-meter">
      <div className="ats-meter-top">
        <div>
          <span className="ats-meter-label">ATS readiness</span>
          <strong className="ats-meter-grade">{grade}</strong>
        </div>
        <div className="ats-meter-score" aria-label={`Score ${score} out of 100`}>
          {score}
          <small>/100</small>
        </div>
      </div>
      <div className="ats-meter-bar">
        <div
          className={`ats-meter-fill ${score >= 70 ? "is-good" : score >= 50 ? "is-ok" : "is-low"}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {missing.length > 0 && (
        <p className="ats-meter-tip">
          Improve: {missing.map((m) => m.label).join(" · ")}
        </p>
      )}
    </div>
  );
}
