import type { PatientGuideData, GuideMedication, GuideSideEffect, GuideRedFlag, GuideLabTest } from "@/utils/guideHtml";
import type { GLP1Patient, TreatmentPlan } from "@/data/glp1Config";

/**
 * Build PatientGuideData from weight-loss (GLP-1) flow data.
 */
export function buildGLP1GuideData(patient: GLP1Patient, treatment: TreatmentPlan): PatientGuideData {
  const medName = treatment.medication === "Other"
    ? treatment.otherDetail || "Medication"
    : treatment.medication || "";

  const medications: GuideMedication[] = [];
  if (medName) {
    const isInjectable = ["Mounjaro", "Wegovy", "Ozempic"].includes(treatment.medication as string);
    const isOral = treatment.medication === "Rybelsus";
    medications.push({
      name: medName,
      dose: treatment.dose || undefined,
      administration: isInjectable
        ? "Weekly subcutaneous injection — rotate injection sites (thigh, abdomen, upper arm)"
        : isOral
        ? "Daily oral tablet — take on empty stomach with ≤4oz water, 30 min before food"
        : undefined,
      storageNote: isInjectable ? "Refrigerate at 2-8°C. Do not freeze." : isOral ? "Room temperature." : undefined,
    });
  }

  const weight = typeof patient.weight === "number" ? patient.weight : 0;
  const proteinMin = weight ? Math.round(weight * 1.2) : undefined;
  const proteinMax = weight ? Math.round(weight * 1.5) : undefined;
  const calorieTarget = patient.weightLossCalories ? Math.round(patient.weightLossCalories) : undefined;

  const sideEffects: GuideSideEffect[] = [
    { effect: "Nausea", management: "Usually improves in 2-4 weeks. Eat smaller, more frequent meals." },
    { effect: "Constipation", management: "Increase fiber and water intake." },
    { effect: "Decreased appetite", management: "Expected effect — ensure adequate protein intake." },
    { effect: "Injection site reactions", management: "Mild redness/swelling is normal and temporary." },
  ];

  const redFlags: GuideRedFlag[] = [
    { symptom: "Severe or persistent vomiting" },
    { symptom: "Severe abdominal pain (possible pancreatitis)" },
    { symptom: "Signs of allergic reaction (swelling, difficulty breathing)" },
    { symptom: "Symptoms of thyroid tumors (lump in neck, hoarseness, difficulty swallowing)" },
  ];

  const labTests: GuideLabTest[] = [];
  if (treatment.bloodTestLevel !== "none") {
    labTests.push({
      name: "Weight Loss Blood Test Panel",
      tier: treatment.bloodTestLevel === "required" ? "required" : "recommended",
      link: "https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test",
    });
  }

  return {
    patient: {
      name: patient.name,
      gender: patient.gender,
      age: typeof patient.age === "number" ? patient.age : undefined,
      height: typeof patient.height === "number" ? patient.height : undefined,
      weight: weight || undefined,
      bmi: patient.bmi,
      mobileNumber: patient.mobileNumber,
      activityLevel: patient.activityLevel,
      chronicIllnesses: patient.chronicIllnesses,
    },
    medications,
    nutrition: proteinMin ? {
      proteinMin,
      proteinMax,
      calorieTarget,
      macroBreakdown: "40-50% protein, 40-50% fiber-rich carbs, <20% fats",
      hydration: "Minimum 2L water/day",
    } : undefined,
    sideEffects,
    redFlags,
    labTests: labTests.length > 0 ? labTests : undefined,
    followUp: {
      schedule: "Monthly follow-up to assess weight, side effects, and dose titration",
      notes: patient.previousGlp1Use
        ? `Previous GLP-1 history: ${patient.previousMedication} ${patient.previousDose}`
        : "First-time GLP-1 user — started at lowest dose",
    },
    aiGeneratedText: treatment.patientGuide || undefined,
  };
}

/**
 * Build PatientGuideData from peptide consultation flow data.
 */
export function buildPeptideGuideData(opts: {
  patientName: string;
  intake: Record<string, any>;
  selectedPeptides: Array<{ name: string; dosage: string; administration: string; duration: string }>;
  selectedSupplements: Array<{ name: string; dosage: string; reason: string }>;
  labTests: string[];
  labTier: string;
}): PatientGuideData {
  const { patientName, intake, selectedPeptides, selectedSupplements, labTests, labTier } = opts;

  const medications: GuideMedication[] = selectedPeptides.map(p => ({
    name: p.name,
    dose: p.dosage,
    administration: p.administration,
    duration: p.duration,
  }));

  const supplements = selectedSupplements.map(s => ({
    name: s.name,
    dosage: s.dosage,
    reason: s.reason,
  }));

  const labTestItems: GuideLabTest[] = labTests.map(t => ({
    name: t,
    tier: "required" as const,
  }));

  const heightVal = intake.height ? Number(intake.height) : undefined;
  const weightVal = intake.weight ? Number(intake.weight) : undefined;
  const bmi = heightVal && weightVal ? Number((weightVal / ((heightVal / 100) ** 2)).toFixed(1)) : null;

  return {
    patient: {
      name: patientName,
      gender: intake.gender,
      age: intake.age ? Number(intake.age) : undefined,
      height: heightVal,
      weight: weightVal,
      bmi,
      mobileNumber: intake.mobile_number || intake.phone,
    },
    medications,
    supplements: supplements.length > 0 ? supplements : undefined,
    labTests: labTestItems.length > 0 ? labTestItems : undefined,
    followUp: {
      schedule: "Schedule follow-up appointment as per treatment duration",
      notes: "Monitor for side effects and report immediately",
    },
  };
}
