import { useEffect, useState } from "react";

export default function LandingLoader({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const steps = [12, 28, 52, 74, 88, 100];
    let i = 0;
    const tick = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i]);
        i += 1;
      } else {
        clearInterval(tick);
        setFadeOut(true);
        setTimeout(onDone, 450);
      }
    }, 180);
    return () => clearInterval(tick);
  }, [onDone]);

  return (
    <div className={`landing-loader ${fadeOut ? "landing-loader--out" : ""}`} aria-live="polite">
      <div className="landing-loader-glow" />
      <div className="landing-loader-card">
        <div className="landing-loader-logo">
          <span>CV</span>
        </div>
        <h2>ResumeAI</h2>
        <p>Preparing your CV studio…</p>
        <div className="landing-loader-bar">
          <div className="landing-loader-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="landing-loader-pct">{progress}%</span>
      </div>
    </div>
  );
}
