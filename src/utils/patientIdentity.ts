// Cross-program patient identity helpers.
// We don't have a patients table — patients are derived from consultations
// grouped by normalized mobile number.

export type ConsultationLike = {
  id: string;
  patient_name: string | null;
  program: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
  intake_answers: any;
  doctor_notes?: string | null;
  ai_recommendations?: any;
};

/** Last 10 digits of any phone-shaped string. Empty if fewer than 7 digits. */
export function normalizeMobile(raw: unknown): string {
  if (raw == null) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 7) return "";
  return digits.slice(-10);
}

/** Pull mobile number out of either intake shape (peptides or weight-loss). */
export function getConsultationMobile(c: ConsultationLike): string {
  const intake = (c.intake_answers || {}) as any;
  return normalizeMobile(
    intake.mobile_number ??
      intake.mobileNumber ??
      intake.patient?.mobileNumber ??
      intake.patient?.mobile_number ??
      ""
  );
}

/** Display-friendly name from a consultation row. */
export function getConsultationDisplayName(c: ConsultationLike): string {
  const intake = (c.intake_answers || {}) as any;
  return (c.patient_name || intake.patient?.name || intake.name || "Unnamed").trim();
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Cheap Dice-coefficient-ish similarity on bigrams. 0..1. */
export function nameSimilarity(a: string, b: string): number {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.9;
  const bigrams = (s: string) => {
    const out = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
    return out;
  };
  const A = bigrams(x);
  const B = bigrams(y);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((g) => B.has(g) && inter++);
  return (2 * inter) / (A.size + B.size);
}

export type PatientGroup = {
  /** Normalized mobile (10 digits) used as the patient key. */
  mobileKey: string;
  /** Most recent name we saw for this patient. */
  displayName: string;
  /** Most recent mobile string as entered (pretty-printable). */
  mobileDisplay: string;
  /** Distinct programs this patient has used. */
  programs: string[];
  /** All consultations belonging to this patient, newest first. */
  consultations: ConsultationLike[];
  lastVisit: string;
};

/** Group consultations by normalized mobile. Rows without a usable mobile are skipped. */
export function groupConsultationsByPatient(rows: ConsultationLike[]): PatientGroup[] {
  const map = new Map<string, PatientGroup>();
  for (const c of rows) {
    const key = getConsultationMobile(c);
    if (!key) continue;
    const intake = (c.intake_answers || {}) as any;
    const mobileDisplay = String(
      intake.mobile_number ?? intake.mobileNumber ?? intake.patient?.mobileNumber ?? ""
    );
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        mobileKey: key,
        displayName: getConsultationDisplayName(c),
        mobileDisplay,
        programs: [c.program],
        consultations: [c],
        lastVisit: c.created_at,
      });
    } else {
      existing.consultations.push(c);
      if (!existing.programs.includes(c.program)) existing.programs.push(c.program);
      // Newest row defines the display name + visible mobile.
      if (new Date(c.created_at) > new Date(existing.lastVisit)) {
        existing.lastVisit = c.created_at;
        existing.displayName = getConsultationDisplayName(c);
        if (mobileDisplay) existing.mobileDisplay = mobileDisplay;
      }
    }
  }
  // Sort each group's consultations newest-first and the groups by latest visit.
  const groups = Array.from(map.values());
  for (const g of groups) {
    g.consultations.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
  groups.sort((a, b) => +new Date(b.lastVisit) - +new Date(a.lastVisit));
  return groups;
}

export function findPatientByMobile(
  rows: ConsultationLike[] | PatientGroup[],
  mobile: string
): PatientGroup | null {
  const key = normalizeMobile(mobile);
  if (!key) return null;
  const groups = Array.isArray(rows) && rows.length && (rows[0] as any).mobileKey
    ? (rows as PatientGroup[])
    : groupConsultationsByPatient(rows as ConsultationLike[]);
  return groups.find((g) => g.mobileKey === key) || null;
}

/**
 * Build a "demographics + medical history" prefill payload from the most
 * recent consultation in either program. Treatment plans are intentionally
 * excluded — every new encounter starts fresh.
 */
export type DemographicsPrefill = {
  name: string;
  mobile: string;
  bookingRef: string;
  age: string | number;
  gender: string;
  height: string | number;
  weight: string | number;
  chronicIllnesses: string | string[];
  allergies: string | string[];
  medications: string;
  allergyNotes: string;
  source: { id: string; program: string; date: string };
};

export function buildDemographicsPrefill(group: PatientGroup): DemographicsPrefill | null {
  const latest = group.consultations[0];
  if (!latest) return null;
  const intake = (latest.intake_answers || {}) as any;
  // Weight-loss shape uses intake.patient.*; peptides shape is flat.
  const wl = intake.patient || {};
  const flat = intake;

  const pick = (a: any, b: any) => (a ?? "") !== "" ? a : (b ?? "");

  return {
    name: latest.patient_name || wl.name || "",
    mobile: pick(flat.mobile_number, wl.mobileNumber) || "",
    bookingRef: pick(flat.booking_ref ?? flat.bookingId, wl.bookingId) || "",
    age: pick(flat.age, wl.age) || "",
    gender: pick(flat.gender, wl.gender) || "",
    height: pick(flat.height, wl.height) || "",
    weight: pick(flat.weight, wl.weight) || "",
    chronicIllnesses: pick(flat.health_conditions, wl.chronicIllnesses) || "",
    allergies: pick(flat.allergies, wl.allergies) || "",
    medications: pick(flat.current_medications ?? flat.medications, wl.medications) || "",
    allergyNotes: pick(flat.allergies_notes, wl.allergyNotes) || "",
    source: { id: latest.id, program: latest.program, date: latest.created_at },
  };
}

export function programLabel(program: string): string {
  if (program === "weight-loss") return "Weight Loss";
  if (program === "peptides") return "Peptides";
  return program;
}
