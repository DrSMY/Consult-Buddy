// GLP-1 Weight Loss Program Configuration
// Extracted from DocSlim components

export enum Gender {
  Male = "Male",
  Female = "Female",
  Other = "Other",
}

export enum ActivityLevel {
  Sedentary = "Sedentary",
  LightlyActive = "Lightly Active",
  ModeratelyActive = "Moderately Active",
  VeryActive = "Very Active",
}

export type MedicationType = "Mounjaro" | "Wegovy" | "Ozempic" | "Rybelsus" | "Other";

export const MOUNJARO_DOSES = ["2.5mg", "5mg", "7.5mg", "10mg", "12.5mg", "15mg"];
export const WEGOVY_DOSES = ["0.25mg", "0.5mg", "1mg", "1.7mg", "2.4mg"];
export const OZEMPIC_DOSES = ["0.25mg", "0.5mg", "1mg", "2mg"];
export const RYBELSUS_DOSES = ["3mg", "7mg", "14mg"];

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  [ActivityLevel.Sedentary]: 1.2,
  [ActivityLevel.LightlyActive]: 1.375,
  [ActivityLevel.ModeratelyActive]: 1.55,
  [ActivityLevel.VeryActive]: 1.725,
};

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  [ActivityLevel.Sedentary]: "Little or no exercise, desk job",
  [ActivityLevel.LightlyActive]: "Light exercise or sports 1-3 days/week",
  [ActivityLevel.ModeratelyActive]: "Moderate exercise or sports 3-5 days/week",
  [ActivityLevel.VeryActive]: "Hard exercise or sports 6-7 days/week",
};

export interface GLP1Patient {
  name: string;
  mobileNumber: string;
  bookingId: string;
  bookingTime: string;
  age: number | "";
  gender: Gender;
  height: number | "";
  weight: number | "";
  bmi: number | null;
  bmr: number | null;
  dailyCalories: number | null;
  weightLossCalories: number | null;
  activityLevel: ActivityLevel;
  chronicIllnesses: string;
  medications: string;
  allergies: string;
  allergyNotes: string;
  isPregnant: boolean;
  isBreastfeeding: boolean;
  previousGlp1Use: boolean;
  previousMedication: MedicationType | "";
  previousDose: string;
}

export type BloodTestLevel = "none" | "recommended" | "required";

export interface TreatmentPlan {
  medication: MedicationType | "";
  dose: string;
  otherDetail: string;
  bloodTestLevel: BloodTestLevel;
  notes: string;
  doctorSuggestions: string;
  patientGuide: string;
}

export const createEmptyPatient = (): GLP1Patient => ({
  name: "",
  mobileNumber: "",
  bookingId: "",
  bookingTime: "",
  age: "",
  gender: Gender.Male,
  height: "",
  weight: "",
  bmi: null,
  bmr: null,
  dailyCalories: null,
  weightLossCalories: null,
  activityLevel: ActivityLevel.Sedentary,
  chronicIllnesses: "",
  medications: "",
  allergies: "",
  allergyNotes: "",
  isPregnant: false,
  isBreastfeeding: false,
  previousGlp1Use: false,
  previousMedication: "",
  previousDose: "",
});

export interface FollowupData {
  previousMedication: MedicationType | "";
  previousDose: string;
  nextDose: string;
  sideEffects: string;
  weightLost: number | "";
  currentWeight: number | "";
  notes: string;
}

export const createEmptyFollowup = (): FollowupData => ({
  previousMedication: "",
  previousDose: "",
  nextDose: "",
  sideEffects: "",
  weightLost: "",
  currentWeight: "",
  notes: "",
});

export const createEmptyTreatment = (): TreatmentPlan => ({
  medication: "",
  dose: "",
  otherDetail: "",
  bloodTestLevel: "none",
  notes: "He needs monthly followup and weight loss program blood test.",
  doctorSuggestions: "",
  patientGuide: "",
});

export function getDoseOptions(med: MedicationType): string[] {
  switch (med) {
    case "Mounjaro": return MOUNJARO_DOSES;
    case "Wegovy": return WEGOVY_DOSES;
    case "Ozempic": return OZEMPIC_DOSES;
    case "Rybelsus": return RYBELSUS_DOSES;
    default: return [];
  }
}

export function calculateBMI(heightCm: number, weightKg: number): number {
  const hM = heightCm / 100;
  return weightKg / (hM * hM);
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obesity Class I";
  if (bmi < 40) return "Obesity Class II";
  return "Obesity Class III";
}

export function getBMIColorClass(bmi: number | null): string {
  if (!bmi) return "bg-muted text-muted-foreground";
  if (bmi < 18.5) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (bmi < 25) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (bmi < 30) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  // Mifflin-St Jeor formula
  if (gender === Gender.Male) {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function generateClinicalSuggestion(
  patient: GLP1Patient,
  treatment: TreatmentPlan,
  followupData?: FollowupData
): string {
  if (!treatment.medication || !patient.name) return "";

  const medName =
    treatment.medication === "Other"
      ? treatment.otherDetail || "Medication"
      : treatment.medication;

  const doseText = treatment.dose ? ` ${treatment.dose}` : "";
  let salutation = "Mr";

  if (patient.gender === Gender.Male) {
    salutation = "Mr";
  } else if (patient.gender === Gender.Female) {
    salutation = "Ms";
  }

  // Follow-up format
  if (followupData) {
    const weightLostText = followupData.weightLost
      ? `lost ${followupData.weightLost} kg on ${followupData.previousDose || "previous dose"}`
      : `on ${followupData.previousDose || "previous dose"}`;
    const sideEffectsText = followupData.sideEffects?.trim() || "No side effects";
    const notesText = followupData.notes?.trim() || treatment.notes?.trim() || "";

    return `Refill : booking ID ${patient.bookingId || "N/A"} , ${salutation} ${patient.name} (${patient.mobileNumber || "No phone"}) \nprescribed ${medName}${doseText} , ${weightLostText} , ${sideEffectsText}${notesText ? `, ${notesText}` : ""}`.trim();
  }

  // New patient format
  let pronoun = "the patient";
  if (patient.gender === Gender.Male) pronoun = "He";
  else if (patient.gender === Gender.Female) pronoun = "She";

  const bmiVal = patient.bmi || 0;
  const bmiCat = getBMICategory(bmiVal);

  let historyText = "with no previous history of use of GLP1 meds";
  if (patient.previousGlp1Use) {
    const prevMed = patient.previousMedication ? ` of ${patient.previousMedication}` : "";
    const prevDose = patient.previousDose ? ` at ${patient.previousDose}` : "";
    historyText = `with previous history of use of GLP1 meds${prevMed}${prevDose}`;
  }

  const conditions = patient.chronicIllnesses
    ? `, with ${patient.chronicIllnesses}`
    : ", with no known chronic illnesses";

  const weight = typeof patient.weight === "number" ? patient.weight : 0;
  const proteinMin = Math.round(weight * 1.2);
  const proteinMax = Math.round(weight * 1.5);
  const weightLossCals = patient.weightLossCalories ? Math.round(patient.weightLossCalories) : "---";

  const bloodTestSuffix = treatment.bloodTestLevel === "required"
    ? "\n- Weight Loss Blood Test REQUIRED: https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test"
    : treatment.bloodTestLevel === "recommended"
    ? "\n- Weight Loss Blood Test RECOMMENDED: https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test"
    : "";

  return `booking ID ${patient.bookingId || "N/A"} , ${salutation} ${patient.name} (${patient.mobileNumber || "No phone"}) \nprescribed ${medName}${doseText} \n${pronoun} is ${bmiCat} ${historyText}${conditions}, ${pronoun.toLowerCase()} has no contraindications to GLP 1, ${pronoun.toLowerCase()} is advised to take ${proteinMin} grams to ${proteinMax} grams of protein, with Weight Loss Target ${weightLossCals} kcal/day. ${treatment.notes || ""}${bloodTestSuffix}`.trim();
}
