import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import {
  ensureUserProfile,
  planLabel,
  subscribeUserProfile,
  updateUserProfileDoc,
} from "../services/userProfile";
import { fetchUserProfile } from "../api/client";

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
    "auth/operation-not-allowed": "This account action is not enabled in Firebase.",
  };
  return map[code] || err?.message || "Authentication failed.";
}

const DEFAULT_PROFILE = {
  plan: "starter",
  subscription_status: "free",
  ai_messages_used: 0,
  ai_messages_limit: 50,
  max_cvs: 1,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
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
        setLoading(false);
        return;
      }

      const mapped = mapUser(fbUser);
      setUser(mapped);

      unsubProfile = subscribeUserProfile(fbUser.uid, (data) => {
        setProfile({
          plan: data.plan || "starter",
          subscription_status: data.subscription_status || "free",
          ai_messages_used: data.ai_messages_used || 0,
          ai_messages_limit: data.ai_messages_limit || 50,
          max_cvs: data.max_cvs || 1,
          ...data,
        });
      });

      try {
        const apiProfile = await fetchUserProfile();
        if (apiProfile?.profile) setProfile((p) => ({ ...p, ...apiProfile.profile }));
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
    plan: profile?.plan || "starter",
    planLabel: planLabel(profile?.plan || "starter"),
    loading,
    isAuthenticated: !!user,
    isFirebaseConfigured,

    async refreshProfile() {
      try {
        const data = await fetchUserProfile();
        if (data?.profile) setProfile((p) => ({ ...p, ...data.profile }));
      } catch {
        /* ignore */
      }
    },

    async updateProfileInfo({ name }) {
      if (!isFirebaseConfigured) throw new Error("Firebase Auth is not configured.");
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
      if (!isFirebaseConfigured) throw new Error("Firebase Auth is not configured.");
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
      if (!isFirebaseConfigured) throw new Error("Firebase Auth is not configured.");
      if (!email?.trim()) throw new Error("Email is required.");
      try {
        await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      } catch (err) {
        throw new Error(firebaseAuthError(err));
      }
    },

    async signup(name, email, password) {
      if (!isFirebaseConfigured) throw new Error("Firebase Auth is not configured.");
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
      if (!isFirebaseConfigured) throw new Error("Firebase Auth is not configured.");
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

    async logout() {
      if (isFirebaseConfigured) await signOut(getFirebaseAuth());
      setUser(null);
      setProfile(DEFAULT_PROFILE);
    },
  }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
