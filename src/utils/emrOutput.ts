// Build a structured EMR-style summary from weight-loss consultation data

interface EmrInput {
  patient: any;
  treatment: any;
  recs: any;
  doctorNotes: string | null;
  createdAt: string;
}

const MED_GENERIC: Record<string, string> = {
  Mounjaro: "tirzepatide",
  Wegovy: "semaglutide",
  "Wegovy Pill": "oral semaglutide",
  Ozempic: "semaglutide",
  Rybelsus: "oral semaglutide",
  Foundayo: "tirzepatide",
};

const MED_FREQUENCY: Record<string, string> = {
  Mounjaro: "once weekly",
  Wegovy: "once weekly",
  Ozempic: "once weekly",
  "Wegovy Pill": "once daily",
  Rybelsus: "once daily",
  Foundayo: "once weekly",
};

function formatDateDMY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal weight";
  if (bmi < 30) return "overweight";
  if (bmi < 35) return "obesity class I";
  if (bmi < 40) return "obesity class II";
  return "obesity class III";
}

export function buildEmrOutput(input: EmrInput): string {
  const { patient, treatment, recs, doctorNotes, createdAt } = input;
  const lines: string[] = [];

  const encounterDateObj = new Date(createdAt);
  lines.push(`=== EMR CLINICAL SUMMARY ===`);
  lines.push("");
  lines.push(`Date of Encounter: ${formatDateDMY(encounterDateObj)}`);
  lines.push("");

  // PATIENT
  lines.push("PATIENT");
  lines.push("");
  if (patient?.name) lines.push(`Name: ${patient.name}`);
  if (patient?.age) lines.push(`Age: ${patient.age} years`);
  if (patient?.gender) lines.push(`Gender: ${patient.gender}`);
  if (patient?.height) lines.push(`Height: ${patient.height} cm`);
  if (patient?.weight) lines.push(`Weight: ${patient.weight} kg`);
  if (patient?.bmi) lines.push(`BMI: ${Number(patient.bmi).toFixed(1)} kg/m²`);
  if (patient?.chronicIllnesses) lines.push(`Chronic Illnesses: ${titleCase(String(patient.chronicIllnesses))}`);
  if (patient?.medications) lines.push(`Current Medications: ${patient.medications}`);
  if (patient?.allergies) lines.push(`Allergies: ${patient.allergies}`);
  lines.push("");

  // CLINICAL SUMMARY (narrative)
  lines.push("CLINICAL SUMMARY");
  lines.push("");

  const rawMed = treatment?.medication;
  const isNoMed = !rawMed || rawMed === "None";
  const salutation = patient?.gender === "Male" ? "Mr." : patient?.gender === "Female" ? "Ms." : "";
  const pronounSubj = patient?.gender === "Male" ? "He" : patient?.gender === "Female" ? "She" : "The patient";
  const pronounLow = pronounSubj.toLowerCase();
  const bmiVal = patient?.bmi ? Number(patient.bmi) : null;
  const bmiCat = bmiVal ? getBmiCategory(bmiVal) : "";
  const ageStr = patient?.age ? `${patient.age}-year-old ` : "";
  const genderStr = patient?.gender ? String(patient.gender).toLowerCase() : "patient";

  const conditionPhrase = patient?.chronicIllnesses
    ? ` and a history of ${String(patient.chronicIllnesses).toLowerCase()}`
    : " and no significant chronic illnesses";

  let priorTherapy = " There is no prior history of GLP-1 receptor agonist therapy.";
  if (patient?.previousGlp1Use) {
    const prev = patient.previousMedication;
    const generic = prev && MED_GENERIC[prev] ? ` (${MED_GENERIC[prev]})` : "";
    const doseTxt = patient.previousDose ? ` with dose escalation up to ${patient.previousDose}` : "";
    priorTherapy = ` ${pronounSubj} has previously used ${prev ? `${prev.toLowerCase()}${generic}` : "a GLP-1 receptor agonist"}${doseTxt}.`;
  }

  const pregBfNotes: string[] = [];
  if (patient?.gender === "Female") {
    if (!patient?.isPregnant && !patient?.isBreastfeeding) {
      pregBfNotes.push("denies pregnancy or breastfeeding");
    }
  }
  const allergyClause = patient?.allergies
    ? `reports allergies to ${patient.allergies}`
    : "reports no known drug allergies";
  pregBfNotes.push(allergyClause);
  const denialsLine = ` ${pronounSubj} ${pregBfNotes.join(" and ")}.`;

  const contraLine = ` There are no identified contraindications to GLP-1${
    rawMed === "Mounjaro" || rawMed === "Foundayo" ? "/GIP" : ""
  } receptor agonist therapy.`;

  const opening = `${salutation ? salutation + " " : ""}${patient?.name || "The patient"} is a ${ageStr}${genderStr}${
    bmiCat ? ` with ${bmiCat}${bmiVal ? ` (BMI ${bmiVal.toFixed(1)} kg/m²)` : ""}` : ""
  }${conditionPhrase}.${priorTherapy}${denialsLine}${contraLine}`;
  lines.push(opening);
  lines.push("");

  const weightNum = typeof patient?.weight === "number" ? patient.weight : Number(patient?.weight) || 0;
  const proteinMin = weightNum ? Math.round(weightNum * 1.2) : null;
  const proteinMax = weightNum ? Math.round(weightNum * 1.5) : null;
  const cals = patient?.weightLossCalories ? Math.round(patient.weightLossCalories) : null;

  if (cals || (proteinMin && proteinMax)) {
    const calsTxt = cals ? `a daily caloric intake target of ≤${cals.toLocaleString()} kcal/day was recommended` : "";
    const protTxt = proteinMin && proteinMax ? `a protein intake goal of ${proteinMin}–${proteinMax} g/day` : "";
    const combined = [calsTxt, protTxt].filter(Boolean).join(", with ");
    lines.push(
      `Based on ${pronounLow === "she" ? "her" : pronounLow === "he" ? "his" : "their"} current assessment, ${combined}. Lifestyle modification, dietary optimization, physical activity, realistic weight-loss expectations, and treatment goals were discussed.`
    );
    lines.push("");
  }

  // MEDICATION PRESCRIBED
  lines.push("MEDICATION PRESCRIBED");
  lines.push("");
  if (isNoMed) {
    lines.push("No medication prescribed at this visit.");
    const reason = (treatment?.noMedicationReason || "").trim();
    lines.push(`Reason: ${reason || "Not documented — please update consultation notes."}`);
  } else {
    const generic = MED_GENERIC[rawMed];
    const freq = MED_FREQUENCY[rawMed] || "";
    const medDisplay = rawMed === "Other"
      ? (treatment?.otherDetail || "Medication")
      : `${rawMed}${generic ? ` (${generic})` : ""}`;
    const dose = treatment?.dose || "";
    lines.push(`${medDisplay}${dose ? ` ${dose}` : ""}${freq ? ` ${freq}` : ""}`.trim());
    lines.push("");
    lines.push(
      "The patient was counseled regarding expected benefits, common side effects, injection technique, adherence, and the importance of reporting any adverse effects promptly."
    );
  }
  if (treatment?.notes) {
    lines.push("");
    lines.push(`Notes: ${treatment.notes}`);
  }
  lines.push("");

  // INVESTIGATIONS
  lines.push("INVESTIGATIONS");
  lines.push("");
  const bloodLevel = recs?.bloodTestLevel || treatment?.bloodTestLevel || "none";
  if (bloodLevel === "required") {
    lines.push("Weight Loss Blood Test Panel: Required");
    lines.push("");
    lines.push("Link: https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test");
  } else if (bloodLevel === "recommended") {
    lines.push("Weight Loss Blood Test Panel: Recommended");
    lines.push("");
    lines.push("Link: https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test");
  } else {
    lines.push("No additional investigations required at this time.");
  }
  lines.push("");

  // DOCTOR NOTES
  if (doctorNotes) {
    lines.push("DOCTOR NOTES");
    lines.push("");
    lines.push(doctorNotes);
    lines.push("");
  }

  // PLAN
  lines.push("PLAN");
  lines.push("");
  const followUp = new Date(encounterDateObj);
  followUp.setDate(encounterDateObj.getDate() + 21);
  lines.push(`Follow-up appointment scheduled for ${formatDateDMY(followUp)}.`);
  lines.push("");
  lines.push("Assess response, tolerance, and compliance at follow-up.");
  if (!isNoMed && ["Mounjaro", "Wegovy", "Wegovy Pill", "Ozempic", "Rybelsus", "Foundayo"].includes(rawMed)) {
    lines.push("Consider dose titration if treatment is well tolerated.");
  }
  lines.push("Continue monitoring weight, appetite, and any medication-related side effects.");
  lines.push("");
  lines.push("Physician:");
  lines.push("Dr Sami M. Yesuf");
  lines.push("DarDoc Healthcare");

  return lines.join("\n");
}

// ============================================================
// PEPTIDE EMR OUTPUT (patient-centered narrative for peptide consultations)
// ============================================================

interface PeptideEmrPeptide {
  name: string;
  dosage?: string;
  administration?: string;
  duration?: string;
  frequency?: string;
  rationale?: string;
  vial_size_ml?: number;
  dose_per_injection_ml?: number;
  supply_days?: number;
}

interface PeptideEmrSupplement {
  name: string;
  dosage?: string;
  reason?: string;
}

interface PeptideEmrInput {
  patientName?: string;
  age?: number | string;
  gender?: string;
  height?: number | string;
  weight?: number | string;
  chronicIllnesses?: string;
  medications?: string;
  allergies?: string;
  chiefComplaint?: string;
  clinicalSummary?: string;
  peptides: PeptideEmrPeptide[];
  supplements: PeptideEmrSupplement[];
  labTests: string[];
  labTier?: string;
  labNotes?: string;
  createdAt?: string;
  intake?: Record<string, any>;
}

// Normalize a field that may be a string, array, or null into a clean comma-joined string
function normalizeList(val: any): string {
  if (val == null) return "";
  if (Array.isArray(val)) return val.filter(Boolean).map((x) => String(x).trim()).join(", ");
  return String(val).trim();
}

function possessive(pronounSubj: string): string {
  if (pronounSubj === "He") return "his";
  if (pronounSubj === "She") return "her";
  return "their";
}

export function buildPeptideEmrOutput(input: PeptideEmrInput): string {
  const {
    patientName,
    age,
    gender,
    height,
    weight,
    chronicIllnesses,
    medications,
    allergies,
    chiefComplaint,
    clinicalSummary,
    peptides,
    supplements,
    labTests,
    labTier,
    labNotes,
    createdAt,
    intake = {},
  } = input;

  const lines: string[] = [];
  const encounterDateObj = createdAt ? new Date(createdAt) : new Date();

  const heightNum = height ? Number(height) : null;
  const weightNum = weight ? Number(weight) : null;
  const bmiVal =
    heightNum && weightNum ? weightNum / ((heightNum / 100) ** 2) : null;
  const bmiCat = bmiVal ? getBmiCategory(bmiVal) : "";

  // Consolidate allergies from multiple possible intake fields
  const allergyStr = [
    normalizeList(allergies),
    normalizeList(intake.allergies_other),
    normalizeList(intake.allergies_notes),
  ].filter((s) => s && s.toLowerCase() !== "none").join(", ");

  // Consolidate health conditions / chronic illnesses
  const conditionsStr = [
    normalizeList(chronicIllnesses),
    normalizeList(intake.health_conditions),
    normalizeList(intake.health_conditions_other),
  ].filter((s) => s && s.toLowerCase() !== "none").join(", ");
  const conditionsNotes = normalizeList(intake.health_conditions_notes);

  // Cancer / family history
  const cancerHistory = normalizeList(intake.cancer_history);
  const cancerNotes = normalizeList(intake.cancer_history_notes);

  // Health goals
  const healthGoals = normalizeList(intake.health_goals);
  const healthGoalsOther = normalizeList(intake.health_goals_other);
  const goalsStr = [healthGoals, healthGoalsOther].filter(Boolean).join(", ");

  lines.push("=== EMR CLINICAL SUMMARY ===");
  lines.push("");
  lines.push(`Date of Encounter: ${formatDateDMY(encounterDateObj)}`);
  lines.push("");

  // PATIENT
  lines.push("PATIENT");
  lines.push("");
  if (patientName) lines.push(`Name: ${patientName}`);
  if (age) lines.push(`Age: ${age} years`);
  if (gender) lines.push(`Gender: ${gender}`);
  if (heightNum) lines.push(`Height: ${Math.round(heightNum)} cm`);
  if (weightNum) lines.push(`Weight: ${Math.round(weightNum)} kg`);
  if (bmiVal) lines.push(`BMI: ${bmiVal.toFixed(1)} kg/m²`);
  lines.push(`Chronic Illnesses: ${conditionsStr ? titleCase(conditionsStr) : "None reported"}`);
  if (conditionsNotes) lines.push(`  Notes: ${conditionsNotes}`);
  lines.push(`Current Medications: ${normalizeList(medications) || "None reported"}`);
  lines.push(`Allergies: ${allergyStr || "No known drug allergies"}`);
  if (cancerHistory) {
    lines.push(`Cancer / Tumor History: ${cancerHistory}${cancerNotes ? ` — ${cancerNotes}` : ""}`);
  } else {
    lines.push("Cancer / Tumor History: No personal or family history reported");
  }
  if (goalsStr) lines.push(`Health Goals: ${goalsStr}`);
  if (chiefComplaint) lines.push(`Chief Concern: ${chiefComplaint}`);
  lines.push("");

  // CLINICAL SUMMARY narrative
  lines.push("CLINICAL SUMMARY");
  lines.push("");
  const salutation = gender === "Male" ? "Mr." : gender === "Female" ? "Ms." : "";
  const pronounSubj = gender === "Male" ? "He" : gender === "Female" ? "She" : "The patient";
  const pronPoss = possessive(pronounSubj);
  const ageStr = age ? `${age}-year-old ` : "";
  const genderStr = gender ? String(gender).toLowerCase() : "patient";
  const conditionPhrase = conditionsStr
    ? ` with a history of ${conditionsStr.toLowerCase()}`
    : " with no significant chronic illnesses";
  const bmiPhrase = bmiCat
    ? `, ${bmiCat}${bmiVal ? ` (BMI ${bmiVal.toFixed(1)} kg/m²)` : ""}`
    : "";
  const allergyClause = allergyStr
    ? `reports allergies to ${allergyStr}`
    : "reports no known drug allergies";
  const cancerClause = cancerHistory
    ? ` Cancer/tumor history: ${cancerHistory.toLowerCase()}${cancerNotes ? ` (${cancerNotes})` : ""}.`
    : " No personal or family history of cancer or tumors reported.";
  const goalsClause = goalsStr ? ` Stated health goals include ${goalsStr.toLowerCase()}.` : "";
  const chiefLine = chiefComplaint
    ? ` Presenting concern: ${chiefComplaint}.`
    : "";

  const opening = `${salutation ? salutation + " " : ""}${patientName || "The patient"} is a ${ageStr}${genderStr}${bmiPhrase}${conditionPhrase}. ${pronounSubj} ${allergyClause}.${cancerClause}${goalsClause}${chiefLine} Following clinical review, a personalised peptide therapy plan was formulated based on ${pronPoss} presentation, goals, and safety profile. There are no identified contraindications to the prescribed regimen.`;
  lines.push(opening);

  if (clinicalSummary && clinicalSummary.trim()) {
    lines.push("");
    lines.push(clinicalSummary.trim());
  }
  lines.push("");

  // MEDICATIONS PRESCRIBED
  lines.push("MEDICATIONS PRESCRIBED");
  lines.push("");
  if (peptides.length === 0) {
    lines.push("No peptide therapy prescribed at this visit.");
  } else {
    peptides.forEach((p, idx) => {
      const parts: string[] = [`${idx + 1}. ${p.name}`];
      const details: string[] = [];
      if (p.dosage) details.push(p.dosage);
      if (p.frequency) details.push(p.frequency);
      if (p.administration) details.push(p.administration);
      if (p.duration) details.push(`for ${p.duration}`);
      if (details.length) parts.push(`— ${details.join(", ")}`);
      lines.push(parts.join(" "));
      if (p.rationale) lines.push(`   Rationale: ${p.rationale}`);
      if (p.vial_size_ml && p.dose_per_injection_ml) {
        const total = Math.floor(p.vial_size_ml / p.dose_per_injection_ml);
        lines.push(
          `   Supply: ${p.vial_size_ml} ml vial, ${p.dose_per_injection_ml} ml/injection (${total} injections${p.supply_days ? `, ~${p.supply_days} days` : ""})`
        );
      }
    });
    lines.push("");
    lines.push(
      "The patient was counseled regarding expected benefits, common side effects, injection technique, storage, adherence, and the importance of reporting any adverse effects promptly."
    );
  }
  lines.push("");

  // SUPPLEMENTS
  if (supplements.length > 0) {
    lines.push("SUPPORTIVE SUPPLEMENTS");
    lines.push("");
    supplements.forEach((s, idx) => {
      lines.push(`${idx + 1}. ${s.name}${s.dosage ? ` — ${s.dosage}` : ""}`);
      if (s.reason) lines.push(`   Purpose: ${s.reason}`);
    });
    lines.push("");
  }

  // INVESTIGATIONS
  lines.push("INVESTIGATIONS");
  lines.push("");
  if (labTests.length === 0) {
    lines.push("No additional investigations required at this time.");
  } else {
    const tierLabel = labTier === "advanced" ? "Advanced/Comprehensive Panel" : "Basic Panel";
    lines.push(`Panel: ${tierLabel}`);
    labTests.forEach((t) => lines.push(`- ${t}`));
    if (labNotes) {
      lines.push("");
      lines.push(`Notes: ${labNotes}`);
    }
  }
  lines.push("");

  // PLAN
  lines.push("PLAN");
  lines.push("");
  const followUp = new Date(encounterDateObj);
  followUp.setDate(encounterDateObj.getDate() + 30);
  lines.push(`Follow-up appointment scheduled for ${formatDateDMY(followUp)}.`);
  lines.push("Assess response, tolerance, and compliance at follow-up.");
  if (peptides.length > 0) {
    lines.push("Consider dose titration if treatment is well tolerated.");
    lines.push("Continue monitoring symptoms, injection-site reactions, and any medication-related side effects.");
  }
  lines.push("Reinforce lifestyle modifications, nutrition, hydration, sleep, and physical activity.");
  lines.push("");
  lines.push("Physician:");
  lines.push("Dr Sami M. Yesuf");
  lines.push("DarDoc Healthcare");

  return lines.join("\n");
}

