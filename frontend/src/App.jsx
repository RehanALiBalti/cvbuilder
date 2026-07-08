import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import Account from "./pages/Account";
import CVBuilder from "./pages/CVBuilder";
import ContactUs from "./pages/ContactUs";
import ForgotPassword from "./pages/ForgotPassword";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import PublicCv from "./pages/PublicCv";
import Signup from "./pages/Signup";
import AiCvBuilder from "./pages/seo/AiCvBuilder";
import ResumeBuilder from "./pages/seo/ResumeBuilder";
import CvTemplates from "./pages/seo/CvTemplates";
import AtsCvBuilder from "./pages/seo/AtsCvBuilder";
import Pricing from "./pages/seo/Pricing";
import About from "./pages/seo/About";
import PrivacyPolicy from "./pages/seo/PrivacyPolicy";
import TermsConditions from "./pages/seo/TermsConditions";
import RefundPolicy from "./pages/seo/RefundPolicy";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* Public SEO / marketing pages */}
          <Route path="/ai-cv-builder" element={<AiCvBuilder />} />
          <Route path="/resume-builder" element={<ResumeBuilder />} />
          <Route path="/cv-templates" element={<CvTemplates />} />
          <Route path="/ats-cv-builder" element={<AtsCvBuilder />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsConditions />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/share/:token" element={<PublicCv />} />
          <Route
            path="/builder/account"
            element={(
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/builder"
            element={(
              <ProtectedRoute>
                <CVBuilder />
              </ProtectedRoute>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
