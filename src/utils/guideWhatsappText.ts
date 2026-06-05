import { openWhatsApp } from "./whatsapp";

/**
 * Convert a patient guide (with ::: TITLE ::: or --- TITLE --- delimiters)
 * into WhatsApp-friendly text where section headers are wrapped in *bold*.
 */
export function formatGuideForWhatsApp(text: string): string {
  if (!text) return "";
  return text
    // ::: TITLE ::: -> *TITLE*
    .replace(/^:{2,}\s*(.+?)\s*:{2,}\s*$/gm, "*$1*")
    // --- TITLE --- -> *TITLE*
    .replace(/^-{3,}\s*(.+?)\s*-{3,}\s*$/gm, "*$1*")
    // Collapse 3+ blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Open WhatsApp with the formatted guide text prefilled.
 */
export function sendGuideAsWhatsappText(phone: string, guideText: string, patientName?: string) {
  const header = patientName ? `Hi ${patientName.split(" ")[0]}, here is your personalised guide:\n\n` : "";
  const body = formatGuideForWhatsApp(guideText);
  const signature = "\n\n— DarDoc Healthcare";
  openWhatsApp(phone, header + body + signature);
}
