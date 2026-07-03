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
          <h2>Firebase not configured</h2>
          <p className="muted">Add VITE_FIREBASE_* variables to enable authentication.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
