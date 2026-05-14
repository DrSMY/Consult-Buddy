/**
 * Build the branded landing page HTML that patients open from WhatsApp.
 * Contains: hero with logo, personalized greeting, two action cards
 * (View Online, Download PDF), doctor signature, footer.
 *
 * Edit this file to change the design of the page patients see.
 */
export interface LandingParams {
  patientName: string;
  program: "peptides" | "weight_loss";
  htmlUrl: string;
  pdfUrl: string;
  logoUrl: string;
  signatureUrl: string;
  expiresAt?: Date;
}

const PROGRAM_META: Record<
  "peptides" | "weight_loss",
  { label: string; accent: string; accentSoft: string; subtitle: string }
> = {
  peptides: {
    label: "Peptide Therapy",
    accent: "#0d9488",
    accentSoft: "#5eead4",
    subtitle: "Your personalized peptide protocol is ready.",
  },
  weight_loss: {
    label: "Weight Loss Program",
    accent: "#b8860b",
    accentSoft: "#f5c86b",
    subtitle: "Your personalized GLP-1 weight loss plan is ready.",
  },
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildLandingHtml(params: LandingParams): string {
  const meta = PROGRAM_META[params.program];
  const expiry = params.expiresAt
    ? params.expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${meta.accent}">
<title>${esc(params.patientName)} — ${meta.label} Guide</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --accent: ${meta.accent};
    --accent-soft: ${meta.accentSoft};
    --ink: #0f172a;
    --ink-soft: #475569;
    --surface: rgba(255, 255, 255, 0.78);
    --surface-strong: rgba(255, 255, 255, 0.92);
    --border: rgba(15, 23, 42, 0.08);
    --shadow-lg: 0 24px 60px -28px rgba(13, 148, 136, 0.35), 0 8px 24px -16px rgba(15, 23, 42, 0.18);
    --shadow-md: 0 12px 32px -16px rgba(13, 148, 136, 0.28);
  }

  html, body { min-height: 100%; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: var(--ink);
    line-height: 1.5;
    background:
      radial-gradient(ellipse 80% 60% at 50% -20%, rgba(94, 234, 212, 0.45), transparent 60%),
      radial-gradient(ellipse 60% 40% at 100% 80%, rgba(186, 230, 253, 0.45), transparent 60%),
      radial-gradient(ellipse 60% 40% at 0% 100%, rgba(167, 243, 208, 0.35), transparent 60%),
      linear-gradient(180deg, #f0fdfa 0%, #f8fafc 50%, #ecfeff 100%);
    background-attachment: fixed;
    min-height: 100vh;
    padding: 1.25rem 1rem 2rem;
    position: relative;
    overflow-x: hidden;
  }

  /* ECG line motif overlay (echoes the heartbeat in the logo) */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='120' viewBox='0 0 600 120'><path d='M0 60 L120 60 L140 60 L150 30 L165 90 L180 20 L195 100 L210 60 L600 60' fill='none' stroke='%23ef4444' stroke-width='1.5' stroke-opacity='0.06' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    background-repeat: repeat-y;
    background-position: center top;
    background-size: 600px 120px;
    pointer-events: none;
    z-index: 0;
  }

  .shell { max-width: 560px; margin: 0 auto; position: relative; z-index: 1; }

  /* Hero card */
  .hero {
    background: var(--surface);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 1.75rem 1.5rem 1.5rem;
    text-align: center;
    box-shadow: var(--shadow-lg);
    margin-bottom: 1rem;
    animation: rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .logo-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 84px;
    height: 84px;
    border-radius: 22px;
    background: linear-gradient(135deg, #ffffff, #f0fdfa);
    box-shadow: 0 8px 24px -10px rgba(13, 148, 136, 0.45), inset 0 0 0 1px rgba(15, 23, 42, 0.05);
    margin-bottom: 1rem;
    overflow: hidden;
  }
  .logo-wrap img { width: 78%; height: 78%; object-fit: contain; }

  .program-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #000));
    color: #fff;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    margin-bottom: 0.85rem;
    box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--accent) 80%, transparent);
  }
  .program-badge::before {
    content: '';
    width: 6px; height: 6px; border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
  }

  .greeting {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin-bottom: 0.35rem;
  }
  .greeting span { color: var(--accent); }
  .subtitle {
    font-size: 0.9rem;
    color: var(--ink-soft);
    max-width: 360px;
    margin: 0 auto;
  }

  /* Action cards */
  .actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  @media (min-width: 480px) {
    .actions { grid-template-columns: 1fr 1fr; }
  }
  .action {
    display: block;
    background: var(--surface-strong);
    backdrop-filter: blur(18px) saturate(180%);
    -webkit-backdrop-filter: blur(18px) saturate(180%);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 1.1rem 1rem 1.25rem;
    text-decoration: none;
    color: var(--ink);
    box-shadow: var(--shadow-md);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s, border-color 0.25s;
    position: relative;
    overflow: hidden;
    animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .action:nth-child(1) { animation-delay: 0.08s; }
  .action:nth-child(2) { animation-delay: 0.16s; }
  .action:hover, .action:focus-visible {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    box-shadow: 0 18px 42px -20px color-mix(in srgb, var(--accent) 60%, transparent);
    outline: none;
  }
  .action::after {
    content: '';
    position: absolute;
    inset: -40% -20% auto auto;
    width: 140px; height: 140px;
    background: radial-gradient(circle, color-mix(in srgb, var(--accent-soft) 70%, transparent), transparent 70%);
    opacity: 0.5;
    pointer-events: none;
  }
  .action-icon {
    width: 44px; height: 44px;
    border-radius: 14px;
    display: inline-flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, #fff), color-mix(in srgb, var(--accent-soft) 30%, #fff));
    color: var(--accent);
    margin-bottom: 0.7rem;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent);
  }
  .action-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
    margin-bottom: 0.2rem;
  }
  .action-title {
    display: block;
    font-size: 1rem;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 0.15rem;
  }
  .action-desc {
    display: block;
    font-size: 0.78rem;
    color: var(--ink-soft);
    line-height: 1.45;
  }
  .action-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.7rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--accent);
  }
  .action-cta svg { transition: transform 0.2s; }
  .action:hover .action-cta svg { transform: translateX(3px); }

  /* Doctor signature card */
  .doctor {
    background: var(--surface);
    backdrop-filter: blur(18px) saturate(180%);
    -webkit-backdrop-filter: blur(18px) saturate(180%);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 1.1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: var(--shadow-md);
    margin-bottom: 1rem;
    animation: rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.24s both;
  }
  .signature {
    flex-shrink: 0;
    width: 90px; height: 60px;
    display: flex; align-items: center; justify-content: center;
  }
  .signature img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .doctor-info { flex: 1; min-width: 0; }
  .doctor-name {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 0.1rem;
  }
  .doctor-title {
    font-size: 0.72rem;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* Footer */
  .footer {
    text-align: center;
    font-size: 0.7rem;
    color: var(--ink-soft);
    line-height: 1.6;
    padding: 0.5rem 1rem 0;
    animation: rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
  }
  .footer-brand {
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-size: 0.72rem;
  }
  .footer-divider {
    width: 24px; height: 2px; border-radius: 999px;
    background: var(--accent-soft);
    margin: 0.5rem auto 0.4rem;
  }
  .footer-meta { font-size: 0.65rem; color: #94a3b8; margin-top: 0.35rem; }

  @keyframes rise {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero, .action, .doctor, .footer { animation: none; }
    .action { transition: none; }
  }
</style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="logo-wrap">
        <img src="${esc(params.logoUrl)}" alt="Dr Sami logo" />
      </div>
      <div class="program-badge">${esc(meta.label)}</div>
      <h1 class="greeting">Hello, <span>${esc(params.patientName)}</span></h1>
      <p class="subtitle">${esc(meta.subtitle)} Choose how you'd like to view it below.</p>
    </section>

    <section class="actions">
      <a class="action" href="${esc(params.htmlUrl)}" target="_blank" rel="noopener">
        <span class="action-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        </span>
        <span class="action-label">Interactive</span>
        <span class="action-title">View Online</span>
        <span class="action-desc">Open the full styled guide in your browser.</span>
        <span class="action-cta">Open guide
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </span>
      </a>

      <a class="action" href="${esc(params.pdfUrl)}" target="_blank" rel="noopener" download>
        <span class="action-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        </span>
        <span class="action-label">Letterhead</span>
        <span class="action-title">Download PDF</span>
        <span class="action-desc">Save a print-ready branded copy.</span>
        <span class="action-cta">Download
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </span>
      </a>
    </section>

    <section class="doctor">
      <div class="signature">
        <img src="${esc(params.signatureUrl)}" alt="Dr Sami signature" />
      </div>
      <div class="doctor-info">
        <div class="doctor-name">Dr Sami M. Yesuf</div>
        <div class="doctor-title">DarDoc Healthcare</div>
        <div class="doctor-title">Scope Certified Physician</div>
      </div>
    </section>

    <footer class="footer">
      <div class="footer-brand">PeptiDOC</div>
      <div class="footer-divider"></div>
      Confidential patient information &middot; For personal use only
      ${expiry ? `<div class="footer-meta">Link active until ${esc(expiry)}</div>` : ""}
    </footer>
  </main>
</body>
</html>`;
}
