import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import useSeo from "../hooks/useSeo";
import { PAGE_SEO } from "../config/seo";
import { submitContact } from "../api/client";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = [
  { value: "complaint", label: "Complaint", icon: "⚠" },
  { value: "bug", label: "Technical issue", icon: "🔧" },
  { value: "billing", label: "Billing", icon: "💳" },
  { value: "feature", label: "Feature idea", icon: "✨" },
  { value: "general", label: "General", icon: "💬" },
];

const TIPS = [
  { icon: "📝", text: "Include steps to reproduce bugs" },
  { icon: "✉", text: "Use the email on your account for billing" },
  { icon: "🔒", text: "Never share passwords or card numbers" },
];

export default function ContactUs() {
  useSeo(PAGE_SEO.contact);
  const { user, isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user?.name, user?.email]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await submitContact({
        name: name.trim(),
        email: email.trim(),
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      setSuccess(res.message || "Message sent successfully.");
      setSubject("");
      setMessage("");
      if (!isAuthenticated) {
        setName("");
        setEmail("");
      }
    } catch (err) {
      setError(err.message || "Could not send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout mainClassName="site-main--contact">
      <div className="contact-shell">
        <div className="contact-bg" aria-hidden="true">
          <span className="contact-bg-blob contact-bg-blob--1" />
          <span className="contact-bg-blob contact-bg-blob--2" />
        </div>

        <div className="contact-page">
          <header className="contact-hero">
            <div className="contact-hero-copy">
              <span className="contact-eyebrow">Customer support</span>
              <h1>We&apos;re here to help</h1>
              <p className="contact-lead">
                Report an issue, ask about billing, or share feedback. Our team typically responds within 1–2 business days.
              </p>
            </div>
            <div className="contact-hero-badges">
              <div className="contact-stat">
                <strong>24–48h</strong>
                <span>Response time</span>
              </div>
              <div className="contact-stat">
                <strong>Secure</strong>
                <span>Private tickets</span>
              </div>
            </div>
          </header>

          <div className="contact-layout">
            <aside className="contact-panel contact-panel--info">
              <div className="contact-panel-inner">
                <h2>Helpful tips</h2>
                <ul className="contact-tip-list">
                  {TIPS.map((tip) => (
                    <li key={tip.text}>
                      <span className="contact-tip-icon" aria-hidden="true">{tip.icon}</span>
                      <span>{tip.text}</span>
                    </li>
                  ))}
                </ul>

                <div className="contact-account-note">
                  {isAuthenticated ? (
                    <>
                      <span className="contact-account-label">Signed in</span>
                      <p>
                        Tickets are linked to <strong>{user?.email}</strong> for faster support on CVs and billing.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="contact-account-label">Account issues?</span>
                      <p>
                        <Link to="/login">Log in</Link> first if your question is about CVs, templates, or your subscription.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </aside>

            <section className="contact-panel contact-panel--form">
              <div className="contact-panel-inner">
                <div className="contact-form-head">
                  <h2>Send a message</h2>
                  <p>All fields marked with * are required.</p>
                </div>

                {error && (
                  <div className="auth-error auth-error--animated" role="alert">
                    <span className="auth-error-icon">!</span>
                    {error}
                  </div>
                )}
                {success && (
                  <div className="auth-success auth-success--animated" role="status">
                    <span className="auth-success-check">✓</span>
                    {success}
                  </div>
                )}

                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="contact-form-row">
                    <label className="contact-field">
                      <span>Your name *</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Sara Ahmed"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={120}
                      />
                    </label>
                    <label className="contact-field">
                      <span>Email *</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </label>
                  </div>

                  <fieldset className="contact-fieldset">
                    <legend>What is this about? *</legend>
                    <div className="contact-topic-grid" role="radiogroup" aria-label="Topic">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          className={`contact-topic-chip${category === c.value ? " is-active" : ""}`}
                          onClick={() => setCategory(c.value)}
                          aria-pressed={category === c.value}
                        >
                          <span className="contact-topic-chip-icon" aria-hidden="true">{c.icon}</span>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="contact-field">
                    <span>Subject</span>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary of your request"
                      maxLength={200}
                    />
                  </label>

                  <label className="contact-field">
                    <span>Message *</span>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us what happened, what you expected, and any details that will help us assist you..."
                      rows={6}
                      required
                      minLength={10}
                      maxLength={5000}
                    />
                    <span className="contact-char-count">{message.length} / 5000</span>
                  </label>

                  <div className="contact-form-actions">
                    <button type="submit" className="btn btn-primary contact-submit" disabled={loading}>
                      {loading ? "Sending..." : "Submit message"}
                    </button>
                    <p className="contact-form-foot">
                      By submitting, you agree we may contact you at the email provided.
                    </p>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
