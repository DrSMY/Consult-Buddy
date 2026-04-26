import { supabase } from "@/integrations/supabase/client";
import { buildGuideHtml, type BuildGuideOptions } from "./printGuide";
import { buildGuidePdfBlob } from "./pdfGuide";
import { buildLandingHtml } from "./landingPage";
import { sanitizePhone } from "./whatsapp";
import logoSrc from "@/assets/dr-sami-logo.png";
import signatureSrc from "@/assets/dr-sami-signature.png";
import type { WeightLossPatientSummary } from "./weightLossGuideHtml";

type Program = "peptides" | "weight_loss";

const PROGRAM_LABELS: Record<Program, string> = {
  peptides: "Peptide Therapy",
  weight_loss: "Weight Loss Program",
};

const BUCKET = "patient-guides";

/**
 * Convert an imported asset URL (Vite serves these from the same origin)
 * into a publicly hosted Supabase URL so the patient's browser can load
 * the logo/signature without needing the app to be running.
 */
async function uploadAssetIfNeeded(localUrl: string, storagePath: string): Promise<string> {
  // If the asset has already been uploaded once, the public URL is stable
  const { data: existing } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  // Try to HEAD; if missing, upload
  try {
    const head = await fetch(existing.publicUrl, { method: "HEAD" });
    if (head.ok) return existing.publicUrl;
  } catch {
    /* fall through to upload */
  }
  const res = await fetch(localUrl);
  const blob = await res.blob();
  await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    contentType: blob.type || "image/png",
    upsert: true,
  });
  return existing.publicUrl;
}

/**
 * Public-facing base URL for patient links. The app is hosted at multiple
 * origins (lovable.app preview, peptidedoc.live, etc.). Preview origins
 * (`id-preview--*.lovable.app`) require a Lovable login and CANNOT be opened
 * by patients — so we always rewrite those to the published domain.
 */
function getPublicAppOrigin(): string {
  return "https://peptidedoc.live";
}


/**
 * Public Edge Function URL that re-serves a stored guide file with the
 * correct Content-Type so patients see a fully rendered branded page
 * instead of raw HTML source. The raw Supabase Storage URL serves files
 * as text/plain with a hard CSP, which breaks the experience.
 */
function buildServeGuideUrl(fileName: string): string {
  const projectRef = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string) || "kokottennducgqcearxu";
  return `https://${projectRef}.supabase.co/functions/v1/serve-guide?file=${encodeURIComponent(fileName)}&raw=1`;
}

function buildAppSharedGuideUrl(params: {
  patientName: string;
  program: Program;
  htmlUrl: string;
  pdfUrl: string;
  view?: "landing" | "guide";
}) {
  const url = new URL("/shared-guide", getPublicAppOrigin());
  url.searchParams.set("name", params.patientName);
  url.searchParams.set("program", params.program);
  url.searchParams.set("html", params.htmlUrl);
  url.searchParams.set("pdf", params.pdfUrl);
  if (params.view) url.searchParams.set("view", params.view);
  return url.toString();
}

async function uploadHtml(content: string, fileName: string): Promise<string> {
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, blob, {
    contentType: "text/html;charset=utf-8",
    upsert: false,
  });
  if (error) throw new Error(`HTML upload failed: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(fileName).data.publicUrl;
}

async function uploadPdf(blob: Blob, fileName: string): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, blob, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw new Error(`PDF upload failed: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(fileName).data.publicUrl;
}

export interface ShareResult {
  htmlUrl: string;
  pdfUrl: string;
  landingUrl: string;
  whatsappUrl: string;
}

/**
 * Generate styled HTML guide + branded PDF, upload both plus a landing page,
 * then open WhatsApp with a short message linking to the landing page.
 */
export async function generateAndShareGuide(
  guideText: string,
  patientName: string,
  phone: string,
  program: Program = "peptides",
  options: { autoOpenWhatsApp?: boolean; weightLossSummary?: WeightLossPatientSummary } = { autoOpenWhatsApp: true },
): Promise<ShareResult> {
  const safeName = patientName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() || "patient";
  const ts = Date.now();

  // 1) Make sure brand assets are publicly reachable (idempotent)
  const [logoUrl, signatureUrl] = await Promise.all([
    uploadAssetIfNeeded(logoSrc, "_brand/dr-sami-logo.png"),
    uploadAssetIfNeeded(signatureSrc, "_brand/dr-sami-signature.png"),
  ]);

  // Pass public asset URLs into the HTML builders so the standalone HTML
  // points at hosted images (not the Vite dev URL which the patient can't reach).
  const buildOpts: BuildGuideOptions = {
    weightLossSummary: options.weightLossSummary,
    logoUrl,
    signatureUrl,
  };

  // 2) Build HTML guide & PDF (PDF is rendered from the same HTML for visual parity)
  const htmlContent = buildGuideHtml(guideText, patientName, program, buildOpts);
  const pdfBlob = await buildGuidePdfBlob(guideText, patientName, program, buildOpts);

  // 3) Upload artifacts
  const htmlFileName = `${safeName}_${ts}.html`;
  const pdfFileName = `${safeName}_${ts}.pdf`;
  const htmlUrl = await uploadHtml(htmlContent, htmlFileName);
  const pdfUrl = await uploadPdf(pdfBlob, pdfFileName);

  // 4) Patient-facing URLs go through our serve-guide Edge Function so the
  // browser receives the file with the correct Content-Type (text/html or
  // application/pdf). The raw Supabase Storage URL serves files as
  // text/plain with a hard CSP, which renders the page as source code.
  const patientHtmlUrl = buildServeGuideUrl(htmlFileName);
  const patientPdfUrl = buildServeGuideUrl(pdfFileName);

  // Patient-facing app URL on the published domain. It opens the rendered
  // HTML guide immediately (not the Lovable preview and not the PDF).
  const patientGuidePageUrl = buildAppSharedGuideUrl({
    patientName,
    program,
    htmlUrl: patientHtmlUrl,
    pdfUrl: patientPdfUrl,
    view: "guide",
  });

  // Static landing page fallback artifact.
  const landingHtml = buildLandingHtml({
    patientName,
    program,
    htmlUrl: patientHtmlUrl,
    pdfUrl: patientPdfUrl,
    logoUrl,
    signatureUrl,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  await uploadHtml(landingHtml, `${safeName}_${ts}_share.html`);

  // 5) Compose short WhatsApp message — link the patient DIRECTLY to the
  // rendered guide so they see a fully styled page on first tap, even
  // inside the WhatsApp in-app browser.
  const message =
    `Hello ${patientName},\n\n` +
    `Your ${PROGRAM_LABELS[program]} guide from Dr Sami M. Yesuf is ready.\n\n` +
    `View your guide: ${patientGuidePageUrl}\n\n` +
    `— PeptiDOC`;
  const whatsappUrl = `https://wa.me/${sanitizePhone(phone)}?text=${encodeURIComponent(message)}`;

  if (options.autoOpenWhatsApp !== false) {
    window.open(whatsappUrl, "_blank");
  }

  return { htmlUrl: patientGuidePageUrl, pdfUrl: patientPdfUrl, landingUrl: patientGuidePageUrl, whatsappUrl };
}

/** Backwards-compat wrapper used by older callers. */
export async function shareGuideViaWhatsApp(
  guideText: string,
  patientName: string,
  phone: string,
  program: Program = "peptides",
): Promise<void> {
  await generateAndShareGuide(guideText, patientName, phone, program);
}
