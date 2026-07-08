import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import PlanStatusBanner from "../components/PlanStatusBanner";
import AILoadingBubble from "../components/AILoadingBubble";
import AtsScoreMeter from "../components/AtsScoreMeter";
import ChatQuickActions from "../components/ChatQuickActions";
import CVPreviewSkeleton from "../components/CVPreviewSkeleton";
import GuidedBuilder from "../components/GuidedBuilder";
import SectionManager from "../components/SectionManager";
import TemplatePicker from "../components/TemplatePicker";
import TemplateRenderer from "../components/templates/CVTemplates";
import UploadBar from "../components/UploadBar";
import useSeo from "../hooks/useSeo";
import { useAuth } from "../context/AuthContext";
import {
  canUseTemplates,
  cvLimitForPlan,
  formatCvLimit,
  isFreePlan,
  templatesForPlan,
} from "../config/pricing";
import {
  loadChatHistory,
  saveChatHistory,
} from "../services/chatHistory";
import { exportCvPreview } from "../utils/exportCv";
import {
  applyGuidedAnswer,
  buildGuidedCompleteMessage,
  buildGuidedQuestion,
  buildGuidedWelcome,
  extractIdentityFromMessage,
  getNextGuidedStep,
  isBuildNowMessage,
  isSkipMessage,
  messageProvidesBulkData,
  shouldStartGuidedFlow,
} from "../utils/chatGuidedFlow";
import {
  applySectionAnswer,
  applyStarterProfile,
  getNextSteps,
  removeSection,
  SECTION_PROMPTS,
  sectionLabel,
  suggestionToSection,
  tryApplyFreeTextLocally,
} from "../utils/cvSectionOps";
import {
  closeDialog,
  confirmDeleteCv,
  showDeleteError,
  showDeleteProgress,
  showDeleteSuccess,
  showUpgradePopup,
} from "../utils/confirmDialog";
import {
  aiChat,
  aiCoverLetter,
  aiPolish,
  createCV,
  deleteCV,
  disableShare,
  duplicateCV,
  enableShare,
  fetchCVs,
  fetchTemplates,
  getCV,
  updateCV,
  uploadCvFile,
  uploadProfilePhoto,
} from "../api/client";

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "modern", label: "Modern" },
  { id: "executive", label: "Executive" },
  { id: "fresh_graduate", label: "Fresh Graduate" },
];

function applyChatCvUpdates(cv, data) {
  if (!data) return cv;
  const next = { ...cv };
  if (data.content) {
    next.content = data.content;
    if (data.content.full_name) next.name = `${data.content.full_name} CV`;
  }
  if (data.template_id) next.template_id = data.template_id;
  if (Object.prototype.hasOwnProperty.call(data, "theme_override")) {
    next.theme_override = data.theme_override;
  }
  return next;
}

function detectExportIntent(text) {
  const t = (text || "").toLowerCase();
  if (/download.*pdf|export.*pdf|pdf.*download/.test(t)) return "export_pdf";
  if (/download.*docx|download.*word|export.*docx|export.*word/.test(t)) return "export_docx";
  return null;
}

export default function CVBuilder() {
  useSeo({ title: "My CVs | BuzzCVPilot", path: "/builder", noindex: true });
  const { user, plan, planLabel, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("list");
  const [cvs, setCvs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeCv, setActiveCv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [buildMode, setBuildMode] = useState("chat"); // guided | chat
  const [generating, setGenerating] = useState(false);
  const [pendingSection, setPendingSection] = useState(null); // education | skills | ...
  const [guidedChat, setGuidedChat] = useState({
    active: false,
    awaiting: null,
    skipped: [],
  });
  const chatEndRef = useRef(null);
  const previewRef = useRef(null);
  const inputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const undoStackRef = useRef([]);
  const [saveState, setSaveState] = useState("saved"); // saving | saved
  const [shareUrl, setShareUrl] = useState("");

  const activeTemplate = templates.find((t) => t.id === activeCv?.template_id) || templates[0];

  useEffect(() => {
    fetchTemplates().then((d) => setTemplates(d.templates || [])).catch(() => {});
  }, []);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setCvs([]);
      setActiveCv(null);
      setMessages([]);
      setView("list");
      return;
    }
    loadCVs();
    refreshProfile();
  }, [user?.uid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    setGuidedChat({ active: false, awaiting: null, skipped: [] });
  }, [activeCv?.id]);

  async function persistChat(cvId, msgs) {
    if (user?.uid && cvId) await saveChatHistory(user.uid, cvId, msgs);
  }

  async function handleDeleteCv(cv) {
    const confirmed = await confirmDeleteCv(cv.name);
    if (!confirmed) return;

    setDeletingId(cv.id);
    showDeleteProgress();
    try {
      await deleteCV(cv.id);
      if (activeCv?.id === cv.id) {
        setActiveCv(null);
        setMessages([]);
        setView("list");
      }
      setCvs((prev) => prev.filter((c) => c.id !== cv.id));
      closeDialog();
      await showDeleteSuccess();
    } catch (e) {
      closeDialog();
      await showDeleteError(e.message);
      await loadCVs();
    } finally {
      setDeletingId(null);
    }
  }

  async function loadCVs() {
    try {
      const data = await fetchCVs();
      setCvs(data.cvs || []);
    } catch {
      setCvs([]);
    }
  }

  function saveCv(cv) {
    if (!cv?.id) return;
    setSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await updateCV(cv.id, {
          name: cv.name,
          template_id: cv.template_id,
          tone: cv.tone,
          content: cv.content,
          theme_override: cv.theme_override ?? null,
        });
        setSaveState("saved");
      } catch {
        setSaveState("saved");
      }
    }, 450);
  }

  async function triggerDownload(type, cv) {
    if (!cv) return;
    if (loading) {
      setToast("Please wait — CV preview is still updating.");
      return;
    }
    const el = previewRef.current;
    if (!el) {
      setToast("CV preview is not ready yet.");
      return;
    }
    const name = cv.content?.full_name || cv.name || "CV";
    setExporting(true);
    setToast(type === "export_pdf" ? "Generating styled PDF…" : "Generating styled Word file…");
    try {
      await exportCvPreview(el, type, name, cv.id);
      setToast(type === "export_pdf" ? "PDF downloaded (with your template)" : "Word file downloaded (with your template)");
    } catch (e) {
      setToast(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function openCV(id) {
    setLoading(true);
    try {
      const data = await getCV(id);
      const cv = data.cv;
      setActiveCv(cv);
      const saved = user?.uid ? await loadChatHistory(user.uid, id) : null;
      setMessages(saved ?? []);
      setBuildMode("chat");
      setPendingSection(null);
      if (cv?.is_public && cv?.share_token) {
        const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
        setShareUrl(`${window.location.origin}${base}share/${cv.share_token}`);
      } else {
        setShareUrl("");
      }
      setView("chat");
      undoStackRef.current = [];
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  function cvLimitMessage() {
    if (isFreePlan(plan)) {
      return "Basic plan includes 5 CVs. Upgrade to Pro for up to 10 CVs, or Business for unlimited CVs.";
    }
    if (plan === "pro") {
      return "Pro plan includes 10 CVs. Upgrade to Business for unlimited CVs.";
    }
    return "You have reached your CV limit for this plan.";
  }

  async function ensureCanAddCv(actionLabel = "create more CVs") {
    const maxCvs = cvLimitForPlan(plan, profile?.max_cvs);
    if (cvs.length < maxCvs) return true;
    const goUpgrade = await showUpgradePopup({
      title: `Upgrade to ${actionLabel}`,
      text: cvLimitMessage(),
      confirmText: "View plans",
    });
    if (goUpgrade) navigate("/builder/account");
    return false;
  }

  async function handleCreate() {
    if (!(await ensureCanAddCv("create more CVs"))) return;

    setLoading(true);
    try {
      const data = await createCV({ name: "New CV", template_id: "random" });
      await loadCVs();
      await refreshProfile();
      const cv = data.cv;
      setActiveCv(cv);
      setMessages([]);
      setBuildMode("chat");
      setPendingSection(null);
      setView("chat");
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("Upgrade") || msg.includes("includes") || msg.includes("limit")) {
        const goUpgrade = await showUpgradePopup({
          title: "Upgrade to create more CVs",
          text: cvLimitMessage(),
          confirmText: "View plans",
        });
        if (goUpgrade) navigate("/builder/account");
      } else {
        setToast(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate(cv) {
    if (!(await ensureCanAddCv("duplicate this CV"))) return;

    try {
      await duplicateCV(cv.id);
      await loadCVs();
      await refreshProfile();
      setToast("CV duplicated");
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("Upgrade") || msg.includes("includes") || msg.includes("limit")) {
        const goUpgrade = await showUpgradePopup({
          title: "Upgrade to duplicate this CV",
          text: cvLimitMessage(),
          confirmText: "View plans",
        });
        if (goUpgrade) navigate("/builder/account");
      } else {
        setToast(msg || "Could not duplicate CV");
      }
    }
  }

  async function handleCvUpload(file) {
    if (!activeCv || loading) return;
    setLoading(true);
    setToast("Processing your CV file…");
    try {
      const result = await uploadCvFile(activeCv.id, file);
      const updated = result.cv;
      setActiveCv(updated);
      await saveCv(updated);
      await loadCVs();
      setMessages((prev) => {
        const next = [
          ...prev,
          { role: "user", content: `[Uploaded CV: ${file.name}]` },
          { role: "assistant", content: result.reply || result.message || "CV imported." },
        ];
        persistChat(activeCv.id, next);
        return next;
      });
      setToast("CV imported from file");
    } catch (e) {
      setToast(e.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Could not process CV file: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUpload(file) {
    if (!activeCv || loading) return;
    setLoading(true);
    setToast("Uploading photo…");
    try {
      const result = await uploadProfilePhoto(activeCv.id, file);
      const updated = { ...result.cv, updated_at: new Date().toISOString() };
      if (!updated.content?.profile_photo) {
        updated.content = { ...updated.content, profile_photo: `/api/cvs/${activeCv.id}/photo` };
      }
      setActiveCv(updated);
      await saveCv(updated);
      setMessages((prev) => {
        const next = [
          ...prev,
          { role: "user", content: "[Uploaded profile photo]" },
          { role: "assistant", content: result.reply || "Profile photo added to your CV." },
        ];
        persistChat(activeCv.id, next);
        return next;
      });
      setToast("Profile photo updated");
    } catch (e) {
      setToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  function persistCvContent(content) {
    if (!activeCv) return;
    pushUndoSnapshot();
    const name = content.full_name ? `${content.full_name} CV` : activeCv.name;
    const next = {
      ...activeCv,
      name,
      content,
      updated_at: new Date().toISOString(),
    };
    setActiveCv(next);
    saveCv(next);
    return next;
  }

  function appendChatMessages(newMsgs) {
    if (!activeCv?.id) return;
    setMessages((prev) => {
      const next = [...prev, ...newMsgs];
      persistChat(activeCv.id, next);
      return next;
    });
  }

  function askNextGuidedQuestion(content, { includeWelcome = false, skipped = [] } = {}) {
    const step = getNextGuidedStep(content, skipped);
    if (!step) {
      finishGuidedChat(content);
      return;
    }
    const q = buildGuidedQuestion(step, content);
    const assistantText = `${includeWelcome ? buildGuidedWelcome(content) : ""}${q.text}`;
    setGuidedChat((g) => ({ ...g, active: true, awaiting: step, skipped }));
    appendChatMessages([
      { role: "assistant", content: assistantText, guidedActions: q.actions },
    ]);
    focusAnswerInput();
  }

  function finishGuidedChat(content) {
    setGuidedChat({ active: false, awaiting: null, skipped: [] });
    appendChatMessages([
      {
        role: "assistant",
        content: buildGuidedCompleteMessage(content),
        guidedActions: ["Polish CV", "Download PDF"],
      },
    ]);
  }

  function startGuidedChatFlow(userText, content) {
    setInput("");
    appendChatMessages([{ role: "user", content: userText }]);
    persistCvContent(content);
    setGuidedChat({ active: true, awaiting: null, skipped: [] });
    askNextGuidedQuestion(content, { includeWelcome: true });
  }

  function handleGuidedChatTurn(text) {
    const skipped = guidedChat.skipped || [];
    const awaiting = guidedChat.awaiting;

    if (isBuildNowMessage(text)) {
      setInput("");
      appendChatMessages([{ role: "user", content: text }]);
      let content = activeCv.content;
      if (awaiting && !isSkipMessage(text)) {
        const applied = applyGuidedAnswer(content, awaiting, text);
        content = applied.content;
        persistCvContent(content);
      }
      finishGuidedChat(content);
      return true;
    }

    if (isSkipMessage(text)) {
      setInput("");
      const nextSkipped = awaiting ? [...skipped, awaiting] : skipped;
      appendChatMessages([
        { role: "user", content: text },
        { role: "assistant", content: "No problem — let's move on." },
      ]);
      setGuidedChat((g) => ({ ...g, skipped: nextSkipped, awaiting: null }));
      askNextGuidedQuestion(activeCv.content, { skipped: nextSkipped });
      return true;
    }

    if (!awaiting) return false;

    const result = applyGuidedAnswer(activeCv.content, awaiting, text);
    const { content, message, treatAsSkip } = result;
    setInput("");
    appendChatMessages([
      { role: "user", content: text },
      { role: "assistant", content: message },
    ]);
    persistCvContent(content);
    const nextSkipped = treatAsSkip ? [...skipped, awaiting] : skipped;
    setGuidedChat((g) => ({ ...g, awaiting: null, skipped: nextSkipped }));
    askNextGuidedQuestion(content, { skipped: nextSkipped });
    return true;
  }

  async function sendMessage(presetText) {
    const text = (typeof presetText === "string" ? presetText : input).trim();
    if (!text || loading || !activeCv || generating) return;
    if (typeof presetText === "string") setInput("");

    // Section button flow: attach typed answer to CV (no AI)
    if (pendingSection) {
      const sectionId = pendingSection;
      const { content, message } = applySectionAnswer(activeCv.content, sectionId, text);
      setPendingSection(null);
      setInput("");
      applyContentLocally(content, message, { userNote: text });
      return;
    }

    // Exit guided mode if user pastes a full CV paragraph — let AI handle it
    if (guidedChat.active && messageProvidesBulkData(text)) {
      setGuidedChat({ active: false, awaiting: null, skipped: [] });
    }

    // Guided chat: one question at a time, skip allowed
    if (guidedChat.active && (guidedChat.awaiting || isSkipMessage(text) || isBuildNowMessage(text))) {
      if (handleGuidedChatTurn(text)) return;
    }

    // Start guided chat on intro / "make my cv"
    if (!guidedChat.active && shouldStartGuidedFlow(text, activeCv.content)) {
      let content = { ...activeCv.content, ...extractIdentityFromMessage(text) };
      startGuidedChatFlow(text, content);
      return;
    }

    // Fast path: email, phone, name, skills list, links — no AI wait
    if (!guidedChat.active) {
      const localApply = tryApplyFreeTextLocally(activeCv.content, text);
      if (localApply) {
        setInput("");
        applyContentLocally(localApply.content, localApply.message, { userNote: text });
        return;
      }
    }

    // Download intent without AI
    const localExportOnly = detectExportIntent(text);
    if (localExportOnly) {
      setInput("");
      setMessages((prev) => {
        const next = [
          ...prev,
          { role: "user", content: text },
          { role: "assistant", content: "Starting your download…" },
        ];
        persistChat(activeCv.id, next);
        return next;
      });
      triggerDownload(localExportOnly, activeCv);
      return;
    }

    const userMsg = { role: "user", content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    const localExport = detectExportIntent(text);
    let cvForExport = null;
    let exportAction = null;

    try {
      const cvForChat = activeCv;

      const result = await aiChat({
        message: text,
        history: messages.filter((m) => m.role === "user" || m.role === "assistant"),
        content: cvForChat.content,
        tone: cvForChat.tone,
        template_id: cvForChat.template_id,
        theme_override: cvForChat.theme_override || null,
      });

      const action = result.data?.action || localExport;

      pushUndoSnapshot(cvForChat);
      const updated = applyChatCvUpdates(cvForChat, result.data);
      setActiveCv(updated);
      cvForExport = updated;
      saveCv(updated);
      if (result.data?.content) await loadCVs();

      const reply = result.data?.reply || result.message || "Done.";
      const suggestions = result.suggestions || result.data?.missing_sections || [];
      setMessages((prev) => {
        const next = [
          ...prev,
          { role: "assistant", content: reply, suggestions: suggestions.length ? suggestions : undefined },
        ];
        persistChat(activeCv.id, next);
        return next;
      });
      await refreshProfile();

      if (action === "export_pdf" || action === "export_docx") {
        exportAction = action;
      }
    } catch (e) {
      const errMsg = e.message || "Something went wrong";
      setMessages((prev) => {
        const next = [...prev, { role: "assistant", content: `Sorry: ${errMsg}` }];
        if (activeCv?.id) persistChat(activeCv.id, next);
        return next;
      });
      if (errMsg.includes("Upgrade") || errMsg.includes("limit")) {
        setToast(`${errMsg} — visit Account to upgrade.`);
      }
    } finally {
      setLoading(false);
    }

    if (exportAction && cvForExport) {
      setTimeout(() => triggerDownload(exportAction, cvForExport), 350);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function appendLocalAssistant(message) {
    if (!activeCv?.id || !message) return;
    setMessages((prev) => {
      const next = [...prev, { role: "assistant", content: message }];
      persistChat(activeCv.id, next);
      return next;
    });
  }

  function pushUndoSnapshot(cv = activeCv) {
    if (!cv) return;
    undoStackRef.current.push(JSON.parse(JSON.stringify({
      content: cv.content,
      name: cv.name,
      template_id: cv.template_id,
      theme_override: cv.theme_override ?? null,
    })));
    if (undoStackRef.current.length > 40) undoStackRef.current.shift();
  }

  function handleUndo() {
    const prev = undoStackRef.current.pop();
    if (!prev || !activeCv) {
      setToast("Nothing to undo");
      return;
    }
    const next = {
      ...activeCv,
      ...prev,
      updated_at: new Date().toISOString(),
    };
    setActiveCv(next);
    saveCv(next);
    setToast("Undid last change");
  }

  function applyContentLocally(content, message, { userNote } = {}) {
    if (!activeCv) return;
    pushUndoSnapshot();
    const name = content.full_name ? `${content.full_name} CV` : activeCv.name;
    const next = {
      ...activeCv,
      name,
      content,
      updated_at: new Date().toISOString(),
    };
    setActiveCv(next);
    saveCv(next);
    if (userNote) {
      setMessages((prev) => {
        const msgs = [
          ...prev,
          { role: "user", content: userNote },
          { role: "assistant", content: message },
        ];
        persistChat(activeCv.id, msgs);
        return msgs;
      });
    } else {
      appendLocalAssistant(message);
    }
    setToast(message);
  }

  function focusAnswerInput() {
    const focus = () => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    requestAnimationFrame(focus);
    setTimeout(focus, 50);
    setTimeout(focus, 150);
  }

  function handleQuickPick(text, { send = false } = {}) {
    if (!text) return;

    if (text === "Skip for now") {
      sendMessage("skip");
      return;
    }
    if (text === "Build CV now") {
      sendMessage("build cv now");
      return;
    }
    if (text === "Polish CV") {
      handleChatAction({ type: "polish" });
      return;
    }
    if (text === "Download PDF") {
      handleChatAction({ type: "download" });
      return;
    }

    // Suggestion chips → same as + Education: ask, focus input, attach on Send
    const section = suggestionToSection(text);
    if (section) {
      askForSectionDetails(section);
      return;
    }
    if (send) {
      sendMessage(text);
      return;
    }
    setInput(text);
    focusAnswerInput();
  }

  function handleChatAction(action) {
    if (!activeCv || loading || generating) return;
    const { type, section, starter, fillText } = action || {};

    if (type === "fill") {
      // "Start with my name" — ask in the answer box
      askForSectionDetails("name");
      return;
    }

    if (type === "download") {
      triggerDownload("export_pdf", activeCv);
      return;
    }

    // Every + section button: ask → focus input → attach on Send
    if (type === "add" && section) {
      askForSectionDetails(section);
      return;
    }

    if (type === "remove" && section) {
      const { content, message } = removeSection(activeCv.content, section);
      setPendingSection(null);
      applyContentLocally(content, message, { userNote: `Remove ${sectionLabel(section)}` });
      return;
    }

    // Starter profiles also collect details in the focused input
    if (type === "starter" && starter) {
      askForSectionDetails(starter === "graduate" ? "graduate" : "professional");
      return;
    }

    if (type === "polish") {
      handleGuidedGenerate(activeCv.content);
    }
  }

  function handleSectionToggle(sectionId, visible) {
    if (!activeCv) return;
    pushUndoSnapshot();
    const visibility = {
      ...(activeCv.content?.section_visibility || {}),
      [sectionId]: visible,
    };
    const next = {
      ...activeCv,
      content: { ...activeCv.content, section_visibility: visibility },
      updated_at: new Date().toISOString(),
    };
    setActiveCv(next);
    saveCv(next);
    setToast(visible ? `${sectionLabel(sectionId)} shown` : `${sectionLabel(sectionId)} hidden`);
  }

  async function handleShareToggle() {
    if (!activeCv) return;
    try {
      if (activeCv.is_public && activeCv.share_token) {
        const res = await disableShare(activeCv.id);
        setActiveCv(res.cv);
        setShareUrl("");
        setToast("Share link disabled");
        return;
      }
      const res = await enableShare(activeCv.id);
      setActiveCv(res.cv);
      const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
      const url = res.url?.startsWith("http")
        ? res.url
        : `${window.location.origin}${base}share/${res.share_token}`;
      setShareUrl(url);
      await navigator.clipboard?.writeText(url);
      setToast("Share link copied");
    } catch (e) {
      setToast(e.message || "Could not update share link");
    }
  }

  async function handleCoverLetter() {
    if (!activeCv) return;
    if (plan !== "business") {
      const go = await showUpgradePopup({
        title: "Business feature",
        text: "Cover letter generation is available on the Business plan.",
        confirmText: "View plans",
      });
      if (go) navigate("/builder/account");
      return;
    }
    const company = window.prompt("Company name for the cover letter:", "");
    if (company === null) return;
    const jobTitle = window.prompt("Job title:", activeCv.content?.job_title || "") || activeCv.content?.job_title || "";
    setGenerating(true);
    try {
      const result = await aiCoverLetter({
        content: activeCv.content,
        job_title: jobTitle,
        company: company || "the company",
        job_description: "",
        tone: activeCv.tone || "professional",
      });
      const body = result.data?.body || result.data?.cover_letter || result.message || "Cover letter ready.";
      setMessages((prev) => {
        const next = [...prev, { role: "assistant", content: `Cover letter for ${company || "the role"}:\n\n${body}` }];
        persistChat(activeCv.id, next);
        return next;
      });
      setToast("Cover letter generated");
    } catch (e) {
      setToast(e.message || "Cover letter failed");
    } finally {
      setGenerating(false);
    }
  }

  function askForSectionDetails(sectionId) {
    if (!activeCv) return;
    const prompt = SECTION_PROMPTS[sectionId];
    if (!prompt) return;

    const titles = {
      name: "Add name",
      professional: "Professional profile",
      graduate: "Early career profile",
      email: "Add email",
      phone: "Add phone",
      links: "Add profile links",
      location: "Add location",
    };
    const title = titles[sectionId] || `Add ${sectionLabel(sectionId)}`;

    setPendingSection(sectionId);
    setInput("");
    setMessages((prev) => {
      const next = [
        ...prev,
        { role: "user", content: title },
        { role: "assistant", content: prompt.ask },
      ];
      persistChat(activeCv.id, next);
      return next;
    });
    setToast("Type in the box below, then Add to CV");
    focusAnswerInput();
  }

  function handleSectionAdd(sectionId) {
    askForSectionDetails(sectionId);
  }

  function handleSectionRemove(sectionId) {
    if (!activeCv) return;
    const { content, message } = removeSection(activeCv.content, sectionId);
    setPendingSection(null);
    applyContentLocally(content, message, { userNote: `Remove ${sectionLabel(sectionId)}` });
  }

  function handleGuidedLiveUpdate(content) {
    if (!activeCv) return;
    const name = content.full_name ? `${content.full_name} CV` : activeCv.name;
    const next = {
      ...activeCv,
      name,
      content,
      updated_at: new Date().toISOString(),
    };
    setActiveCv(next);
    saveCv(next);
  }

  async function handleGuidedGenerate(content) {
    if (!activeCv || generating) return;
    setGenerating(true);
    setToast("Polishing your CV with AI (one pass)…");
    try {
      pushUndoSnapshot();
      const name = content.full_name ? `${content.full_name} CV` : activeCv.name;
      const draft = { ...activeCv, name, content, updated_at: new Date().toISOString() };
      setActiveCv(draft);
      saveCv(draft);

      const result = await aiPolish({ content, tone: activeCv.tone || "professional" });
      if (!result.success) {
        throw new Error(result.message || "Could not generate CV");
      }
      const polished = result.data?.content || content;
      const updated = {
        ...draft,
        name: polished.full_name ? `${polished.full_name} CV` : draft.name,
        content: polished,
        updated_at: new Date().toISOString(),
      };
      setActiveCv(updated);
      await saveCv(updated);
      await loadCVs();
      await refreshProfile();

      const reply = result.data?.reply || result.message || "Your professional CV is ready.";
      const msgs = [
        { role: "assistant", content: reply, suggestions: result.suggestions },
      ];
      setMessages(msgs);
      await persistChat(activeCv.id, msgs);
      setBuildMode("chat");
      setToast("Professional CV ready");
    } catch (e) {
      const msg = e.message || "Generate failed";
      if (msg.includes("Upgrade") || msg.includes("limit")) {
        const goUpgrade = await showUpgradePopup({
          title: "Upgrade for more AI",
          text: msg,
          confirmText: "View plans",
        });
        if (goUpgrade) navigate("/builder/account");
      } else {
        setToast(msg);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function selectTemplate(templateId) {
    if (!activeCv) return;
    if (!canUseTemplates(plan)) {
      const goUpgrade = await showUpgradePopup({
        title: "Templates are a Pro feature",
        text: "Basic plan uses a default template. Upgrade to Pro for 15 templates, or Business for all templates.",
        confirmText: "View plans",
      });
      if (goUpgrade) navigate("/builder/account");
      return;
    }
    const allowed = templatesForPlan(templates, plan);
    if (!allowed.some((t) => t.id === templateId)) {
      const goUpgrade = await showUpgradePopup({
        title: "Upgrade for more templates",
        text: "This template is available on Business. Upgrade to unlock every design.",
        confirmText: "View plans",
      });
      if (goUpgrade) navigate("/builder/account");
      return;
    }
    const next = { ...activeCv, template_id: templateId, theme_override: null };
    setActiveCv(next);
    saveCv(next);
    setToast(`Template: ${templates.find((t) => t.id === templateId)?.name || templateId}`);
  }

  const aiUsed = profile?.ai_messages_used ?? 0;
  const aiLimit = profile?.ai_messages_limit ?? 50;
  const aiPct = Math.min(100, Math.round((aiUsed / Math.max(aiLimit, 1)) * 100));
  const userInitial = (user?.name || "U").charAt(0).toUpperCase();
  const planTemplates = useMemo(() => templatesForPlan(templates, plan), [templates, plan]);
  const showTemplatePicker = canUseTemplates(plan);

  const headerActions = view === "chat" ? (
    <>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setView("list")}>
        ← My CVs
      </button>
      {activeCv && (
        <>
          {showTemplatePicker && (
            <button type="button" className="btn btn-sm" onClick={() => setShowTemplates(true)}>
              Templates
            </button>
          )}
          <select
            className="builder-select"
            value={activeCv.tone}
            onChange={(e) => {
              const next = { ...activeCv, tone: e.target.value };
              setActiveCv(next);
              saveCv(next);
            }}
          >
            {TONES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-sm"
            disabled={loading || exporting}
            onClick={() => triggerDownload("export_pdf", activeCv)}
          >
            PDF
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={loading || exporting}
            onClick={() => triggerDownload("export_docx", activeCv)}
          >
            DOCX
          </button>
        </>
      )}
    </>
  ) : null;

  return (
    <AppLayout headerActions={headerActions} mainClassName="site-main--app">
      {toast && (
        <div className="account-alert account-alert--success builder-toast" role="status" onClick={() => setToast("")}>
          <span>✓</span> {toast}
        </div>
      )}

      <div className={`builder-shell builder-shell--animated ${view === "chat" ? "builder-shell--wide" : ""}`}>
        <PlanStatusBanner />
        <div className="builder-bg" aria-hidden="true">
          <div className="builder-bg-blob builder-bg-blob--1" />
          <div className="builder-bg-blob builder-bg-blob--2" />
        </div>

        {view === "list" && (
          <>
            <div className="account-hero builder-anim builder-anim--1">
              <div className="account-avatar builder-avatar-glow" aria-hidden="true">{userInitial}</div>
              <div className="account-hero-info">
                <h1>{user?.name ? `${user.name.split(" ")[0]}'s workspace` : "Your CVs"}</h1>
                <p>Build and export professional CVs with AI</p>
              </div>
              <span className={`plan-badge plan-badge--lg plan-badge--${plan}`}>{planLabel}</span>
            </div>

            <div className="account-stats">
              <div className="account-stat builder-anim builder-anim--2">
                <span className="account-stat-label">Your CVs</span>
                <strong>{cvs.length}</strong>
              </div>
              <div className="account-stat builder-anim builder-anim--3">
                <span className="account-stat-label">CV limit</span>
                <strong>{formatCvLimit(profile?.max_cvs, plan)}</strong>
              </div>
              <div className="account-stat account-stat--wide builder-anim builder-anim--4">
                <div className="account-stat-row">
                  <span className="account-stat-label">AI messages this month</span>
                  <strong>{aiUsed} / {aiLimit}</strong>
                </div>
                <div className="account-progress">
                  <div className="account-progress-fill" style={{ width: `${aiPct}%` }} />
                </div>
              </div>
            </div>

            <section className="account-card builder-anim builder-anim--5">
              <div className="account-card-head builder-card-head">
                <div>
                  <h2>Your CVs</h2>
                  <p>Create, edit, and export professional CVs with AI assistance.</p>
                </div>
                <button type="button" className="btn btn-primary builder-btn-glow" onClick={handleCreate}>
                  + New CV
                </button>
              </div>

              {isFreePlan(plan) && (
                <p className="builder-plan-hint">
                  Basic plan: {formatCvLimit(profile?.max_cvs, plan)} CVs · {aiUsed}/{aiLimit} AI messages · default template.
                  {" "}<Link to="/builder/account">Upgrade to Pro</Link>
                </p>
              )}

              {cvs.length === 0 ? (
                <div className="builder-empty">
                  <div className="builder-empty-icon" aria-hidden="true">✨</div>
                  <h3>Start your first CV</h3>
                  <p>Chat with AI — it builds your CV as you type. No forms required.</p>
                  <button type="button" className="btn btn-primary builder-btn-glow" onClick={handleCreate}>
                    Start building with AI
                  </button>
                </div>
              ) : (
                <div className="builder-cv-grid">
                  {cvs.map((cv, index) => (
                    <article
                      key={cv.id}
                      className={`builder-cv-card builder-cv-card--enter ${deletingId === cv.id ? "builder-cv-card--deleting" : ""}`}
                      style={{ "--card-i": index }}
                    >
                      <div className="builder-cv-card-top">
                        <h3>{cv.name}</h3>
                        <span className="builder-cv-card-tone">{cv.tone?.replace("_", " ") || "professional"}</span>
                      </div>
                      <p className="muted">{cv.job_title || "No title yet"}</p>
                      <p className="builder-cv-date">Updated {new Date(cv.updated_at).toLocaleDateString()}</p>
                      <div className="builder-cv-card-actions">
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => openCV(cv.id)}>
                          Open chat
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleDuplicate(cv)}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          disabled={deletingId === cv.id}
                          onClick={() => handleDeleteCv(cv)}
                        >
                          {deletingId === cv.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {view === "chat" && activeCv && (
          <div className="builder-chat-layout">
            <section className="account-card builder-chat-panel builder-anim builder-anim--slide-left">
              {buildMode === "guided" ? (
                <GuidedBuilder
                  initialContent={activeCv.content}
                  tone={activeCv.tone}
                  generating={generating}
                  onLiveUpdate={handleGuidedLiveUpdate}
                  onGenerate={handleGuidedGenerate}
                  onSwitchToChat={() => setBuildMode("chat")}
                />
              ) : (
                <>
              <div className="account-card-head builder-chat-head">
                <div>
                  <h2>{activeCv.name}</h2>
                  <p>
                    {guidedChat.active
                      ? "Answer each question in chat — skip anything optional."
                      : "Chat naturally — I'll ask for missing details and build your CV step by step."}
                  </p>
                </div>
                <div className="builder-chat-head-actions">
                  <span className={`save-pill save-pill--${saveState}`}>
                    {saveState === "saving" ? "Saving…" : "Saved"}
                  </span>
                  <button type="button" className="btn btn-sm" onClick={() => setBuildMode("guided")}>
                    Guided build
                  </button>
                </div>
              </div>
              {getNextSteps(activeCv.content).length > 0 && !guidedChat.active && (
                <div className="next-steps-bar">
                  <span className="next-steps-label">Next:</span>
                  <div className="chat-quick-chips">
                    {getNextSteps(activeCv.content).map((step) => (
                      <button
                        key={step.section}
                        type="button"
                        className="chat-quick-chip chat-quick-chip--start"
                        disabled={loading || generating}
                        onClick={() => askForSectionDetails(step.section)}
                      >
                        {step.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="chat-quick-chip chat-quick-chip--ai"
                      disabled={loading || generating}
                      onClick={() => handleChatAction({ type: "polish" })}
                    >
                      Polish CV
                    </button>
                  </div>
                </div>
              )}
              <div className="chat-messages">
                {messages.length === 0 && !loading && (
                  <div className="chat-empty-hint builder-anim builder-anim--2">
                    <strong>Build your CV in minutes</strong>
                    <p>Start with a simple intro — I'll ask you each detail one by one:</p>
                    <em>&quot;My name is Rehan Ali, I want to make a CV&quot;</em>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`chat-bubble chat-bubble--${msg.role} chat-bubble--enter`}
                  >
                    <span className="chat-role">{msg.role === "user" ? "You" : "AI"}</span>
                    <p>{msg.content}</p>
                    {msg.guidedActions?.length > 0 && (
                      <div className="chat-suggestions-wrap">
                        <p className="chat-suggestions-title">Quick actions</p>
                        <div className="chat-suggestion-chips">
                          {msg.guidedActions.map((s, j) => (
                            <button
                              key={j}
                              type="button"
                              className={`chat-quick-chip ${s === "Polish CV" ? "chat-quick-chip--ai" : ""}`}
                              disabled={loading || generating}
                              onClick={() => handleQuickPick(s)}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {!msg.guidedActions?.length && msg.suggestions?.length > 0 && (
                      <div className="chat-suggestions-wrap">
                        <p className="chat-suggestions-title">Tap a suggestion to continue</p>
                        <div className="chat-suggestion-chips">
                          {msg.suggestions.map((s, j) => (
                            <button
                              key={j}
                              type="button"
                              className="chat-quick-chip"
                              disabled={loading}
                              onClick={() => handleQuickPick(s)}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && <AILoadingBubble />}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-area">
                <ChatQuickActions
                  content={activeCv.content}
                  messagesEmpty={messages.length === 0}
                  disabled={loading || exporting || generating}
                  onAction={handleChatAction}
                />
                <UploadBar
                  disabled={loading || exporting || generating}
                  onCvUpload={handleCvUpload}
                  onPhotoUpload={handlePhotoUpload}
                />
                {pendingSection && (
                  <div className="chat-pending-bar">
                    <span>
                      Adding{" "}
                      <strong>
                        {{
                          name: "Name",
                          professional: "Professional profile",
                          graduate: "Early career",
                          email: "Email",
                          phone: "Phone",
                          links: "Profile links",
                          location: "Location",
                        }[pendingSection] || sectionLabel(pendingSection)}
                      </strong>
                      {" "}— type here, then Add to CV
                    </span>
                    <button
                      type="button"
                      className="chat-pending-cancel"
                      onClick={() => {
                        setPendingSection(null);
                        setInput("");
                        appendLocalAssistant("Cancelled. Tap a section button whenever you are ready.");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <div className="chat-input-row">
                  <textarea
                    ref={inputRef}
                    className={`chat-input ${pendingSection ? "chat-input--pending" : ""}`}
                    rows={2}
                    placeholder={
                      pendingSection
                        ? (SECTION_PROMPTS[pendingSection]?.placeholder || "Type your details…")
                        : "Type anything… e.g. My name is Sara"
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    disabled={loading || generating}
                  />
                  <button
                    type="button"
                    className={`btn btn-primary chat-send builder-btn-glow ${loading ? "is-loading" : ""}`}
                    onClick={sendMessage}
                    disabled={loading || generating || !input.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="btn-spinner" aria-hidden="true" />
                        <span>Wait</span>
                      </>
                    ) : pendingSection ? (
                      "Add to CV"
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
                <p className="chat-input-example">
                  e.g.{" "}
                  {pendingSection
                    ? (SECTION_PROMPTS[pendingSection]?.placeholder || "your details")
                    : "BSCS, Punjab University, 2024 · Communication, Leadership · you@email.com"}
                </p>
              </div>
                </>
              )}
            </section>

            <aside className={`account-card builder-preview-panel builder-anim builder-anim--slide-right ${loading || generating ? "preview-panel--loading" : ""}`}>
              <div className="preview-toolbar">
                <h3>Live CV Preview</h3>
                <span className={`preview-status ${loading || generating ? "preview-status--active" : ""}`}>
                  {loading || generating ? (
                    <>
                      <span className="preview-pulse-dot" aria-hidden="true" />
                      {generating ? "Polishing…" : "Updating…"}
                    </>
                  ) : (
                    buildMode === "guided" ? "Fills as you complete steps" : "Updates as you chat"
                  )}
                </span>
              </div>
              <div className="preview-tools">
                <button type="button" className="btn btn-sm" onClick={handleUndo} disabled={loading || generating}>
                  Undo
                </button>
                <button type="button" className="btn btn-sm" onClick={handleShareToggle} disabled={loading || generating}>
                  {activeCv.is_public ? "Unshare" : "Share link"}
                </button>
                <button type="button" className="btn btn-sm" onClick={handleCoverLetter} disabled={loading || generating}>
                  Cover letter
                </button>
              </div>
              {shareUrl && (
                <p className="share-url-line">
                  <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
                </p>
              )}
              <AtsScoreMeter content={activeCv.content} />
              {buildMode === "chat" && (
                <SectionManager
                  content={activeCv.content}
                  disabled={loading || exporting || generating}
                  onToggle={handleSectionToggle}
                  onAdd={handleSectionAdd}
                  onRemove={handleSectionRemove}
                />
              )}
              {loading || generating ? (
                <CVPreviewSkeleton />
              ) : (
                <TemplateRenderer ref={previewRef} cv={activeCv} template={activeTemplate} />
              )}
            </aside>
          </div>
        )}
      </div>

      {showTemplates && activeCv && showTemplatePicker && (
        <TemplatePicker
          templates={planTemplates}
          activeId={activeCv?.template_id}
          onSelect={selectTemplate}
          onClose={() => setShowTemplates(false)}
          plan={plan}
        />
      )}
    </AppLayout>
  );
}
