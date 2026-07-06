import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { submitContact } from "../api/client";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = [
  { value: "complaint", label: "Complaint" },
  { value: "bug", label: "Bug / technical issue" },
  { value: "billing", label: "Billing & subscription" },
  { value: "feature", label: "Feature request" },
  { value: "general", label: "General question" },
];

export default function ContactUs() {
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
    <AppLayout mainClassName="site-main--app">
      <div className="contact-page">
        <div className="contact-hero">
          <p className="contact-eyebrow">Support</p>
          <h1>Contact us</h1>
          <p className="contact-lead">
            Report a problem, share feedback, or ask a question. We usually reply within 1–2 business days.
          </p>
        </div>

        <div className="contact-grid">
          <aside className="contact-aside account-card">
            <h2>Before you write</h2>
            <ul className="contact-tips">
              <li>Include steps to reproduce bugs</li>
              <li>For billing, use the email on your account</li>
              <li>Do not share passwords or card numbers</li>
            </ul>
            {isAuthenticated ? (
              <p className="muted">
                Signed in as <strong>{user?.email}</strong> — your account will be linked to this ticket.
              </p>
            ) : (
              <p className="muted">
                <Link to="/login">Log in</Link> if the issue is about your CVs or subscription.
              </p>
            )}
          </aside>

          <div className="contact-form-card account-card">
            <div className="account-card-head">
              <h2>Send a message</h2>
              <p>Tell us what went wrong or what you need help with.</p>
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
                <label className="auth-field">
                  <span>Your name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                  />
                </label>
                <label className="auth-field">
                  <span>Email</span>
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

              <label className="auth-field">
                <span>Topic</span>
                <select
                  className="contact-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>

              <label className="auth-field">
                <span>Subject (optional)</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Short summary"
                  maxLength={200}
                />
              </label>

              <label className="auth-field">
                <span>Message</span>
                <textarea
                  className="contact-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or feedback in detail..."
                  rows={7}
                  required
                  minLength={10}
                  maxLength={5000}
                />
              </label>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Sending..." : "Submit message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
