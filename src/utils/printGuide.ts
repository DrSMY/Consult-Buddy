/**
 * Opens a print-friendly window with a colorful, icon-rich patient guide.
 * The browser's print dialog doubles as a "Save as PDF" option.
 */

// Inline SVG icons (Lucide paths) for each section type
const SVG_ICONS: Record<string, string> = {
  INTRODUCTION: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  "PATIENT SUMMARY": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 15-3.086-6.172A2 2 0 0 0 16.12 8H7.88a2 2 0 0 0-1.794 1.828L3 15"/><path d="M3.34 17.666a1 1 0 0 0 .92 1.334h15.48a1 1 0 0 0 .92-1.334L18 11H6z"/></svg>`,
  "STORAGE INSTRUCTIONS": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`,
  "HOW TO INJECT": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>`,
  "HOW TO TAKE YOUR MEDICATION": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
  "NUTRITION & DIET PLAN": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  "DIETARY ADVICE": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  "COMMON SIDE EFFECTS": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  "RED-FLAG SYMPTOMS": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
  "FOLLOW-UP PLAN": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  "PHYSICAL ACTIVITY": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>`,
  "CONSISTENCY & MINDSET": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M12 18v4"/></svg>`,
  "HYDRATION & RECOVERY": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 14.69c1.34 0 2.44-1.12 2.44-2.48 0-.71-.35-1.38-1.05-1.95S12.78 9.17 12.56 8.3c-.17.88-.69 1.74-1.4 2.3-.7.58-1.05 1.25-1.05 1.96 0 1.36 1.1 2.48 2.45 2.48z"/></svg>`,
  "YOUR PRESCRIBED MEDICATIONS": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
  "RECOMMENDED SUPPLEMENTS": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
  "REQUIRED LAB TESTS": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`,
  "IMPORTANT REMINDERS": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  "LIFESTYLE TIPS": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  "SCHEDULE & TIMING": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  "REFILL SUMMARY": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>`,
  "MEDICATION REMINDER": `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
};

const SECTION_COLORS: Record<string, { bg: string; border: string; headerBg: string; text: string; dot: string }> = {
  INTRODUCTION:                  { bg: "#edf9f7", border: "#5eead4", headerBg: "#d5f5f0", text: "#0f766e", dot: "#5eead4" },
  "PATIENT SUMMARY":             { bg: "#eef4ff", border: "#93b8f9", headerBg: "#dce8fd", text: "#3b6fc4", dot: "#93b8f9" },
  "STORAGE INSTRUCTIONS":        { bg: "#edf9fb", border: "#67d9e8", headerBg: "#d5f2f7", text: "#1a8a9e", dot: "#67d9e8" },
  "HOW TO INJECT":               { bg: "#eff0ff", border: "#a5a8f8", headerBg: "#dfe1ff", text: "#5b5fc7", dot: "#a5a8f8" },
  "HOW TO TAKE YOUR MEDICATION": { bg: "#eff0ff", border: "#a5a8f8", headerBg: "#dfe1ff", text: "#5b5fc7", dot: "#a5a8f8" },
  "NUTRITION & DIET PLAN":       { bg: "#eef8f1", border: "#6dd5a0", headerBg: "#d8f2e2", text: "#1e8a52", dot: "#6dd5a0" },
  "DIETARY ADVICE":              { bg: "#eef8f1", border: "#6dd5a0", headerBg: "#d8f2e2", text: "#1e8a52", dot: "#6dd5a0" },
  "COMMON SIDE EFFECTS":         { bg: "#fef7e8", border: "#f5c86b", headerBg: "#fef0d0", text: "#b47a1a", dot: "#f5c86b" },
  "RED-FLAG SYMPTOMS":           { bg: "#ffd6d9", border: "#f43f5e", headerBg: "#fbb6bd", text: "#be123c", dot: "#f43f5e" },
  "FOLLOW-UP PLAN":              { bg: "#f0ecff", border: "#b4a0f8", headerBg: "#e2daff", text: "#7558c9", dot: "#b4a0f8" },
  "PHYSICAL ACTIVITY":           { bg: "#edf8f3", border: "#6dd5b0", headerBg: "#d5f2e5", text: "#1a7a5c", dot: "#6dd5b0" },
  "CONSISTENCY & MINDSET":       { bg: "#f3edff", border: "#c4a5f7", headerBg: "#e6daff", text: "#8a50d0", dot: "#c4a5f7" },
  "HYDRATION & RECOVERY":        { bg: "#edf4ff", border: "#7bc0f5", headerBg: "#d8eafc", text: "#2874a8", dot: "#7bc0f5" },
  "YOUR PRESCRIBED MEDICATIONS": { bg: "#eef4ff", border: "#93b8f9", headerBg: "#dce8fd", text: "#3b6fc4", dot: "#93b8f9" },
  "RECOMMENDED SUPPLEMENTS":     { bg: "#fef7e8", border: "#f5c86b", headerBg: "#fef0d0", text: "#b47a1a", dot: "#f5c86b" },
  "REQUIRED LAB TESTS":          { bg: "#edf9fb", border: "#67d9e8", headerBg: "#d5f2f7", text: "#1a8a9e", dot: "#67d9e8" },
  "IMPORTANT REMINDERS":         { bg: "#ffd6d9", border: "#f43f5e", headerBg: "#fbb6bd", text: "#be123c", dot: "#f43f5e" },
  "LIFESTYLE TIPS":              { bg: "#edf8f3", border: "#6dd5b0", headerBg: "#d5f2e5", text: "#1a7a5c", dot: "#6dd5b0" },
  "SCHEDULE & TIMING":           { bg: "#f0ecff", border: "#b4a0f8", headerBg: "#e2daff", text: "#7558c9", dot: "#b4a0f8" },
  "REFILL SUMMARY":              { bg: "#eef4ff", border: "#93b8f9", headerBg: "#dce8fd", text: "#3b6fc4", dot: "#93b8f9" },
  "MEDICATION REMINDER":         { bg: "#fef7e8", border: "#f5c86b", headerBg: "#fef0d0", text: "#b47a1a", dot: "#f5c86b" },
};

const DEFAULT_COLORS = { bg: "#f9fafb", border: "#9ca3af", headerBg: "#f3f4f6", text: "#374151", dot: "#6b7280" };

function getColors(title: string) {
  if (SECTION_COLORS[title]) return SECTION_COLORS[title];
  const upper = title.toUpperCase();
  for (const key of Object.keys(SECTION_COLORS)) {
    if (upper.includes(key) || key.includes(upper)) return SECTION_COLORS[key];
  }
  return DEFAULT_COLORS;
}

function getIcon(title: string): string {
  if (SVG_ICONS[title]) return SVG_ICONS[title];
  const upper = title.toUpperCase();
  for (const key of Object.keys(SVG_ICONS)) {
    if (upper.includes(key) || key.includes(upper)) return SVG_ICONS[key];
  }
  // Default file icon
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>`;
}

// Brand assets — embedded via Vite imports so they bundle into the HTML
import logoUrl from "@/assets/dr-sami-logo.png";
import signatureUrl from "@/assets/dr-sami-signature.png";
import { buildWeightLossGuideHtml, type WeightLossPatientSummary } from "./weightLossGuideHtml";

const PROGRAM_TITLES: Record<string, string> = {
  peptides: "Peptide Therapy Guide",
  weight_loss: "Weight Loss Program Guide",
};

export interface BuildGuideOptions {
  /** Optional weight-loss patient summary to render in the side card. */
  weightLossSummary?: WeightLossPatientSummary;
  /** Optional override for logo public URL (e.g. when uploaded to storage). */
  logoUrl?: string;
  /** Optional override for signature public URL. */
  signatureUrl?: string;
}

/** Build the full HTML string for the patient guide (shared by print & share). */
export function buildGuideHtml(
  guideText: string,
  patientName?: string,
  program: "peptides" | "weight_loss" | string = "peptides",
  options: BuildGuideOptions = {},
): string {
  // Weight-loss program uses the dedicated branded magazine layout.
  if (program === "weight_loss") {
    return buildWeightLossGuideHtml({
      guideText,
      patientName: patientName || "Patient",
      logoUrl: options.logoUrl || logoUrl,
      signatureUrl: options.signatureUrl || signatureUrl,
      summary: options.weightLossSummary,
    });
  }

  // Parse ::: or --- sections
  const sectionRegex = /^(?:::+\s*(.+?)\s*:::+|---\s*(.+?)\s*---)$/gm;
  const titles: { title: string; start: number; end: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(guideText)) !== null) {
    titles.push({ title: (match[1] || match[2]).trim(), start: match.index, end: match.index + match[0].length });
  }

  let bodyHtml = "";

  if (titles.length > 0) {
    const intro = guideText.slice(0, titles[0].start).trim();
    if (intro) {
      bodyHtml += `<div class="intro-card">
        <div class="intro-icon">${SVG_ICONS["INTRODUCTION"] || ""}</div>
        <div class="intro-content">${escapeAndFormat(intro, "#14b8a6")}</div>
      </div>`;
    }
    for (let i = 0; i < titles.length; i++) {
      const contentEnd = i + 1 < titles.length ? titles[i + 1].start : guideText.length;
      const content = guideText.slice(titles[i].end, contentEnd).trim();
      const colors = getColors(titles[i].title);
      const icon = getIcon(titles[i].title);
      bodyHtml += `<div class="section" style="border-left: 5px solid ${colors.border}; background: ${colors.bg};">
        <div class="section-header" style="background: ${colors.headerBg};">
          <span class="section-icon" style="color: ${colors.text};">${icon}</span>
          <span class="section-title" style="color: ${colors.text};">${esc(titles[i].title)}</span>
        </div>
        <div class="section-content">${escapeAndFormat(content, colors.dot)}</div>
      </div>`;
    }
  } else {
    bodyHtml = `<div class="plain">${escapeAndFormat(guideText, "#14b8a6")}</div>`;
  }

  const programLabel = PROGRAM_TITLES[program] || "Patient Care Guide";
  const title = patientName ? `${programLabel} — ${patientName}` : programLabel;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @media print {
    @page { margin: 1cm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.6; padding: 0; background: linear-gradient(180deg, #f0fdfa 0%, #f8fafc 30%, #eff6ff 70%, #f0fdfa 100%); }

  .letterhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background: linear-gradient(135deg, #0d9488 0%, #0891b2 60%, #0ea5e9 100%);
    color: white;
    padding: 1.1rem 1.5rem;
    border-radius: 0 0 18px 18px;
    margin-bottom: 1.2rem;
    box-shadow: 0 8px 24px -12px rgba(13,148,136,0.5);
  }
  .letterhead-logo {
    flex-shrink: 0;
    width: 64px; height: 64px;
    border-radius: 14px;
    background: rgba(255,255,255,0.95);
    padding: 6px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px -4px rgba(0,0,0,0.2);
  }
  .letterhead-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .letterhead-text { flex: 1; min-width: 0; }
  .letterhead-brand {
    font-size: 0.65rem;
    opacity: 0.9;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-weight: 600;
    margin-bottom: 0.2rem;
  }
  .letterhead-title {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 0.15rem;
    line-height: 1.15;
  }
  .letterhead-date { font-size: 0.7rem; opacity: 0.85; }
  .letterhead-meta {
    text-align: right;
    flex-shrink: 0;
    font-size: 0.65rem;
    opacity: 0.9;
    line-height: 1.5;
  }
  .letterhead-meta-name { font-weight: 700; font-size: 0.78rem; opacity: 1; }

  .content { padding: 0 1.5rem; max-width: 780px; margin: 0 auto; }

  .intro-card {
    display: flex;
    gap: 0.8rem;
    align-items: flex-start;
    background: linear-gradient(135deg, #f0fdfa, #ecfeff);
    border: 1px solid #99f6e4;
    border-radius: 10px;
    padding: 1rem 1.2rem;
    margin-bottom: 1rem;
  }
  .intro-icon { color: #0d9488; flex-shrink: 0; margin-top: 2px; }
  .intro-content { font-size: 0.85rem; }

   .section {
    border-radius: 10px;
    margin-bottom: 0.7rem;
    overflow: hidden;
    page-break-inside: avoid;
    border-left-width: 5px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
  }
  .section-icon { flex-shrink: 0; display: flex; align-items: center; }
  .section-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
  }
   .section-content {
    padding: 0.7rem 1rem 0.8rem 1rem;
    font-size: 0.83rem;
    border-top: 2px solid rgba(0,0,0,0.06);
  }
  .section-content p { margin-bottom: 0.35rem; }
  .section-content ul { list-style: none; padding-left: 0; margin: 0.3rem 0; }
  .section-content li {
    padding-left: 1.1rem;
    position: relative;
    margin-bottom: 0.25rem;
  }
  .section-content li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
     width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--dot-color, #14b8a6);
  }
  .section-content strong { font-weight: 600; }

  .plain { white-space: pre-wrap; font-size: 0.85rem; padding: 1.5rem; }

  .signature-block {
    margin: 1.5rem 1.5rem 0;
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, #f0fdfa, #ecfeff);
    border: 1px solid #99f6e4;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1rem;
    page-break-inside: avoid;
  }
  .signature-img {
    flex-shrink: 0;
    width: 110px; height: 70px;
    display: flex; align-items: center; justify-content: center;
  }
  .signature-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .signature-name { font-size: 0.9rem; font-weight: 700; color: #0f766e; }
  .signature-title { font-size: 0.7rem; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; }

  .footer {
    margin-top: 1rem;
    padding: 0.9rem 1.5rem;
    background: linear-gradient(135deg, #f0fdfa, #ecfeff);
    border-top: 2px solid #99f6e4;
    text-align: center;
    font-size: 0.7rem;
    color: #64748b;
  }
  .footer-brand { font-weight: 700; color: #0d9488; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; }
  .footer-sub { color: #9ca3af; margin-top: 0.2rem; font-size: 0.65rem; }
</style></head><body>

<div class="letterhead">
  <div class="letterhead-logo"><img src="${logoUrl}" alt="Dr Sami logo" /></div>
  <div class="letterhead-text">
    <div class="letterhead-brand">PeptiDOC</div>
    <h1 class="letterhead-title">${esc(programLabel)}</h1>
    <div class="letterhead-date">${patientName ? esc(patientName) + " &middot; " : ""}${today}</div>
  </div>
  <div class="letterhead-meta">
    <div class="letterhead-meta-name">Dr Sami M. Yesuf</div>
    <div>Scope Certified Physician</div>
  </div>
</div>

<div class="content">
${bodyHtml}
</div>

<div class="signature-block">
  <div class="signature-img"><img src="${signatureUrl}" alt="Dr Sami signature" /></div>
  <div>
    <div class="signature-name">Dr Sami M. Yesuf</div>
    <div class="signature-title">Scope Certified Physician &middot; PeptiDOC</div>
  </div>
</div>

<div class="footer">
  <div class="footer-brand">PeptiDOC</div>
  <div class="footer-sub">Confidential Patient Information — For Personal Use Only</div>
</div>

</body></html>`;
}

export function printPatientGuide(
  guideText: string,
  patientName?: string,
  program: "peptides" | "weight_loss" | string = "peptides",
  options: BuildGuideOptions = {},
) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;

  win.document.write(buildGuideHtml(guideText, patientName, program, options));
  win.document.close();
  setTimeout(() => win.print(), 400);
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAndFormat(text: string, dotColor: string): string {
  const lines = text.split("\n");
  let html = "";
  let inList = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { html += "</ul>"; inList = false; }
      continue;
    }

    if (/^[*\-•]\s+/.test(line)) {
      if (!inList) { html += `<ul style="--dot-color: ${dotColor};">`; inList = true; }
      html += `<li>${formatInline(line.replace(/^[*\-•]\s+/, ""))}</li>`;
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      if (!inList) { html += `<ul style="--dot-color: ${dotColor};">`; inList = true; }
      html += `<li>${formatInline(line.replace(/^\d+[.)]\s+/, ""))}</li>`;
      continue;
    }

    if (inList) { html += "</ul>"; inList = false; }
    html += `<p>${formatInline(line)}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}

function formatInline(text: string): string {
  return esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
