import { supabase } from "@/integrations/supabase/client";

export interface DraftSavePayload {
  draftId: string | null;
  userId: string;
  program: "peptides" | "weight-loss" | string;
  patientName: string;
  intakeAnswers: Record<string, any>;
}

/**
 * Inserts or updates a consultation row with status="incomplete".
 * Caller decides when to invoke (typically after name + mobile are present).
 * Returns the draft id (newly created or unchanged).
 */
export async function saveDraftConsultation({
  draftId,
  userId,
  program,
  patientName,
  intakeAnswers,
}: DraftSavePayload): Promise<string | null> {
  if (draftId) {
    const { error } = await supabase
      .from("consultations")
      .update({
        patient_name: patientName,
        intake_answers: intakeAnswers as any,
      })
      .eq("id", draftId);
    if (error) {
      console.error("[draft] update failed", error);
      return draftId;
    }
    return draftId;
  }

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      user_id: userId,
      patient_name: patientName,
      program,
      intake_answers: intakeAnswers as any,
      status: "incomplete",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[draft] insert failed", error);
    return null;
  }
  return data?.id ?? null;
}

export async function loadDraftConsultation(id: string) {
  const { data, error } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[draft] load failed", error);
    return null;
  }
  return data;
}

export async function deleteDraftConsultation(id: string) {
  const { error } = await supabase.from("consultations").delete().eq("id", id);
  if (error) console.error("[draft] delete failed", error);
}

/** Extract a normalized mobile number from a consultation row regardless of program. */
export function getConsultationMobile(c: any): string {
  const intake = c?.intake_answers || {};
  return (
    intake.mobile_number ||
    intake.mobileNumber ||
    intake?.patient?.mobileNumber ||
    intake?.patient?.mobile_number ||
    ""
  );
}

/** Whether a draft has the minimum identity (name + mobile) we use to “register” a patient. */
export function hasMinimumIdentity(name: string, mobile: string) {
  return Boolean(name?.trim() && mobile?.trim());
}
