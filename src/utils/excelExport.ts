import * as XLSX from "xlsx";
import { buildEmrOutput } from "@/utils/emrOutput";

interface ConsultationRow {
  id: string;
  patient_name: string;
  program: string;
  status: string;
  created_at: string;
  updated_at: string;
  ai_recommendations: any;
  doctor_notes: string | null;
  next_steps: string | null;
  patient_guidelines: string | null;
  intake_answers: any;
}

export function exportWeightLossExcel(consultations: ConsultationRow[]) {
  const wlRows = consultations.filter((c) => c.program === "weight-loss");
  if (wlRows.length === 0) return 0;

  const rows = wlRows.map((c) => {
    const patient = c.intake_answers?.patient || {};
    const treatment = c.intake_answers?.treatment || {};
    const recs = c.ai_recommendations || {};

    const medName =
      treatment.medication === "Other"
        ? treatment.otherDetail || "Other"
        : treatment.medication || "Pending";
    const dose = treatment.dose || "";
    const prescribedMedication = dose ? `${medName} ${dose}` : medName;

    const encounterDate = new Date(c.created_at);
    const followUpDate = new Date(encounterDate);
    followUpDate.setDate(encounterDate.getDate() + 21);

    const emr = buildEmrOutput({
      patient,
      treatment,
      recs,
      doctorNotes: c.doctor_notes,
      createdAt: c.created_at,
    });

    return {
      "Booking ID": patient.bookingId || "",
      "Booking Time": patient.bookingTime || "",
      "Patient Name": patient.name || c.patient_name || "",
      "Mobile Number": patient.mobileNumber || "",
      "Date Added": encounterDate.toLocaleDateString(),
      Status: c.status,
      Age: patient.age || "",
      Gender: patient.gender || "",
      "Height (cm)": patient.height || "",
      "Weight (kg)": patient.weight || "",
      BMI: patient.bmi ? Number(patient.bmi).toFixed(1) : "",
      "BMI Category": patient.bmi ? getBMICat(Number(patient.bmi)) : "",
      "BMR (kcal)": patient.bmr ? Math.round(patient.bmr) : "",
      "Maintenance Calories": patient.dailyCalories ? Math.round(patient.dailyCalories) : "",
      "Weight Loss Calories": patient.weightLossCalories ? Math.round(patient.weightLossCalories) : "",
      "Chronic Illnesses": patient.chronicIllnesses || "",
      "Current Medications": patient.medications || "",
      Allergies: patient.allergies || "",
      "Allergy Notes": patient.allergyNotes || "",
      "Medication Prescribed": prescribedMedication,
      "Blood Test Level": treatment.bloodTestLevel || recs.bloodTestLevel || "none",
      "Treatment Notes": treatment.notes || "",
      "Doctor Notes": c.doctor_notes || "",
      "Patient Guide": recs.patientGuide || treatment.patientGuide || "",
      "Follow-up Date": followUpDate.toLocaleDateString(),
      "EMR Output": emr,
    };
  });

  writeExcel(rows, "Weight Loss Report", `WeightLoss_Report_${dateStr()}.xlsx`);
  return rows.length;
}

export function exportPeptideExcel(consultations: ConsultationRow[]) {
  const pepRows = consultations.filter((c) => c.program === "peptides");
  if (pepRows.length === 0) return 0;

  const rows = pepRows.map((c) => {
    const intake = c.intake_answers || {};
    const recs = c.ai_recommendations as any;

    const peptides = recs?.recommended_peptides || [];
    const peptideNames = peptides.map((p: any) => p.name).join(", ");
    const peptideDosages = peptides.map((p: any) => `${p.name}: ${p.dosage || "N/A"}`).join("; ");
    const peptideDurations = peptides.map((p: any) => `${p.name}: ${p.duration || "N/A"}`).join("; ");
    const supplements = recs?.recommended_supplements?.map((s: any) => `${s.name} (${s.dosage})`).join(", ") || "";
    const labTests = recs?.required_blood_tests?.join(", ") || "";
    const recLabTests = recs?.recommended_blood_tests?.join(", ") || "";
    const safetyFlags = recs?.safety_flags?.map((f: any) => `[${f.severity}] ${f.concern}`).join("; ") || "";

    const healthGoals = Array.isArray(intake.health_goals) ? intake.health_goals.join(", ") : intake.health_goals || "";

    return {
      "Patient Name": intake.name || c.patient_name || "",
      "Mobile Number": intake.mobileNumber || "",
      "Date Created": new Date(c.created_at).toLocaleDateString(),
      Status: c.status,
      Age: intake.age || "",
      Gender: intake.gender || "",
      "Height (cm)": intake.height || "",
      "Weight (kg)": intake.weight || "",
      "Body Shape": intake.body_shape || "",
      "Activity Level": intake.activity_level || "",
      "Health Goals": healthGoals,
      "Health Conditions": Array.isArray(intake.health_conditions) ? intake.health_conditions.join(", ") : intake.health_conditions || "",
      Allergies: Array.isArray(intake.allergies) ? intake.allergies.join(", ") : intake.allergies || "",
      "Pregnant": intake.is_pregnant || "",
      "Breastfeeding": intake.is_breastfeeding || "",
      "Prescribed Peptides": peptideNames,
      "Peptide Dosages": peptideDosages,
      "Peptide Durations": peptideDurations,
      Supplements: supplements,
      "Required Lab Tests": labTests,
      "Recommended Lab Tests": recLabTests,
      "Safety Flags": safetyFlags,
      "Clinical Summary": recs?.clinical_summary || "",
      "Doctor Notes": c.doctor_notes || recs?.doctor_note || "",
      "Next Steps": c.next_steps || recs?.next_steps || "",
      "Patient Guidelines": c.patient_guidelines || recs?.patient_guidelines || "",
    };
  });

  writeExcel(rows, "Peptide Report", `Peptide_Report_${dateStr()}.xlsx`);
  return rows.length;
}

function writeExcel(rows: Record<string, any>[], sheetName: string, fileName: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key] || "").substring(0, 80).length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

function dateStr() {
  return new Date().toISOString().split("T")[0];
}

function getBMICat(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obese I";
  if (bmi < 40) return "Obese II";
  return "Obese III";
}
