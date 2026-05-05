// CSV Export utility for weight-loss consultation data
import { buildEmrOutput } from "@/utils/emrOutput";

interface WeightLossConsultationRow {
  patient_name: string;
  created_at: string;
  intake_answers: any;
  ai_recommendations: any;
  status: string;
  doctor_notes: string | null;
}

export function exportWeightLossCSV(consultations: WeightLossConsultationRow[]) {
  if (consultations.length === 0) return;

  const headers = [
    "Booking ID",
    "Booking Time",
    "Name",
    "Mobile Number",
    "Date Added",
    "Age",
    "Gender",
    "Height (cm)",
    "Weight (kg)",
    "BMI",
    "BMR (kcal)",
    "Maintenance Calories",
    "Weight Loss Calories",
    "Treatment Notes",
    "Blood Test Required",
    "Medication Prescribed",
    
    "Doctor Note and Suggestions",
    "Patient Guide",
    "Follow-up Date",
    "EMR Output",
  ];

  const rows = consultations.map((c) => {
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

    return [
      esc(patient.bookingId || ""),
      esc(patient.bookingTime || ""),
      esc(patient.name || c.patient_name || ""),
      esc(patient.mobileNumber || ""),
      esc(encounterDate.toLocaleDateString()),
      patient.age || "",
      patient.gender || "",
      patient.height || "",
      patient.weight || "",
      patient.bmi ? Number(patient.bmi).toFixed(1) : "",
      patient.bmr ? Math.round(patient.bmr) : "",
      patient.dailyCalories ? Math.round(patient.dailyCalories) : "",
      patient.weightLossCalories ? Math.round(patient.weightLossCalories) : "",
      esc(treatment.notes || ""),
      treatment.bloodTestRequired ? "YES" : "NO",
      esc(prescribedMedication),
      esc(recs.doctorSuggestions || ""),
      esc(treatment.doctorSuggestions || recs.doctorSuggestions || ""),
      esc(recs.patientGuide || treatment.patientGuide || ""),
      esc(followUpDate.toLocaleDateString()),
      esc(emr),
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const dateStr = new Date().toISOString().split("T")[0];
  link.setAttribute("download", `WeightLoss_Report_${dateStr}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function esc(val: string): string {
  return `"${String(val).replace(/"/g, '""')}"`;
}
