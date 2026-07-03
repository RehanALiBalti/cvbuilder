import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "../lib/firebase";

export async function ensureUserProfile(uid, { name, email }) {
  if (!isFirebaseConfigured) return { plan: "starter" };
  const ref = doc(getFirebaseDb(), "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      name,
      email: email?.toLowerCase(),
      plan: "starter",
      subscription_status: "free",
      createdAt: serverTimestamp(),
      ai_usage_month: "",
      ai_messages_used: 0,
    });
    return { plan: "starter", subscription_status: "free" };
  }
  return snap.data();
}

export function subscribeUserProfile(uid, callback) {
  if (!isFirebaseConfigured || !uid) {
    callback({ plan: "starter", subscription_status: "free" });
    return () => {};
  }
  const ref = doc(getFirebaseDb(), "users", uid);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? snap.data() : { plan: "starter", subscription_status: "free" });
  }, () => callback({ plan: "starter", subscription_status: "free" }));
}

export function planLabel(plan) {
  const map = { starter: "Free", pro: "Pro", business: "Business" };
  return map[plan] || "Free";
}
