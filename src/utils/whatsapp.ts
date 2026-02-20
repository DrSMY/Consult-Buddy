/**
 * Sanitize a phone number for use in wa.me links.
 * Strips spaces, dashes, parentheses, and ensures no leading "00".
 * If no "+" prefix, assumes it's already in international format.
 */
export function sanitizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  // Replace leading 00 with +
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
  // Remove leading + for wa.me (it just needs digits)
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  return cleaned;
}

/**
 * Open a wa.me deep link with the given phone number and message text.
 */
export function openWhatsApp(phone: string, message: string) {
  const sanitized = sanitizePhone(phone);
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${sanitized}?text=${encoded}`, "_blank");
}
