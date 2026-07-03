import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "../lib/firebase";

export const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I'm your CV assistant — chat naturally, whether you're sharing experience or just saying hello.\n\n" +
    "**Get started:**\n" +
    "• Type your details, or **Upload CV** (PDF/Word) to import an existing resume\n" +
    "• **Profile photo** — adds your picture to the CV header\n" +
    "• `list templates` · `recommend template for developer` · `create custom template blue and gold`\n\n" +
    "Say `download PDF` when ready.",
};

function chatRef(uid, cvId) {
  return doc(getFirebaseDb(), "users", uid, "cv_chat", cvId);
}

export async function loadChatHistory(uid, cvId) {
  if (!isFirebaseConfigured || !uid || !cvId) return null;
  try {
    const snap = await getDoc(chatRef(uid, cvId));
    if (!snap.exists()) return null;
    const messages = snap.data()?.messages;
    return Array.isArray(messages) && messages.length ? messages : null;
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

export function defaultChatMessages(cvName, templateName) {
  return [
    WELCOME_MESSAGE,
    {
      role: "assistant",
      content: templateName
        ? `Started with **${templateName}** template. Upload your CV or photo, or type your details.`
        : `Opened "${cvName}". Tell me what to add or change, or say "download PDF" when ready.`,
    },
  ];
}
