import { Link } from "react-router-dom";

const LOGO_SRC = `${(import.meta.env.BASE_URL || "/").replace(/\/?$/, "/")}logo.png`;

export default function BrandLogo({ to = "/", className = "", showText = false }) {
  return (
    <Link to={to} className={`brand-logo ${className}`.trim()} aria-label="BuzzCVPilot">
      <img src={LOGO_SRC} alt="BuzzCVPilot" className="brand-logo-img" />
      {showText && <span className="brand-logo-text">BuzzCVPilot</span>}
    </Link>
  );
}
