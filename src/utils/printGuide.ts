/**
 * Opens a print-friendly window with the patient guide content.
 * The browser's print dialog doubles as a "Save as PDF" option.
 */
export function printPatientGuide(guideText: string, patientName?: string) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;

  // Parse ::: or --- sections for styled output
  const sectionRegex = /^(?::::\s*(.+?)\s*::::|---\s*(.+?)\s*---)$/gm;
  const titles: { title: string; start: number; end: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(guideText)) !== null) {
    titles.push({ title: (match[1] || match[2]).trim(), start: match.index, end: match.index + match[0].length });
  }

  let bodyHtml = "";

  if (titles.length > 0) {
    const intro = guideText.slice(0, titles[0].start).trim();
    if (intro) {
      bodyHtml += `<div class="intro">${escapeAndFormat(intro)}</div>`;
    }
    for (let i = 0; i < titles.length; i++) {
      const contentEnd = i + 1 < titles.length ? titles[i + 1].start : guideText.length;
      const content = guideText.slice(titles[i].end, contentEnd).trim();
      bodyHtml += `<div class="section"><h2>${esc(titles[i].title)}</h2><div class="section-content">${escapeAndFormat(content)}</div></div>`;
    }
  } else {
    bodyHtml = `<div class="plain">${escapeAndFormat(guideText)}</div>`;
  }

  const title = patientName ? `Patient Guide — ${patientName}` : "Patient Care Guide";

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @media print { @page { margin: 1.5cm; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 1.4rem; color: #0891b2; margin-bottom: 0.5rem; border-bottom: 2px solid #0891b2; padding-bottom: 0.5rem; }
  .date { font-size: 0.75rem; color: #888; margin-bottom: 1.5rem; }
  .intro { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 1rem; margin-bottom: 1.2rem; font-size: 0.9rem; }
  .section { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 0.8rem; overflow: hidden; page-break-inside: avoid; }
  .section h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; background: #f9fafb; padding: 0.6rem 1rem; border-bottom: 1px solid #e5e7eb; color: #374151; }
  .section-content { padding: 0.8rem 1rem; font-size: 0.85rem; }
  .section-content p { margin-bottom: 0.4rem; }
  .section-content ul { padding-left: 1.2rem; margin: 0.3rem 0; }
  .section-content li { margin-bottom: 0.25rem; }
  .section-content strong { font-weight: 600; }
  .plain { white-space: pre-wrap; font-size: 0.85rem; }
  .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.7rem; color: #9ca3af; text-align: center; }
</style></head><body>
<h1>${esc(title)}</h1>
<div class="date">Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
${bodyHtml}
<div class="footer">PeptiDOC — Confidential Patient Information</div>
</body></html>`);

  win.document.close();
  setTimeout(() => win.print(), 400);
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAndFormat(text: string): string {
  const lines = text.split("\n");
  let html = "";
  let inList = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { html += "</ul>"; inList = false; }
      continue;
    }

    // Bullet
    if (/^[*\-•]\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${formatInline(line.replace(/^[*\-•]\s+/, ""))}</li>`;
      continue;
    }

    // Numbered
    if (/^\d+[.)]\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
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
