import html2pdf from "html2pdf.js";
import { buildGuideHtml } from "./printGuide";

/**
 * Render the patient guide HTML into a PDF Blob using html2pdf.js (browser-side).
 * Reuses buildGuideHtml so the PDF design stays in sync with the online guide.
 */
export async function buildGuidePdfBlob(
  guideText: string,
  patientName: string,
  program: "peptides" | "weight_loss" = "peptides",
): Promise<Blob> {
  const html = buildGuideHtml(guideText, patientName, program);

  // Render off-screen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "0";
  container.style.width = "794px"; // A4 width @ 96dpi
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const opt = {
      margin: [10, 8, 12, 8] as [number, number, number, number],
      filename: `${patientName.replace(/[^a-zA-Z0-9]/g, "_")}_Guide.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] as ("avoid-all" | "css" | "legacy")[] },
    };

    const blob: Blob = await (html2pdf() as any)
      .from(container)
      .set(opt)
      .outputPdf("blob");

    return blob;
  } finally {
    document.body.removeChild(container);
  }
}
