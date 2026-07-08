import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import TemplateRenderer from "../components/templates/CVTemplates";
import useSeo from "../hooks/useSeo";
import { fetchPublicCv, fetchTemplates } from "../api/client";

export default function PublicCv() {
  const { token } = useParams();
  useSeo({ title: "Shared CV | BuzzCVPilot", noindex: true });
  const [cv, setCv] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pub, tpls] = await Promise.all([
          fetchPublicCv(token),
          fetchTemplates().catch(() => ({ templates: [] })),
        ]);
        if (!alive) return;
        setCv(pub.cv);
        setTemplates(tpls.templates || []);
      } catch (e) {
        if (alive) setError(e.message || "This share link is unavailable.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const template = templates.find((t) => t.id === cv?.template_id) || templates[0];

  return (
    <div className="public-cv-page">
      <header className="public-cv-header">
        <BrandLogo to="/" />
        <Link to="/signup" className="btn btn-primary btn-sm">Build your CV free</Link>
      </header>

      <main className="public-cv-main">
        {loading && <p className="muted">Loading shared CV…</p>}
        {error && (
          <div className="public-cv-error">
            <h1>Link unavailable</h1>
            <p>{error}</p>
            <Link to="/" className="btn btn-primary">Go to BuzzCVPilot</Link>
          </div>
        )}
        {!loading && !error && cv && (
          <>
            <div className="public-cv-meta">
              <h1>{cv.content?.full_name || cv.name || "Shared CV"}</h1>
              <p>{cv.content?.job_title || "Professional resume"}</p>
            </div>
            <div className="public-cv-paper">
              <TemplateRenderer
                cv={{ id: "public", content: cv.content, template_id: cv.template_id, theme_override: cv.theme_override }}
                template={template}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
