import { supabase } from "@/integrations/supabase/client";
import { buildGuideHtml } from "./printGuide";
import { sanitizePhone } from "./whatsapp";

/**
 * Generate the patient guide HTML, upload it to storage,
 * and open WhatsApp with the public link.
 */
export async function shareGuideViaWhatsApp(
  guideText: string,
  patientName: string,
  phone: string,
): Promise<void> {
  const html = buildGuideHtml(guideText, patientName);
  const blob = new Blob([html], { type: "text/html" });

  // Unique filename per patient + timestamp
  const safeName = patientName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const fileName = `${safeName}_${Date.now()}.html`;

  const { error } = await supabase.storage
    .from("patient-guides")
    .upload(fileName, blob, {
      contentType: "text/html",
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from("patient-guides")
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;
  const sanitized = sanitizePhone(phone);
  const message = `Hello ${patientName},\n\nPlease find your Patient Care Guide here:\n${publicUrl}\n\nYou can save it as a PDF by opening the link and using Print → Save as PDF.\n\nBest regards,\nDarDoc Team`;
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${sanitized}?text=${encoded}`, "_blank");
}
