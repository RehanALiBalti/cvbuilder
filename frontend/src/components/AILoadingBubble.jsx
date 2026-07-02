import { useEffect, useState } from "react";

const STEPS = [
  "Reading your message",
  "Writing professional summary",
  "Building experience section",
  "Adding skills & education",
  "Polishing your CV",
];

export default function AILoadingBubble() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="chat-bubble chat-bubble--assistant chat-bubble--loading" role="status" aria-live="polite">
      <div className="ai-loading-header">
        <span className="ai-avatar-pulse">✨</span>
        <span className="chat-role">AI is working</span>
      </div>
      <div className="ai-loading-body">
        <p className="ai-loading-text">{STEPS[step]}…</p>
        <div className="typing-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="ai-loading-bar">
        <div className="ai-loading-bar-fill" />
      </div>
    </div>
  );
}
