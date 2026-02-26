/**
 * Generate a self-contained HTML patient guide with inline CSS.
 * Works for both GLP-1 (weight loss) and peptide consultation flows.
 */

export interface GuidePatientData {
  name: string;
  gender?: string;
  age?: number | string;
  height?: number | string;
  weight?: number | string;
  bmi?: number | null;
  mobileNumber?: string;
  activityLevel?: string;
  chronicIllnesses?: string;
}

export interface GuideMedication {
  name: string;
  dose?: string;
  administration?: string;
  duration?: string;
  storageNote?: string;
}

export interface GuideSupplement {
  name: string;
  dosage: string;
  reason?: string;
}

export interface GuideNutrition {
  proteinMin?: number;
  proteinMax?: number;
  calorieTarget?: number;
  hydration?: string;
  macroBreakdown?: string;
}

export interface GuideSideEffect {
  effect: string;
  management: string;
}

export interface GuideRedFlag {
  symptom: string;
}

export interface GuideLabTest {
  name: string;
  tier?: "required" | "recommended";
  link?: string;
}

export interface GuideFollowUp {
  schedule?: string;
  notes?: string;
}

export interface PatientGuideData {
  patient: GuidePatientData;
  medications: GuideMedication[];
  supplements?: GuideSupplement[];
  nutrition?: GuideNutrition;
  sideEffects?: GuideSideEffect[];
  redFlags?: GuideRedFlag[];
  labTests?: GuideLabTest[];
  followUp?: GuideFollowUp;
  aiGeneratedText?: string;
  clinicName?: string;
  doctorName?: string;
}

function getSalutation(gender?: string): string {
  if (!gender) return "";
  if (gender === "Male") return "Mr.";
  if (gender === "Female") return "Ms.";
  return "";
}

function getBmiLabel(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obesity I";
  if (bmi < 40) return "Obesity II";
  return "Obesity III";
}

const TEAL_PRIMARY = "#0891b2";
const TEAL_DARK = "#0e7490";
const TEAL_LIGHT = "#e0f7fa";
const CARD_BG = "#ffffff";
const TEXT_MAIN = "#1e293b";
const TEXT_MUTED = "#64748b";
const BORDER = "#e2e8f0";
const AMBER_BG = "#fffbeb";
const AMBER_BORDER = "#fde68a";
const RED_BG = "#fef2f2";
const RED_BORDER = "#fecaca";
const GREEN_BG = "#f0fdf4";
const GREEN_BORDER = "#bbf7d0";
const BLUE_BG = "#eff6ff";
const BLUE_BORDER = "#bfdbfe";

function cardStyle(borderColor = BORDER) {
  return `background:${CARD_BG};border:1px solid ${borderColor};border-radius:12px;padding:20px;margin-bottom:16px;`;
}

function sectionTitle(icon: string, color = TEAL_PRIMARY) {
  return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"><span style="font-size:18px;">${icon}</span><span style="font-size:15px;font-weight:700;color:${color};">`; 
}

function closeSectionTitle() {
  return `</span></div>`;
}

export function generateGuideHTML(data: PatientGuideData): string {
  const { patient, medications, supplements, nutrition, sideEffects, redFlags, labTests, followUp } = data;
  const clinic = data.clinicName || "PeptiDOC";
  const sal = getSalutation(patient.gender);
  const greeting = sal ? `${sal} ${patient.name}` : patient.name;

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Patient Guide - ${patient.name}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;color:${TEXT_MAIN};">
<div style="max-width:600px;margin:0 auto;padding:16px;">`;

  // Header Card
  html += `<div style="background:linear-gradient(135deg,${TEAL_PRIMARY},${TEAL_DARK});border-radius:12px;padding:24px;margin-bottom:16px;color:#fff;text-align:center;">
    <div style="font-size:24px;font-weight:800;letter-spacing:-0.5px;">Pepti<span style="color:#e0f7fa;">DOC</span></div>
    <div style="font-size:12px;margin-top:4px;opacity:0.85;">${clinic}</div>
    <div style="margin-top:16px;font-size:16px;font-weight:600;">Your Personal Care Guide</div>
    <div style="font-size:13px;margin-top:4px;opacity:0.9;">Dear ${greeting}</div>
  </div>`;

  // Patient Summary Card
  const bmi = patient.bmi ? Number(patient.bmi) : null;
  const summaryItems: string[] = [];
  if (patient.age) summaryItems.push(`<b>Age:</b> ${patient.age}`);
  if (patient.gender) summaryItems.push(`<b>Gender:</b> ${patient.gender}`);
  if (patient.height) summaryItems.push(`<b>Height:</b> ${Math.round(Number(patient.height))} cm`);
  if (patient.weight) summaryItems.push(`<b>Weight:</b> ${Math.round(Number(patient.weight))} kg`);
  if (bmi) summaryItems.push(`<b>BMI:</b> ${bmi.toFixed(1)} (${getBmiLabel(bmi)})`);

  if (summaryItems.length > 0) {
    html += `<div style="${cardStyle()}">
      ${sectionTitle("👤")}Patient Summary${closeSectionTitle()}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;color:${TEXT_MUTED};">
        ${summaryItems.map(i => `<div style="background:${TEAL_LIGHT};padding:8px 12px;border-radius:8px;">${i}</div>`).join("")}
      </div>
    </div>`;
  }

  // Medications Card
  if (medications.length > 0) {
    html += `<div style="${cardStyle(BLUE_BORDER)}background:${BLUE_BG};">
      ${sectionTitle("💊", "#2563eb")}Prescribed Medications${closeSectionTitle()}
      ${medications.map(m => {
        let lines = `<div style="margin-bottom:10px;"><div style="font-weight:600;font-size:14px;color:${TEXT_MAIN};">${m.name}${m.dose ? ` — ${m.dose}` : ""}</div>`;
        if (m.administration) lines += `<div style="font-size:12px;color:${TEXT_MUTED};margin-top:2px;">Administration: ${m.administration}</div>`;
        if (m.duration) lines += `<div style="font-size:12px;color:${TEXT_MUTED};">Duration: ${m.duration}</div>`;
        if (m.storageNote) lines += `<div style="font-size:12px;color:${TEXT_MUTED};">Storage: ${m.storageNote}</div>`;
        lines += `</div>`;
        return lines;
      }).join("")}
    </div>`;
  }

  // Supplements Card
  if (supplements && supplements.length > 0) {
    html += `<div style="${cardStyle(GREEN_BORDER)}background:${GREEN_BG};">
      ${sectionTitle("🌿", "#16a34a")}Recommended Supplements${closeSectionTitle()}
      ${supplements.map(s => `<div style="margin-bottom:6px;font-size:13px;"><b>${s.name}</b> — ${s.dosage}${s.reason ? ` <span style="color:${TEXT_MUTED};">(${s.reason})</span>` : ""}</div>`).join("")}
    </div>`;
  }

  // Nutrition Card
  if (nutrition && (nutrition.proteinMin || nutrition.calorieTarget)) {
    html += `<div style="${cardStyle(GREEN_BORDER)}background:${GREEN_BG};">
      ${sectionTitle("🥗", "#16a34a")}Nutrition & Diet${closeSectionTitle()}
      <div style="font-size:13px;color:${TEXT_MUTED};line-height:1.7;">`;
    if (nutrition.proteinMin && nutrition.proteinMax) {
      html += `<div>🥩 <b>Protein target:</b> ${nutrition.proteinMin}–${nutrition.proteinMax}g/day</div>`;
    }
    if (nutrition.calorieTarget) {
      html += `<div>🔥 <b>Calorie target:</b> ~${nutrition.calorieTarget} kcal/day</div>`;
    }
    if (nutrition.macroBreakdown) {
      html += `<div>📊 <b>Macros:</b> ${nutrition.macroBreakdown}</div>`;
    }
    html += `<div>💧 <b>Hydration:</b> ${nutrition.hydration || "Minimum 2L water/day"}</div>`;
    html += `</div></div>`;
  }

  // Side Effects Card
  if (sideEffects && sideEffects.length > 0) {
    html += `<div style="${cardStyle(AMBER_BORDER)}background:${AMBER_BG};">
      ${sectionTitle("⚠️", "#d97706")}Common Side Effects${closeSectionTitle()}
      ${sideEffects.map(se => `<div style="margin-bottom:8px;font-size:13px;"><b style="color:#92400e;">${se.effect}</b><div style="color:${TEXT_MUTED};font-size:12px;margin-top:2px;">💡 ${se.management}</div></div>`).join("")}
    </div>`;
  }

  // Red Flags Card
  if (redFlags && redFlags.length > 0) {
    html += `<div style="${cardStyle(RED_BORDER)}background:${RED_BG};">
      ${sectionTitle("🚨", "#dc2626")}When to Seek Urgent Care${closeSectionTitle()}
      <ul style="margin:0;padding-left:20px;font-size:13px;color:#991b1b;line-height:1.8;">
        ${redFlags.map(rf => `<li>${rf.symptom}</li>`).join("")}
      </ul>
    </div>`;
  }

  // Lab Tests Card
  if (labTests && labTests.length > 0) {
    html += `<div style="${cardStyle()}">
      ${sectionTitle("🔬")}Lab Tests${closeSectionTitle()}
      <div style="font-size:13px;color:${TEXT_MUTED};line-height:1.8;">
        ${labTests.map(t => {
          const badge = t.tier === "required"
            ? `<span style="background:${TEAL_PRIMARY};color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:600;">REQUIRED</span>`
            : t.tier === "recommended"
            ? `<span style="background:${AMBER_BORDER};color:#92400e;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:600;">RECOMMENDED</span>`
            : "";
          const link = t.link ? ` <a href="${t.link}" style="color:${TEAL_PRIMARY};font-size:11px;">Book →</a>` : "";
          return `<div>• ${t.name} ${badge}${link}</div>`;
        }).join("")}
      </div>
    </div>`;
  }

  // Follow-up Card
  if (followUp && (followUp.schedule || followUp.notes)) {
    html += `<div style="${cardStyle()}">
      ${sectionTitle("📅")}Follow-up Plan${closeSectionTitle()}
      <div style="font-size:13px;color:${TEXT_MUTED};line-height:1.7;">
        ${followUp.schedule ? `<div>📋 ${followUp.schedule}</div>` : ""}
        ${followUp.notes ? `<div>${followUp.notes}</div>` : ""}
      </div>
    </div>`;
  }

  // AI Generated Text (if present and no structured cards override it)
  if (data.aiGeneratedText && medications.length === 0) {
    html += `<div style="${cardStyle()}">
      ${sectionTitle("✨")}Care Instructions${closeSectionTitle()}
      <div style="font-size:13px;color:${TEXT_MUTED};white-space:pre-wrap;line-height:1.7;">${data.aiGeneratedText}</div>
    </div>`;
  }

  // Footer
  html += `<div style="text-align:center;padding:16px;font-size:11px;color:${TEXT_MUTED};">
    <div style="border-top:1px solid ${BORDER};padding-top:12px;">
      ${data.doctorName ? `<div style="font-weight:600;color:${TEXT_MAIN};">${data.doctorName}</div>` : ""}
      <div>${clinic} • Patient Care Guide</div>
      <div style="margin-top:4px;">This guide is for informational purposes. Always follow your doctor's instructions.</div>
    </div>
  </div>`;

  html += `</div></body></html>`;
  return html;
}

/**
 * Convert HTML guide to plain text for WhatsApp sharing.
 */
export function guideToPlainText(data: PatientGuideData): string {
  const { patient, medications, supplements, nutrition, sideEffects, redFlags, labTests, followUp } = data;
  const sal = getSalutation(patient.gender);
  const greeting = sal ? `${sal} ${patient.name}` : patient.name;
  const clinic = data.clinicName || "PeptiDOC";

  let text = `${clinic} — Patient Care Guide\n\nDear ${greeting},\n\n`;

  if (medications.length > 0) {
    text += `💊 PRESCRIBED MEDICATIONS\n`;
    medications.forEach(m => {
      text += `• ${m.name}${m.dose ? ` — ${m.dose}` : ""}`;
      if (m.administration) text += `\n  Administration: ${m.administration}`;
      if (m.duration) text += `\n  Duration: ${m.duration}`;
      if (m.storageNote) text += `\n  Storage: ${m.storageNote}`;
      text += `\n`;
    });
    text += `\n`;
  }

  if (supplements && supplements.length > 0) {
    text += `🌿 SUPPLEMENTS\n`;
    supplements.forEach(s => { text += `• ${s.name} — ${s.dosage}${s.reason ? ` (${s.reason})` : ""}\n`; });
    text += `\n`;
  }

  if (nutrition && (nutrition.proteinMin || nutrition.calorieTarget)) {
    text += `🥗 NUTRITION\n`;
    if (nutrition.proteinMin && nutrition.proteinMax) text += `• Protein: ${nutrition.proteinMin}–${nutrition.proteinMax}g/day\n`;
    if (nutrition.calorieTarget) text += `• Calories: ~${nutrition.calorieTarget} kcal/day\n`;
    if (nutrition.macroBreakdown) text += `• Macros: ${nutrition.macroBreakdown}\n`;
    text += `• Hydration: ${nutrition.hydration || "Minimum 2L water/day"}\n\n`;
  }

  if (sideEffects && sideEffects.length > 0) {
    text += `⚠️ SIDE EFFECTS\n`;
    sideEffects.forEach(se => { text += `• ${se.effect}: ${se.management}\n`; });
    text += `\n`;
  }

  if (redFlags && redFlags.length > 0) {
    text += `🚨 SEEK URGENT CARE IF\n`;
    redFlags.forEach(rf => { text += `• ${rf.symptom}\n`; });
    text += `\n`;
  }

  if (labTests && labTests.length > 0) {
    text += `🔬 LAB TESTS\n`;
    labTests.forEach(t => { text += `• ${t.name}${t.tier ? ` (${t.tier})` : ""}${t.link ? ` — ${t.link}` : ""}\n`; });
    text += `\n`;
  }

  if (followUp && (followUp.schedule || followUp.notes)) {
    text += `📅 FOLLOW-UP\n`;
    if (followUp.schedule) text += `• ${followUp.schedule}\n`;
    if (followUp.notes) text += `• ${followUp.notes}\n`;
    text += `\n`;
  }

  text += `— ${clinic}\nThis guide is for informational purposes. Always follow your doctor's instructions.`;
  return text;
}
