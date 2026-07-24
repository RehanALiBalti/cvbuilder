import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import { PLAN_CV_LIMITS } from "../config/pricing";
import { deleteUserAccount, fetchUserProfile } from "../api/client";
import {
  ensureUserProfile,
  planLabel,
  subscribeUserProfile,
  updateUserProfileDoc,
} from "../services/userProfile";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const AuthContext = createContext(null);

function mapUser(fbUser) {
  if (!fbUser) return null;
  return {
    id: fbUser.uid,
    uid: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
    email: fbUser.email || "",
  };
}

function firebaseAuthError(err) {
  const code = err?.code || "";
  const map = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/user-not-found": "Invalid email or password.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/requires-recent-login": "Please log out and log in again before changing this setting.",
    "auth/operation-not-allowed": "This account action is not available right now.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Pop-up blocked. Allow pop-ups for this site and try again.",
    "auth/cancelled-popup-request": "Google sign-in was cancelled.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email. Log in with email/password, then link Google from Account.",
  };
  return map[code] || err?.message || "Authentication failed.";
}

const DEFAULT_PROFILE = {
  plan: "starter",
  subscription_status: "free",
  ai_messages_used: 0,
  ai_messages_limit: 50,
  max_cvs: 5,
  plan_period_end: "",
  plan_expired: false,
  plan_canceling: false,
};

const DEFAULT_FEATURES = {
  billing_enabled: false,
};

const EXPIRED_STATUSES = new Set(["canceled", "expired", "unpaid", "incomplete_expired"]);

function normalizeProfile(data = {}) {
  let plan = data.plan || "starter";
  let status = (data.subscription_status || (plan === "starter" ? "free" : "active")).toLowerCase();
  const periodEnd = data.plan_period_end || "";

  if (plan !== "starter" && EXPIRED_STATUSES.has(status)) {
    plan = "starter";
    status = "expired";
  }
  if (plan !== "starter" && status === "canceling" && periodEnd) {
    const end = new Date(periodEnd);
    if (!Number.isNaN(end.getTime()) && end <= new Date()) {
      plan = "starter";
      status = "expired";
    }
  }

  const limits = {
    starter: { max_cvs: PLAN_CV_LIMITS.starter, ai_messages_limit: 50 },
    pro: { max_cvs: PLAN_CV_LIMITS.pro, ai_messages_limit: 100000 },
    business: { max_cvs: PLAN_CV_LIMITS.business, ai_messages_limit: 100000 },
  };
  const planLimits = limits[plan] || limits.starter;

  return {
    ...data,
    plan,
    subscription_status: status,
    plan_period_end: periodEnd,
    plan_expired: status === "expired" || EXPIRED_STATUSES.has(status),
    plan_canceling: status === "canceling",
    max_cvs: planLimits.max_cvs,
    ai_messages_limit: planLimits.ai_messages_limit,
    ai_messages_used: data.ai_messages_used || 0,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return undefined;
    }

    const auth = getFirebaseAuth();
    let unsubProfile = () => {};

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      unsubProfile();
      if (!fbUser) {
        setUser(null);
        setProfile(DEFAULT_PROFILE);
        setFeatures(DEFAULT_FEATURES);
        setLoading(false);
        return;
      }

      const mapped = mapUser(fbUser);
      setUser(mapped);

      unsubProfile = subscribeUserProfile(fbUser.uid, (data) => {
        setProfile(normalizeProfile(data));
      });

      try {
        const apiProfile = await fetchUserProfile();
        if (apiProfile?.profile) setProfile(normalizeProfile(apiProfile.profile));
        if (apiProfile?.features) setFeatures({ ...DEFAULT_FEATURES, ...apiProfile.features });
      } catch {
        /* Firestore snapshot is fallback */
      }

      setLoading(false);
    });

    return () => {
      unsubAuth();
      unsubProfile();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    features,
    plan: profile?.plan || "starter",
    planLabel: planLabel(profile?.plan || "starter"),
    loading,
    isAuthenticated: !!user,
    isFirebaseConfigured,

    async refreshProfile() {
      try {
        const data = await fetchUserProfile();
        if (data?.profile) setProfile(normalizeProfile(data.profile));
        if (data?.features) setFeatures({ ...DEFAULT_FEATURES, ...data.features });
      } catch {
        /* ignore */
      }
    },

    async updateProfileInfo({ name }) {
      if (!isFirebaseConfigured) throw new Error("Sign-in is temporarily unavailable.");
      const auth = getFirebaseAuth();
      const fbUser = auth.currentUser;
      if (!fbUser) throw new Error("Please sign in again.");
      const cleanName = name.trim();
      if (!cleanName) throw new Error("Name is required.");
      try {
        await updateProfile(fbUser, { displayName: cleanName });
        await updateUserProfileDoc(fbUser.uid, { name: cleanName, email: fbUser.email || "" });
        setUser((prev) => prev ? { ...prev, name: cleanName } : mapUser(fbUser));
      } catch (err) {
        throw new Error(firebaseAuthError(err));
      }
    },

    async changePassword(currentPassword, newPassword) {
      if (!isFirebaseConfigured) throw new Error("Sign-in is temporarily unavailable.");
      const auth = getFirebaseAuth();
      const fbUser = auth.currentUser;
      if (!fbUser?.email) throw new Error("Please sign in again.");
      if (!currentPassword) throw new Error("Current password is required.");
      if (!newPassword || newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters.");
      }
      try {
        const cred = EmailAuthProvider.credential(fbUser.email, currentPassword);
        await reauthenticateWithCredential(fbUser, cred);
        await updatePassword(fbUser, newPassword);
      } catch (err) {
        throw new Error(firebaseAuthError(err));
      }
    },

    async sendPasswordReset(email) {
      if (!isFirebaseConfigured) throw new Error("Sign-in is temporarily unavailable.");
      if (!email?.trim()) throw new Error("Email is required.");
      try {
        await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      } catch (err) {
        throw new Error(firebaseAuthError(err));
      }
    },

    async signup(name, email, password) {
      if (!isFirebaseConfigured) throw new Error("Sign-in is temporarily unavailable.");
      const auth = getFirebaseAuth();
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await ensureUserProfile(cred.user.uid, { name: name.trim(), email: email.trim() });
        const mapped = mapUser(cred.user);
        mapped.name = name.trim();
        setUser(mapped);
        return mapped;
      } catch (err) {
        throw new Error(firebaseAuthError(err));
      }
    },

    async login(email, password) {
      if (!isFirebaseConfigured) throw new Error("Sign-in is temporarily unavailable.");
      const auth = getFirebaseAuth();
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const mapped = mapUser(cred.user);
        await ensureUserProfile(cred.user.uid, { name: mapped.name, email: mapped.email });
        setUser(mapped);
        return mapped;
      } catch (err) {
        throw new Error(firebaseAuthError(err));
      }
    },

    async loginWithGoogle() {
      if (!isFirebaseConfigured) throw new Error("Sign-in is temporarily unavailable.");
      const auth = getFirebaseAuth();
      try {
        const cred = await signInWithPopup(auth, googleProvider);
        const mapped = mapUser(cred.user);
        await ensureUserProfile(cred.user.uid, {
          name: mapped.name,
          email: mapped.email,
        });
        setUser(mapped);
        return mapped;
      } catch (err) {
        throw new Error(firebaseAuthError(err));
      }
    },

    async logout() {
      if (isFirebaseConfigured) await signOut(getFirebaseAuth());
      setUser(null);
      setProfile(DEFAULT_PROFILE);
      setFeatures(DEFAULT_FEATURES);
    },

    async deleteAccount() {
      if (!isFirebaseConfigured) throw new Error("Account deletion is temporarily unavailable.");
      try {
        await deleteUserAccount();
        await signOut(getFirebaseAuth()).catch(() => {});
        setUser(null);
        setProfile(DEFAULT_PROFILE);
        setFeatures(DEFAULT_FEATURES);
      } catch (err) {
        throw new Error(firebaseAuthError(err));
      }
    },
  }), [user, profile, features, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
