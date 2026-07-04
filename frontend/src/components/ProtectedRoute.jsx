import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, isFirebaseConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
        <p>Signing you in…</p>
      </div>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="auth-page" style={{ placeItems: "center", padding: 48 }}>
        <div className="auth-form-wrap" style={{ textAlign: "center" }}>
          <h2>Sign-in unavailable</h2>
          <p className="muted">Authentication is not available right now. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
