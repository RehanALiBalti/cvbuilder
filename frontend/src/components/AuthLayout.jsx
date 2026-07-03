export default function AuthLayout({ children, title, subtitle, perks }) {
  return (
    <div className="auth-page auth-page--animated">
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg-blob auth-bg-blob--1" />
        <div className="auth-bg-blob auth-bg-blob--2" />
      </div>

      <div className="auth-panel auth-panel--brand auth-panel--slide-in">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <ul className="auth-perks">
          {perks.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div className="auth-panel auth-panel--form auth-panel--slide-in auth-panel--delay">
        {children}
      </div>
    </div>
  );
}
