import html2pdf from "html2pdf.js";
import { exportStyledDocx } from "../api/client";

const A4_WIDTH_PX = 794;

function safeFilename(name) {
  return (name || "CV").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "CV";
}

function collectPageStyles() {
  const chunks = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        chunks.push(rule.cssText);
      }
    } catch {
      /* cross-origin stylesheet */
    }
  }
  return chunks.join("\n");
}

function createExportClone(element) {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${A4_WIDTH_PX}px`,
    "background:#fff",
    "z-index:-1",
  ].join(";");

  const clone = element.cloneNode(true);
  clone.style.width = `${A4_WIDTH_PX}px`;
  clone.style.maxWidth = `${A4_WIDTH_PX}px`;
  clone.style.minHeight = "auto";
  clone.style.boxShadow = "none";
  clone.style.border = "none";
  clone.style.borderRadius = "0";
  clone.style.margin = "0";

  host.appendChild(clone);
  document.body.appendChild(host);
  return { host, clone };
}

function removeExportClone(host) {
  if (host?.parentNode) host.parentNode.removeChild(host);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildStyledHtml(element) {
  const styles = collectPageStyles();
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${styles}</style>
</head>
<body style="margin:0;padding:0;background:#fff;">
  ${element.outerHTML}
</body>
</html>`;
}

/**
 * Export the live CV preview element as PDF — matches selected template (WYSIWYG).
 */
export async function exportElementAsPdf(element, name) {
  if (!element) throw new Error("CV preview is not ready yet.");

  const filename = `${safeFilename(name)}.pdf`;
  const { host, clone } = createExportClone(element);

  try {
    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollY: 0,
          windowWidth: A4_WIDTH_PX,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(clone)
      .save();
  } finally {
    removeExportClone(host);
  }
}

/**
 * Export the live CV preview as Word — sends styled HTML to backend for conversion.
 */
export async function exportElementAsDocx(element, name, cvId) {
  if (!element) throw new Error("CV preview is not ready yet.");
  if (!cvId) throw new Error("CV id is required for Word export.");

  const filename = `${safeFilename(name)}.docx`;
  const { host, clone } = createExportClone(element);

  try {
    const html = buildStyledHtml(clone);
    const blob = await exportStyledDocx(cvId, html);
    downloadBlob(blob, filename);
  } finally {
    removeExportClone(host);
  }
}

export async function exportCvPreview(element, type, name, cvId) {
  if (type === "export_pdf") return exportElementAsPdf(element, name);
  if (type === "export_docx") return exportElementAsDocx(element, name, cvId);
  throw new Error("Unknown export type");
}
