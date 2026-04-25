/**
 * Branded magazine-style HTML for the Weight Loss / GLP-1 program.
 * Renders the AI-generated `::: SECTION :::` blocks into a structured
 * Tailwind layout matching the DarDoc reference design exactly:
 *   - Full-bleed teal gradient hero with "Hi {Name}," greeting
 *   - White card containing Introduction + Patient Summary side card
 *   - Storage Instructions + How to Inject (numbered steps, video pill) row
 *   - Nutrition & Diet card with metric tiles and category bars
 *   - Common Side Effects (cream) + Red-Flag Symptoms (warning) row
 *   - Dark teal Follow-Up Plan band with "WEEK N" watermark
 *   - Signature card with "Save Personal Guide" CTA
 *
 * Tailwind is loaded from CDN so the standalone HTML renders identically
 * in any browser and converts cleanly via "Print → Save as PDF".
 */

export interface WeightLossPatientSummary {
  weightKg?: number | null;
  heightCm?: number | null;
  bmi?: number | null;
  bmiClass?: string | null;
  calorieTarget?: number | null;
  medication?: string | null;
  dose?: string | null;
}

export interface WeightLossGuideParams {
  guideText: string;
  patientName: string;
  logoUrl: string;
  signatureUrl: string;
  summary?: WeightLossPatientSummary;
}

function esc(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(s: string) {
  return esc(s).replace(/'/g, "&#39;");
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  return match?.[0] || null;
}

/** Convert **bold** and URLs to safe inline HTML while escaping everything else. */
function inline(text: string): string {
  return esc(text)
    .replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${escAttr(url)}" target="_blank" rel="noopener" class="font-semibold underline decoration-teal-400 underline-offset-2">${url}</a>`)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function looksLikeCompleteHtml(text: string): boolean {
  return /<!doctype\s+html|<html[\s>]|<body[\s>]/i.test(text);
}

function sanitizeStandaloneHtml(html: string, patientName: string): string {
  const hasDoctype = /<!doctype\s+html/i.test(html);
  const withoutDangerousScripts = html
    .replace(/<script\b(?![^>]*src=["']https:\/\/cdn\.tailwindcss\.com["'])[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, (attr) => {
      return /^\s*onclick\s*=\s*(["'])window\.print\(\);?\1$/i.test(attr) ? ' onclick="window.print()"' : "";
    });

  if (/<html[\s>]/i.test(withoutDangerousScripts)) {
    return `${hasDoctype ? "" : "<!DOCTYPE html>\n"}${withoutDangerousScripts}`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Patient Journey Guide | ${esc(patientName)}</title>
</head>
<body>${withoutDangerousScripts}</body>
</html>`;
}

interface Section {
  title: string;
  body: string;
}

function parseSections(text: string): { intro: string; sections: Section[] } {
  const re = /^(?:::+\s*(.+?)\s*:::+|---\s*(.+?)\s*---)$/gm;
  const marks: { title: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    marks.push({ title: (m[1] || m[2]).trim(), start: m.index, end: m.index + m[0].length });
  }
  if (marks.length === 0) return { intro: text.trim(), sections: [] };
  const intro = text.slice(0, marks[0].start).trim();
  const sections: Section[] = marks.map((mk, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].start : text.length;
    return { title: mk.title, body: text.slice(mk.end, end).trim() };
  });
  return { intro, sections };
}

function splitLines(body: string): { bullets: string[]; paragraphs: string[] } {
  const bullets: string[] = [];
  const paragraphs: string[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const b = line.match(/^(?:[*\-•]|\d+[.)])\s+(.*)$/);
    if (b) bullets.push(b[1]);
    else paragraphs.push(line);
  }
  return { bullets, paragraphs };
}

function contentItems(body: string): string[] {
  const { bullets, paragraphs } = splitLines(body);
  if (bullets.length) return bullets;

  return paragraphs
    .flatMap((p) => p.split(/(?:\s*[;•]\s*|\.\s+(?=[A-Z])|,\s+(?=(?:room|do not|protect|rotate|seek|persistent|severe|dehydration|constipation|diarrhea|heartburn|nausea)\b))/i))
    .map((item) => item.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

function findSection(sections: Section[], ...keywords: string[]): Section | undefined {
  return sections.find((s) => {
    const u = s.title.toUpperCase();
    return keywords.some((k) => u.includes(k.toUpperCase()));
  });
}

/** Split a bullet of the shape "Title: rest of text" into a heading + body. */
function splitTitled(line: string): { head: string | null; body: string } {
  const m = line.match(/^\*\*(.+?)\*\*\s*[:\-–]\s*(.+)$/) || line.match(/^([A-Z][A-Za-z0-9 /&\-]{1,40})\s*[:\-–]\s*(.+)$/);
  if (m) return { head: m[1].trim(), body: m[2].trim() };
  return { head: null, body: line };
}

/** Try to extract a "key: value(unit)" target from a line for the metric tiles. */
function extractMetric(line: string): { label: string; value: string; unit?: string } | null {
  // e.g. "Protein target: 124 - 155 g/day", "Hydration: 2-3 Liters/day", "Carbs: <20% total intake"
  const m = line.match(/^\*?\*?(.+?)\*?\*?\s*[:\-–]\s*([<>]?\s*[\d.]+(?:\s*[-–]\s*[\d.]+)?\s*%?)\s*(.*)$/);
  if (!m) return null;
  return { label: m[1].trim(), value: m[2].replace(/\s+/g, " ").trim(), unit: m[3].trim() || undefined };
}

const STORAGE_EMOJI: Array<[RegExp, string]> = [
  [/refrig|fridge|2.?°|cool/i, "❄️"],
  [/room|travel|carry|28\s*day/i, "🏠"],
  [/freez|do not freeze/i, "🚫"],
  [/light|carton|sun|dark/i, "☀️"],
];
const pickStorageEmoji = (line: string) => {
  for (const [re, e] of STORAGE_EMOJI) if (re.test(line)) return e;
  return "📦";
};

/** Highlight critical "do not" / "discard" lines in red. */
function isStorageDanger(line: string) {
  return /do not|don'?t|discard|never|avoid freezing|do\s*not\s*freeze/i.test(line);
}

/** Category bars used inside the Nutrition card. Order matters for color variety. */
const NUTRITION_CATEGORY_COLORS = ["#0d9488", "#16a34a", "#f59e0b", "#0ea5e9", "#a855f7"];

export function buildWeightLossGuideHtml(params: WeightLossGuideParams): string {
  const { guideText, patientName, logoUrl, signatureUrl, summary } = params;

  // Some clinicians paste the approved full guide HTML into the editable step.
  // In that case, preserve it as the actual patient-facing page instead of
  // escaping it into visible source code or trying to re-parse it as text.
  if (looksLikeCompleteHtml(guideText)) {
    return sanitizeStandaloneHtml(guideText, patientName);
  }

  const { intro, sections } = parseSections(guideText);

  const introSec = findSection(sections, "INTRODUCTION", "ABOUT", "OVERVIEW");
  const storageSec = findSection(sections, "STORAGE");
  const injectSec = findSection(sections, "HOW TO INJECT", "INJECT", "ADMINISTRATION", "HOW TO TAKE");
  const nutritionSec = findSection(sections, "NUTRITION", "DIET", "MEAL");
  const sideEffectsSec = findSection(sections, "SIDE EFFECT");
  const redFlagSec = findSection(sections, "RED-FLAG", "RED FLAG", "URGENT", "WARNING", "EMERGENCY");
  const followUpSec = findSection(sections, "FOLLOW-UP", "FOLLOW UP", "REVIEW");

  const handled = new Set(
    [introSec, storageSec, injectSec, nutritionSec, sideEffectsSec, redFlagSec, followUpSec]
      .filter(Boolean)
      .map((s) => s!.title),
  );
  const extras = sections.filter((s) => !handled.has(s.title));

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const year = new Date().getFullYear();

  // ===== HERO =====
  const heroHtml = `
  <section class="hero relative">
    <div class="max-w-6xl mx-auto px-6 md:px-10 pt-10 pb-32">
      <div class="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-[11px] font-bold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full">
        Clinical Weight Management
      </div>
      <h1 class="text-white text-5xl md:text-6xl font-extrabold mt-6 leading-[1.05] tracking-tight">
        Hi ${esc(patientName)},
      </h1>
      <p class="text-teal-50/95 text-base md:text-lg mt-4 max-w-2xl leading-relaxed">
        This is your personalized roadmap to start your journey with us and take your medication as advised for sustainable health improvements.
      </p>
    </div>
  </section>`;

  // ===== INTRODUCTION + PATIENT SUMMARY =====
  const introBody = introSec?.body || intro || "";
  const introParts = splitLines(introBody);
  const introCardHtml = `
    <div>
      <div class="flex items-center gap-3 mb-5">
        <div class="w-9 h-9 rounded-full border-2 border-teal-600 text-teal-700 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="12" y1="7" x2="12.01" y2="7"/></svg>
        </div>
        <h2 class="text-2xl font-bold text-slate-800">Introduction</h2>
      </div>
      ${introParts.paragraphs
        .map((p) => `<p class="text-[15px] text-slate-600 leading-[1.7] mb-3">${inline(p)}</p>`) 
        .join("")}
      ${introParts.bullets.length
        ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            ${introParts.bullets
              .map(
                (b) => `
              <div class="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <span class="w-2 h-2 rounded-full bg-teal-600 mt-2 flex-shrink-0"></span>
                <p class="text-sm text-slate-700 leading-snug">${inline(b)}</p>
              </div>`,
              )
              .join("")}
          </div>`
        : ""}
    </div>`;

  const summaryRows: Array<[string, string]> = [];
  if (summary?.weightKg != null) summaryRows.push(["Weight", `${summary.weightKg} kg`]);
  if (summary?.heightCm != null) summaryRows.push(["Height", `${summary.heightCm} cm`]);
  if (summary?.bmi != null) summaryRows.push(["BMI", `${summary.bmi.toFixed(1)}${summary.bmiClass ? ` (${esc(summary.bmiClass)})` : ""}`]);
  const summaryCardHtml = `
    <aside class="bg-teal-50 rounded-2xl p-6 h-full">
      <div class="text-[11px] font-bold tracking-[0.18em] uppercase text-teal-800/80 mb-4">Patient Summary</div>
      <div class="space-y-3">
        ${summaryRows
          .map(
            ([k, v]) => `
          <div class="flex items-center justify-between border-b border-teal-200/60 pb-3">
            <span class="text-sm text-slate-600">${esc(k)}</span>
            <span class="text-base font-bold text-slate-900">${v}</span>
          </div>`,
          )
          .join("")}
        ${summary?.calorieTarget != null
          ? `
          <div class="pt-3">
            <div class="text-[11px] font-bold tracking-[0.18em] uppercase text-teal-700">Caloric Target</div>
            <div class="text-2xl font-extrabold text-slate-900 mt-1">${summary.calorieTarget} kcal/day</div>
          </div>`
          : ""}
        ${summary?.medication
          ? `
          <div class="pt-3 border-t border-teal-200/60">
            <div class="text-[11px] font-bold tracking-[0.18em] uppercase text-teal-700">Medication</div>
            <div class="text-base font-bold text-slate-900 mt-1">${esc(summary.medication)}${summary.dose ? ` · ${esc(summary.dose)}` : ""}</div>
          </div>`
          : ""}
      </div>
    </aside>`;

  // The intro+summary card sits ON TOP of the hero, overlapping it.
  const introSummaryHtml = `
    <section class="max-w-6xl mx-auto px-4 md:px-6 -mt-24 relative z-10">
      <div class="bg-white rounded-3xl card-shadow p-6 md:p-10">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2">${introCardHtml}</div>
          <div>${summaryCardHtml}</div>
        </div>
      </div>
    </section>`;

  // ===== STORAGE INSTRUCTIONS =====
  const storageBullets = storageSec ? contentItems(storageSec.body) : [];
  const storageHtml = storageSec
    ? `
      <div class="card">
        <div class="flex items-center gap-3 mb-5">
          <span class="text-2xl">🧪</span>
          <h3 class="text-xl font-bold text-slate-900">Storage Instructions</h3>
        </div>
        <ul class="space-y-4">
          ${storageBullets
            .map((b) => {
              const parts = splitTitled(b);
              const danger = isStorageDanger(b);
              const head = parts.head ? `<strong class="${danger ? "text-rose-600" : "text-slate-900"}">${esc(parts.head)}:</strong> ` : "";
              const body = `<span class="${danger ? "text-rose-600" : "text-slate-700"}">${inline(parts.body)}</span>`;
              const emoji = danger ? "🚫" : pickStorageEmoji(b);
              return `
              <li class="flex items-start gap-3">
                <span class="text-lg leading-tight pt-0.5">${emoji}</span>
                <p class="text-[15px] leading-snug">${head}${body}</p>
              </li>`;
            })
            .join("")}
        </ul>
      </div>`
    : "";

  // ===== HOW TO INJECT =====
  const injectBullets = injectSec ? contentItems(injectSec.body) : [];
  const injectTitle = injectSec ? injectSec.title.replace(/\b\w/g, (c) => c.toUpperCase()) : "How to Inject";
  const injectionVideoUrl = extractFirstUrl(injectSec?.body || "") || "https://www.youtube.com/results?search_query=GLP1+pen+injection+technique";
  const injectHtml = injectSec
    ? `
      <div class="card">
        <div class="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-full border-2 border-teal-600 text-teal-700 flex items-center justify-center font-bold text-lg leading-none">+</span>
            <h3 class="text-xl font-bold text-slate-900">${esc(injectTitle)}</h3>
          </div>
          <a href="${escAttr(injectionVideoUrl)}"
             target="_blank" rel="noopener"
             class="inline-flex items-center gap-2 bg-rose-50 text-rose-600 text-sm font-bold px-3 py-1.5 rounded-full hover:bg-rose-100 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 0 0 2.42 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.42-4.81zM10 15V9l5.2 3z"/></svg>
            Watch Instructional Video
          </a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          ${injectBullets
            .map((b, i) => {
              const parts = splitTitled(b);
              return `
              <div class="flex items-start gap-3">
                <span class="step-pill">${i + 1}</span>
                <p class="text-[15px] leading-snug pt-0.5">
                  ${parts.head ? `<strong class="text-slate-900">${esc(parts.head)}:</strong> ` : ""}
                  <span class="text-slate-700">${inline(parts.body)}</span>
                </p>
              </div>`;
            })
            .join("")}
        </div>
      </div>`
    : "";

  // ===== NUTRITION & DIET =====
  let nutritionHtml = "";
  if (nutritionSec) {
    const { paragraphs } = splitLines(nutritionSec.body);
    const bullets = contentItems(nutritionSec.body);
    // Separate metric-style bullets (label: value unit) from category bars.
    const metricBullets: { label: string; value: string; unit?: string }[] = [];
    const detailBullets: string[] = [];
    for (const b of bullets) {
      const m = extractMetric(b);
      // Only treat as metric if value contains a number/percent (avoid grabbing every "Title: text" line)
      if (m && /[\d%]/.test(m.value) && (!m.unit || m.unit.length < 30)) {
        metricBullets.push(m);
      } else {
        detailBullets.push(b);
      }
    }
    // If we have lots of "metrics", keep only the first 3 for the tile row.
    const tiles = metricBullets.slice(0, 3);
    const remainingAsDetail = metricBullets.slice(3).map((m) => `**${m.label}:** ${m.value}${m.unit ? " " + m.unit : ""}`);
    const allDetails = [...remainingAsDetail, ...detailBullets];

    const tilesHtml = tiles.length
      ? `<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          ${tiles
            .map(
              (t) => `
            <div class="bg-white/85 border border-emerald-100 rounded-2xl p-5 text-center">
              <div class="text-[11px] font-bold tracking-[0.18em] uppercase text-emerald-700">${esc(t.label)}</div>
              <div class="mt-3 flex items-baseline justify-center gap-1.5 flex-wrap">
                <span class="text-3xl font-extrabold text-slate-900 leading-none">${esc(t.value)}</span>
                ${t.unit ? `<span class="text-sm text-slate-500 font-medium">${esc(t.unit)}</span>` : ""}
              </div>
            </div>`,
            )
            .join("")}
        </div>`
      : "";

    const detailsHtml = allDetails.length
      ? `<div class="space-y-4 mt-2">
          ${allDetails
            .map((b, i) => {
              const parts = splitTitled(b);
              const color = NUTRITION_CATEGORY_COLORS[i % NUTRITION_CATEGORY_COLORS.length];
              return `
              <div class="pl-4" style="border-left:3px solid ${color}">
                ${parts.head ? `<div class="text-[11px] font-bold tracking-[0.12em] uppercase mb-1" style="color:${color}">${esc(parts.head)}</div>` : ""}
                <p class="text-[15px] text-slate-700 leading-snug">${inline(parts.body)}</p>
              </div>`;
            })
            .join("")}
        </div>`
      : "";

    nutritionHtml = `
      <div class="nutrition-bg rounded-3xl p-6 md:p-8 card-shadow">
        <h3 class="text-2xl font-extrabold tracking-tight text-emerald-900 uppercase">Nutrition &amp; Diet Structure</h3>
        ${paragraphs.length
          ? `<p class="text-sm md:text-base text-slate-700 mt-2 mb-6 max-w-3xl">${inline(paragraphs.join(" "))}</p>`
          : '<div class="mb-4"></div>'}
        ${tilesHtml}
        ${detailsHtml}
      </div>`;
  }

  // ===== SIDE EFFECTS (cream cards) =====
  let sideEffectsHtml = "";
  if (sideEffectsSec) {
    const bullets = contentItems(sideEffectsSec.body);
    sideEffectsHtml = `
      <div class="card">
        <div class="flex items-center gap-3 mb-5">
          <span class="w-8 h-8 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </span>
          <h3 class="text-xl font-bold text-slate-900">Common Side Effects &amp; Management</h3>
        </div>
        <ul class="space-y-3">
          ${bullets
            .map((b, i) => {
              const parts = splitTitled(b);
              const isFirst = i === 0;
              const wrapperCls = isFirst
                ? "bg-orange-50 border border-orange-100"
                : "bg-slate-50 border border-slate-100";
              return `
              <li class="${wrapperCls} rounded-xl px-4 py-3">
                ${parts.head ? `<div class="text-base font-bold text-slate-900 mb-1">${esc(parts.head)}</div>` : ""}
                <p class="text-sm text-slate-600 leading-snug">${inline(parts.body)}</p>
              </li>`;
            })
            .join("")}
        </ul>
      </div>`;
  }

  // ===== RED-FLAG SYMPTOMS =====
  let redFlagHtml = "";
  if (redFlagSec) {
    const { paragraphs } = splitLines(redFlagSec.body);
    const bullets = contentItems(redFlagSec.body);
    redFlagHtml = `
      <div class="card-rose">
        <div class="flex items-center gap-3 mb-4">
          <span class="w-8 h-8 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </span>
          <h3 class="text-xl font-bold text-rose-700">Red-Flag Symptoms</h3>
        </div>
        ${paragraphs.length
          ? `<p class="italic text-rose-700/90 text-sm mb-4">${inline(paragraphs.join(" "))}</p>`
          : `<p class="italic text-rose-700/90 text-sm mb-4">Seek urgent medical attention if you experience:</p>`}
        <ul class="space-y-4">
          ${bullets
            .map((b) => {
              const parts = splitTitled(b);
              return `
              <li class="flex items-start gap-3">
                <span class="text-amber-500 text-xl leading-none pt-0.5">⚠️</span>
                <div>
                  ${parts.head ? `<div class="text-base font-bold text-slate-900">${esc(parts.head)}</div>` : ""}
                  <p class="text-sm text-rose-600 leading-snug">${inline(parts.body)}</p>
                </div>
              </li>`;
            })
            .join("")}
        </ul>
      </div>`;
  }

  // ===== FOLLOW-UP PLAN =====
  let followUpHtml = "";
  if (followUpSec) {
    const { paragraphs } = splitLines(followUpSec.body);
    const bullets = contentItems(followUpSec.body);
    const allText = [...paragraphs, ...bullets].join(" ");
    const weekMatch = allText.match(/week\s*(\d+)/i) || allText.match(/(\d+)(?:st|nd|rd|th)\s+(?:dose|week)/i);
    const milestone = weekMatch ? `WEEK ${weekMatch[1]}` : "REVIEW";
    followUpHtml = `
      <div class="followup relative overflow-hidden rounded-3xl p-8 md:p-10 card-shadow text-white">
        <div class="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div class="md:col-span-2">
            <h3 class="text-3xl md:text-4xl font-extrabold tracking-tight">Follow-Up Plan</h3>
            ${paragraphs.map((p) => `<p class="text-base text-teal-50/95 leading-relaxed mt-4 max-w-2xl">${inline(p)}</p>`).join("")}
            ${bullets.length
              ? `<ul class="mt-4 space-y-1.5">${bullets.map((b) => `<li class="text-sm text-teal-50/90">• ${inline(b)}</li>`).join("")}</ul>`
              : ""}
            <a href="https://wa.me/971000000000?text=${encodeURIComponent("Hello, I would like to book my recommended blood test.")}"
               class="inline-flex items-center gap-2 mt-6 bg-white text-slate-900 font-bold text-sm px-5 py-3 rounded-full hover:bg-slate-100 transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
              Book Recommended Blood Test
            </a>
          </div>
          <div class="text-right">
            <div class="text-[11px] font-bold tracking-[0.22em] uppercase text-teal-200">Next Milestone</div>
          </div>
        </div>
        <div class="watermark">${esc(milestone)}</div>
      </div>`;
  }

  // ===== EXTRAS (any unmatched sections) =====
  const extrasHtml = extras
    .map((s) => {
      const { bullets, paragraphs } = splitLines(s.body);
      return `
        <div class="card">
          <h3 class="text-xl font-bold text-slate-900 mb-4">${esc(s.title)}</h3>
          ${paragraphs.map((p) => `<p class="text-[15px] text-slate-700 leading-relaxed mb-2">${inline(p)}</p>`).join("")}
          ${bullets.length
            ? `<ul class="space-y-2 mt-3">${bullets
                .map(
                  (b) => `
              <li class="flex items-start gap-3">
                <span class="w-1.5 h-1.5 rounded-full bg-teal-600 mt-2.5 flex-shrink-0"></span>
                <span class="text-[15px] text-slate-700">${inline(b)}</span>
              </li>`,
                )
                .join("")}</ul>`
            : ""}
        </div>`;
    })
    .join("");

  // ===== SIGNATURE CARD =====
  const signatureHtml = `
    <div class="bg-white rounded-3xl card-shadow p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <p class="italic text-slate-500 text-sm mb-3">Best regards,</p>
        ${signatureUrl ? `<img src="${esc(signatureUrl)}" alt="Dr Sami signature" class="h-12 mb-2 object-contain" onerror="this.style.display='none'" />` : ""}
        <div class="text-2xl font-extrabold text-slate-900 tracking-tight">Dr Sami M. Yesuf</div>
        <div class="text-base font-semibold text-teal-700 mt-1">DarDoc Healthcare Services</div>
        <div class="text-sm text-slate-500 mt-0.5">SCOPE Certified Physician</div>
      </div>
      <button onclick="window.print()" class="no-print bg-slate-900 hover:bg-slate-800 text-white text-base font-bold px-7 py-4 rounded-full inline-flex items-center gap-3 transition">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Save Personal Guide
      </button>
    </div>`;

  // ===== ASSEMBLY =====
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Patient Journey Guide | ${esc(patientName)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f1f5f9; color: #0f172a; }
  .hero {
    background: linear-gradient(135deg, #0d9488 0%, #0f766e 60%, #115e59 100%);
  }
  .nutrition-bg {
    background-image:
      linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)),
      url('https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80');
    background-size: cover;
    background-position: center;
  }
  .followup {
    background: linear-gradient(135deg, #134e4a 0%, #0f3a37 100%);
  }
  .followup .watermark {
    position: absolute;
    right: -0.5rem;
    bottom: -1.25rem;
    font-size: clamp(5rem, 12vw, 9rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 0.85;
    color: rgba(255,255,255,0.06);
    pointer-events: none;
    user-select: none;
  }
  .card {
    background: #ffffff;
    border-radius: 1.5rem;
    padding: 1.75rem;
    box-shadow: 0 10px 30px -12px rgba(15,23,42,0.08), 0 4px 10px -4px rgba(15,23,42,0.04);
  }
  .card-rose {
    background: #fff5f5;
    border-radius: 1.5rem;
    padding: 1.75rem;
    box-shadow: 0 10px 30px -12px rgba(15,23,42,0.06);
  }
  .card-shadow { box-shadow: 0 20px 50px -20px rgba(15,23,42,0.12), 0 8px 16px -8px rgba(15,23,42,0.06); }
  .step-pill {
    width: 28px; height: 28px; border-radius: 999px;
    background: #0d9488; color: #fff;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; flex-shrink: 0;
  }
  @media print {
    .no-print { display: none !important; }
    body { background: #fff; }
    .card, .card-rose, .card-shadow { box-shadow: none !important; border: 1px solid #e2e8f0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { margin: 1.2cm; }
  }
</style>
</head>
<body class="min-h-screen">
  ${heroHtml}
  ${introSummaryHtml}

  <div class="max-w-6xl mx-auto px-4 md:px-6 mt-6 space-y-6 pb-10">
    ${(storageHtml || injectHtml)
      ? `<section class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${storageHtml || ""}
          ${injectHtml || ""}
        </section>`
      : ""}

    ${nutritionHtml ? `<section>${nutritionHtml}</section>` : ""}

    ${(sideEffectsHtml || redFlagHtml)
      ? `<section class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${sideEffectsHtml || ""}
          ${redFlagHtml || ""}
        </section>`
      : ""}

    ${followUpHtml ? `<section>${followUpHtml}</section>` : ""}

    ${extrasHtml ? `<section class="grid grid-cols-1 md:grid-cols-2 gap-6">${extrasHtml}</section>` : ""}

    <section>${signatureHtml}</section>

    <footer class="text-center text-xs tracking-[0.18em] uppercase text-slate-400 font-semibold pt-4">
      Internal Health Markers Monitoring Recommended &middot; DarDoc Weight Loss Program &middot; ${year}
    </footer>
  </div>
</body>
</html>`;
}
