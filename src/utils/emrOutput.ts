// Build a structured EMR-style summary from weight-loss consultation data

interface EmrInput {
  patient: any;
  treatment: any;
  recs: any;
  doctorNotes: string | null;
  createdAt: string;
}

export function buildEmrOutput(input: EmrInput): string {
  const { patient, treatment, recs, doctorNotes, createdAt } = input;
  const lines: string[] = [];

  const encounterDate = new Date(createdAt).toLocaleDateString();
  lines.push(`=== EMR CLINICAL SUMMARY ===`);
  lines.push(`Date of Encounter: ${encounterDate}`);
  lines.push("");

  // Patient demographics
  lines.push("— PATIENT —");
  if (patient?.name) lines.push(`Name: ${patient.name}`);
  if (patient?.age) lines.push(`Age: ${patient.age}`);
  if (patient?.gender) lines.push(`Gender: ${patient.gender}`);
  if (patient?.height) lines.push(`Height: ${patient.height} cm`);
  if (patient?.weight) lines.push(`Weight: ${patient.weight} kg`);
  if (patient?.bmi) lines.push(`BMI: ${Number(patient.bmi).toFixed(1)}`);
  if (patient?.chronicIllnesses) lines.push(`Chronic Illnesses: ${patient.chronicIllnesses}`);
  if (patient?.medications) lines.push(`Current Medications: ${patient.medications}`);
  if (patient?.allergies) lines.push(`Allergies: ${patient.allergies}`);
  lines.push("");

  // Medication prescribed
  lines.push("— MEDICATION PRESCRIBED —");
  const medName = treatment?.medication === "Other"
    ? (treatment?.otherDetail || "Other")
    : (treatment?.medication || "None");
  const dose = treatment?.dose || "";
  lines.push(`Medication: ${medName}${dose ? ` ${dose}` : ""}`);
  if (treatment?.notes) lines.push(`Treatment Notes: ${treatment.notes}`);
  lines.push("");

  // Lab tests
  lines.push("— LAB TESTS —");
  const bloodLevel = recs?.bloodTestLevel || treatment?.bloodTestLevel || "none";
  if (bloodLevel === "required") {
    lines.push("Blood Test: REQUIRED");
  } else if (bloodLevel === "recommended") {
    lines.push("Blood Test: RECOMMENDED");
  } else {
    lines.push("Blood Test: Not required at this time");
  }
  lines.push("");

  // Clinical summary
  lines.push("— CLINICAL SUMMARY —");
  lines.push(recs?.doctorSuggestions || treatment?.doctorSuggestions || "No clinical summary available.");
  lines.push("");

  // Doctor notes
  if (doctorNotes) {
    lines.push("— DOCTOR NOTES —");
    lines.push(doctorNotes);
    lines.push("");
  }

  // Plan ahead
  lines.push("— PLAN —");
  const encounterDateObj = new Date(createdAt);
  const followUp = new Date(encounterDateObj);
  followUp.setDate(encounterDateObj.getDate() + 21);
  lines.push(`Follow-up Date: ${followUp.toLocaleDateString()}`);
  if (treatment?.medication && ["Mounjaro", "Wegovy", "Ozempic", "Rybelsus"].includes(treatment.medication)) {
    lines.push("Titrate dose at next visit if tolerated well.");
  }
  lines.push("Monitor weight, side effects, and compliance.");
  lines.push("");
  lines.push("Physician: Dr Sami M. Yesuf");

  return lines.join("\n");
}
