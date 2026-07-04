import { Link } from "react-router-dom";

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");

export default function BrandLogo({
  to = "/",
  className = "",
  variant = "default", // default | white
  showText = false,
}) {
  const src = variant === "white" ? `${BASE}logo-white.png` : `${BASE}logo.png`;

  return (
    <Link to={to} className={`brand-logo brand-logo--${variant} ${className}`.trim()} aria-label="BuzzCVPilot">
      <img src={src} alt="BuzzCVPilot" className="brand-logo-img" />
      {showText && <span className="brand-logo-text">BuzzCVPilot</span>}
    </Link>
  );
}
