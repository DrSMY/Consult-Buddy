/**
 * Branded magazine-style HTML for the Weight Loss / GLP-1 program.
 * Renders the AI-generated `::: SECTION :::` blocks into a structured
 * Tailwind layout matching the DarDoc reference design.
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
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(text: string): string {
  return esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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

/** Pull out bullets/numbered lines vs paragraph lines. */
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

function findSection(sections: Section[], ...keywords: string[]): Section | undefined {
  return sections.find((s) => {
    const u = s.title.toUpperCase();
    return keywords.some((k) => u.includes(k.toUpperCase()));
  });
}

/** Render a generic card for any unmatched section. */
function genericCard(s: Section): string {
  const { bullets, paragraphs } = splitLines(s.body);
  return `
    <div class="bg-white rounded-2xl p-6 card-shadow">
      <h3 class="text-lg font-bold text-slate-800 mb-3">${esc(s.title)}</h3>
      ${paragraphs.map((p) => `<p class="text-sm text-slate-600 mb-2">${inline(p)}</p>`).join("")}
      ${bullets.length
        ? `<ul class="space-y-1.5 mt-2">
            ${bullets
              .map(
                (b) =>
                  `<li class="flex items-start gap-2 text-sm text-slate-600"><span class="text-teal-600 mt-1">●</span><span>${inline(b)}</span></li>`,
              )
              .join("")}
          </ul>`
        : ""}
    </div>`;
}

export function buildWeightLossGuideHtml(params: WeightLossGuideParams): string {
  const { guideText, patientName, logoUrl, signatureUrl, summary } = params;
  const { intro, sections } = parseSections(guideText);

  const intoSec = findSection(sections, "INTRODUCTION", "ABOUT", "OVERVIEW");
  const summarySec = findSection(sections, "PATIENT SUMMARY", "YOUR SUMMARY");
  const storageSec = findSection(sections, "STORAGE");
  const injectSec = findSection(sections, "HOW TO INJECT", "HOW TO TAKE", "ADMINISTRATION");
  const nutritionSec = findSection(sections, "NUTRITION", "DIET", "MEAL");
  const sideEffectsSec = findSection(sections, "SIDE EFFECT");
  const redFlagSec = findSection(sections, "RED-FLAG", "RED FLAG", "URGENT", "WARNING");
  const followUpSec = findSection(sections, "FOLLOW-UP", "FOLLOW UP", "REVIEW");

  const handled = new Set(
    [intoSec, summarySec, storageSec, injectSec, nutritionSec, sideEffectsSec, redFlagSec, followUpSec].filter(Boolean).map((s) => s!.title),
  );
  const extras = sections.filter((s) => !handled.has(s.title));

  // ---------- Intro ----------
  const introText = intoSec?.body || intro || "";
  const { bullets: introBullets, paragraphs: introParas } = splitLines(introText);
  const introHtml = `
    <div class="bg-white rounded-2xl p-6 card-shadow h-full">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        </div>
        <h2 class="text-lg font-bold text-slate-800">Introduction</h2>
      </div>
      ${introParas.map((p) => `<p class="text-sm text-slate-600 leading-relaxed mb-3">${inline(p)}</p>`).join("")}
      ${introBullets.length
        ? `<ul class="space-y-2 mt-3">
            ${introBullets
              .map(
                (b) =>
                  `<li class="flex items-start gap-2"><span class="text-teal-600 font-bold mt-0.5">●</span><p class="text-sm text-slate-600">${inline(b)}</p></li>`,
              )
              .join("")}
          </ul>`
        : ""}
    </div>`;

  // ---------- Patient Summary ----------
  const sumW = summary?.weightKg;
  const sumH = summary?.heightCm;
  const sumB = summary?.bmi;
  const sumBClass = summary?.bmiClass;
  const sumCal = summary?.calorieTarget;
  const summaryHtml = `
    <div class="gradient-header text-white rounded-2xl p-6 card-shadow h-full">
      <h3 class="text-lg font-bold mb-4">Patient Summary</h3>
      <div class="space-y-3 text-sm">
        ${sumW != null ? `<div class="flex justify-between border-b border-white/20 pb-2"><span class="text-teal-100">Weight</span><span class="font-semibold">${sumW} kg</span></div>` : ""}
        ${sumH != null ? `<div class="flex justify-between border-b border-white/20 pb-2"><span class="text-teal-100">Height</span><span class="font-semibold">${sumH} cm</span></div>` : ""}
        ${sumB != null ? `<div class="flex justify-between border-b border-white/20 pb-2"><span class="text-teal-100">BMI</span><span class="font-semibold">${sumB.toFixed(1)}${sumBClass ? ` (${esc(sumBClass)})` : ""}</span></div>` : ""}
        ${sumCal != null ? `<div class="flex justify-between"><span class="text-teal-100">Caloric Target</span><span class="font-semibold">${sumCal} kcal/day</span></div>` : ""}
        ${summary?.medication ? `<div class="flex justify-between border-t border-white/20 pt-2"><span class="text-teal-100">Medication</span><span class="font-semibold">${esc(summary.medication)}${summary.dose ? ` · ${esc(summary.dose)}` : ""}</span></div>` : ""}
        ${!sumW && !sumH && !sumB && !sumCal && summarySec ? `<p class="text-sm text-teal-50">${inline(summarySec.body)}</p>` : ""}
      </div>
    </div>`;

  // ---------- Storage ----------
  const storageEmojis: Record<string, string> = {
    refrig: "❄️", "2": "❄️", cool: "❄️",
    room: "🏠", travel: "🏠", carry: "🏠",
    freez: "🚫", "do not": "🚫",
    light: "☀️", carton: "☀️", protect: "☀️",
  };
  const pickEmoji = (text: string) => {
    const low = text.toLowerCase();
    for (const k of Object.keys(storageEmojis)) if (low.includes(k)) return storageEmojis[k];
    return "📦";
  };
  const storageBullets = storageSec ? splitLines(storageSec.body).bullets : [];
  const storageHtml = storageSec
    ? `
    <div class="bg-white rounded-2xl p-6 card-shadow h-full">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>
        </div>
        <h3 class="text-lg font-bold text-slate-800">Storage Instructions</h3>
      </div>
      <ul class="space-y-2.5">
        ${storageBullets
          .map(
            (b) =>
              `<li class="flex items-start gap-3"><span class="text-xl leading-none">${pickEmoji(b)}</span><p class="text-sm text-slate-600">${inline(b)}</p></li>`,
          )
          .join("")}
      </ul>
    </div>`
    : "";

  // ---------- Inject / Take ----------
  const injectBullets = injectSec ? splitLines(injectSec.body).bullets : [];
  const injectHtml = injectSec
    ? `
    <div class="bg-white rounded-2xl p-6 card-shadow h-full">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/></svg>
        </div>
        <h3 class="text-lg font-bold text-slate-800">${esc(injectSec.title.replace(/\b\w/g, (c) => c.toUpperCase()))}</h3>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${injectBullets
          .map(
            (b, i) => `
          <div class="flex items-start gap-3">
            <div class="step-number">${i + 1}</div>
            <p class="text-sm text-slate-600 pt-0.5">${inline(b)}</p>
          </div>`,
          )
          .join("")}
      </div>
    </div>`
    : "";

  // ---------- Nutrition ----------
  const nutritionHtml = nutritionSec
    ? (() => {
        const { bullets, paragraphs } = splitLines(nutritionSec.body);
        return `
        <div class="nutrition-bg rounded-2xl p-6 card-shadow">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            </div>
            <h3 class="text-lg font-bold text-slate-800">Nutrition &amp; Diet Structure</h3>
          </div>
          ${paragraphs.map((p) => `<p class="text-sm text-slate-700 mb-3">${inline(p)}</p>`).join("")}
          ${bullets.length
            ? `<ul class="space-y-2 mt-2">
                ${bullets
                  .map(
                    (b) => `<li class="flex items-start gap-2 bg-white/70 rounded-lg p-2.5"><span class="text-green-600 font-bold mt-0.5">●</span><p class="text-sm text-slate-700">${inline(b)}</p></li>`,
                  )
                  .join("")}
              </ul>`
            : ""}
        </div>`;
      })()
    : "";

  // ---------- Side Effects ----------
  const sideEffectsHtml = sideEffectsSec
    ? (() => {
        const { bullets, paragraphs } = splitLines(sideEffectsSec.body);
        return `
        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 card-shadow h-full">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <h3 class="text-lg font-bold text-amber-900">Common Side Effects &amp; Management</h3>
          </div>
          ${paragraphs.map((p) => `<p class="text-sm text-amber-900 mb-2">${inline(p)}</p>`).join("")}
          <ul class="space-y-2">
            ${bullets
              .map(
                (b) => `<li class="bg-white/70 rounded-lg p-2.5 text-sm text-slate-700">${inline(b)}</li>`,
              )
              .join("")}
          </ul>
        </div>`;
      })()
    : "";

  // ---------- Red Flag ----------
  const redFlagHtml = redFlagSec
    ? (() => {
        const { bullets, paragraphs } = splitLines(redFlagSec.body);
        return `
        <div class="bg-red-50 border border-red-200 rounded-2xl p-6 card-shadow h-full">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-red-200 text-red-800 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            </div>
            <h3 class="text-lg font-bold text-red-900">Red-Flag Symptoms</h3>
          </div>
          ${paragraphs.map((p) => `<p class="text-sm text-red-900 mb-2">${inline(p)}</p>`).join("")}
          <ul class="space-y-2">
            ${bullets
              .map(
                (b) => `<li class="flex items-start gap-3 bg-white/70 rounded-lg p-2.5"><span class="text-red-600">⚠️</span><p class="text-sm text-slate-700">${inline(b)}</p></li>`,
              )
              .join("")}
          </ul>
        </div>`;
      })()
    : "";

  // ---------- Follow-up ----------
  const followUpHtml = followUpSec
    ? (() => {
        const { bullets, paragraphs } = splitLines(followUpSec.body);
        return `
        <div class="gradient-header text-white rounded-2xl p-6 card-shadow">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div class="md:col-span-2">
              <h3 class="text-lg font-bold mb-2">Follow-Up Plan</h3>
              ${paragraphs.map((p) => `<p class="text-sm text-teal-50 mb-2">${inline(p)}</p>`).join("")}
              ${bullets.length
                ? `<ul class="space-y-1 mt-2">${bullets.map((b) => `<li class="text-sm text-teal-50">• ${inline(b)}</li>`).join("")}</ul>`
                : ""}
            </div>
            <div class="text-center bg-white/15 rounded-xl p-4">
              <div class="text-xs uppercase tracking-wider text-teal-100">Next Milestone</div>
              <div class="text-2xl font-bold mt-1">Review</div>
            </div>
          </div>
        </div>`;
      })()
    : "";

  // ---------- Extras ----------
  const extrasHtml = extras.map(genericCard).join("");

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Patient Journey Guide | ${esc(patientName)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  body { font-family: 'Inter', sans-serif; background-color: #f1f5f9; color: #0f172a; }
  .gradient-header { background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); }
  .nutrition-bg {
    background-image: linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)),
      url('https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80');
    background-size: cover;
    background-position: center;
  }
  .card-shadow { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); }
  .step-number {
    background: #0d9488; color: white;
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: bold; flex-shrink: 0;
  }
  @media print {
    .no-print { display: none !important; }
    body { background: white; }
    .card-shadow { box-shadow: none; border: 1px solid #e2e8f0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { margin: 1.2cm; }
  }
</style>
</head>
<body class="min-h-screen">
  <div class="max-w-5xl mx-auto p-4 md:p-6 space-y-5">

    <!-- HERO HEADER -->
    <header class="gradient-header text-white rounded-2xl p-6 md:p-8 card-shadow">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-14 h-14 rounded-xl bg-white/95 p-2 flex items-center justify-center flex-shrink-0">
          <img src="${esc(logoUrl)}" alt="Dr Sami logo" class="max-w-full max-h-full object-contain" />
        </div>
        <div>
          <div class="text-xs uppercase tracking-widest text-teal-100 font-semibold">Clinical Weight Management</div>
          <div class="text-xs text-teal-100/80 mt-0.5">${today}</div>
        </div>
      </div>
      <h1 class="text-2xl md:text-3xl font-extrabold leading-tight">Hi ${esc(patientName)},</h1>
      <p class="text-sm md:text-base text-teal-50 mt-2 max-w-2xl">
        This is your personalized roadmap to start your journey with us and take your medication as advised for sustainable health improvements.
      </p>
    </header>

    <!-- ROW 1: Intro + Summary -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-2">${introHtml}</div>
      <div>${summaryHtml}</div>
    </section>

    ${(storageHtml || injectHtml)
      ? `<section class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${storageHtml || '<div></div>'}
          ${injectHtml || '<div></div>'}
        </section>`
      : ""}

    ${nutritionHtml ? `<section>${nutritionHtml}</section>` : ""}

    ${(sideEffectsHtml || redFlagHtml)
      ? `<section class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${sideEffectsHtml || '<div></div>'}
          ${redFlagHtml || '<div></div>'}
        </section>`
      : ""}

    ${followUpHtml ? `<section>${followUpHtml}</section>` : ""}

    ${extrasHtml ? `<section class="grid grid-cols-1 md:grid-cols-2 gap-4">${extrasHtml}</section>` : ""}

    <!-- SIGNATURE -->
    <section class="bg-white rounded-2xl p-6 card-shadow">
      <div class="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div class="flex-1">
          <p class="text-sm text-slate-600 mb-2">Best regards,</p>
          <div class="w-32 h-16 mb-1">
            <img src="${esc(signatureUrl)}" alt="Dr Sami signature" class="max-w-full max-h-full object-contain" />
          </div>
          <div class="text-base font-bold text-slate-800">Dr Sami M. Yesuf</div>
          <div class="text-xs text-slate-500">DarDoc Healthcare Services</div>
          <div class="text-xs text-teal-700 font-semibold mt-0.5">SCOPE Certified Physician</div>
        </div>
        <button onclick="window.print()" class="no-print bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Save Personal Guide
        </button>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="text-center text-xs text-slate-500 py-4">
      <span class="font-semibold text-teal-700">DarDoc</span> · Weight Loss Program · ${new Date().getFullYear()}
    </footer>

  </div>
</body>
</html>`;
}
