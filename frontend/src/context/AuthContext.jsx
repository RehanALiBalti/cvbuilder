import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "../lib/firebase";

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
  };
  return map[code] || err?.message || "Authentication failed.";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return undefined;
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(mapUser(fbUser));
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    isFirebaseConfigured,

    async signup(name, email, password) {
      if (!isFirebaseConfigured) {
        throw new Error("Firebase Auth is not configured.");
      }
      const auth = getFirebaseAuth();
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });

        const profile = mapUser(cred.user);
        profile.name = name.trim();

        await setDoc(doc(getFirebaseDb(), "users", cred.user.uid), {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          plan: "starter",
          createdAt: serverTimestamp(),
        });

        setUser(profile);
        return profile;
      } catch (err) {
        throw new Error(firebaseAuthError(err));
      }
    },

    async login(email, password) {
      if (!isFirebaseConfigured) {
        throw new Error("Firebase Auth is not configured.");
      }
      const auth = getFirebaseAuth();
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const profile = mapUser(cred.user);
        setUser(profile);
        return profile;
      } catch (err) {
        throw new Error(firebaseAuthError(err));
      }
    },

    async logout() {
      if (isFirebaseConfigured) {
        await signOut(getFirebaseAuth());
      }
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
