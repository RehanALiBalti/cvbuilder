import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "../lib/firebase";

function chatRef(uid, cvId) {
  return doc(getFirebaseDb(), "users", uid, "cv_chat", cvId);
}

/** Drop auto-welcome bubbles when the user has never sent a message. */
export function normalizeLoadedMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const hasUser = messages.some((m) => m.role === "user");
  if (!hasUser) return [];
  return messages;
}

export async function loadChatHistory(uid, cvId) {
  if (!isFirebaseConfigured || !uid || !cvId) return null;
  try {
    const snap = await getDoc(chatRef(uid, cvId));
    if (!snap.exists()) return null;
    const messages = snap.data()?.messages;
    if (!Array.isArray(messages) || !messages.length) return null;
    return normalizeLoadedMessages(messages);
  } catch {
    return null;
  }
}

export async function saveChatHistory(uid, cvId, messages) {
  if (!isFirebaseConfigured || !uid || !cvId) return;
  try {
    await setDoc(chatRef(uid, cvId), {
      messages,
      updatedAt: serverTimestamp(),
    });
  } catch {
    /* silent — chat still works in session */
  }
}

export function defaultChatMessages() {
  return [];
}
