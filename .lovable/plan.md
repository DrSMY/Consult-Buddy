# Why the link "looks like code" to patients

I diagnosed the actual cause by inspecting how Supabase Storage serves the uploaded `.html` file:

```
content-type: text/plain                              ← browser shows raw source
content-security-policy: default-src 'none'; sandbox  ← blocks fonts, images, scripts
x-content-type-options: nosniff                       ← prevents browser from guessing
```

Supabase Storage **forces every served file to `text/plain` with a hard sandbox CSP**. This is a security policy on the public bucket — there's no setting to change it. So:

- The raw storage URL will **always** show source code, never a rendered page.
- Even when it does render, Tailwind CDN, Google Fonts, and your logo are blocked by the CSP.
- Our current `/shared-guide?view=guide` workaround only works because our React app fetches the text and re-injects it via `srcDoc` — but that requires the patient to first load the full React app, wait for JS, and trust an iframe. On WhatsApp's in-app browser this is fragile.

**You don't need a different HTML maker.** The HTML you're already generating is correct (the in-app preview proves it). The problem is purely the *delivery channel*.

# Recommended fix: serve guides through an Edge Function

Create a tiny public Edge Function `serve-guide` that:
1. Reads a `?file=<storage-path>` query param
2. Downloads the HTML from the `patient-guides` bucket using the service role
3. Returns it with **`Content-Type: text/html; charset=utf-8`** and **no restrictive CSP**

Patients receive a single clean URL like:
```
https://peptidedoc.live/g/sami_test_html_flow_1777120979848
```
…which redirects (or proxies) to the Edge Function and renders as a full branded page instantly — no React app load, no iframe, works in every WhatsApp in-app browser, fonts/images load normally.

# Implementation steps

1. **New Edge Function** `supabase/functions/serve-guide/index.ts`
   - Public (no JWT): add `[functions.serve-guide] verify_jwt = false` to `supabase/config.toml`
   - Validates the file path is inside `patient-guides/` and ends with `.html`
   - Fetches the object from storage, returns it with `Content-Type: text/html; charset=utf-8`, `Cache-Control: public, max-age=300`, and permissive headers so external assets (Tailwind CDN, Google Fonts) load
   - Optional: also handle `.pdf` to serve PDFs with `Content-Type: application/pdf` and `Content-Disposition: inline`

2. **Update `src/utils/shareGuide.ts`**
   - After uploading, build the patient URL as the Edge Function URL:
     `https://kokottennducgqcearxu.supabase.co/functions/v1/serve-guide?file=<filename>.html`
   - Use this as the WhatsApp link directly — drop the `/shared-guide` React route from the patient flow
   - Keep the PDF link pointing at the same function (or keep the storage URL for PDFs since browsers handle PDFs better, but text/plain breaks even there — safer to proxy)

3. **Keep `/shared-guide` route** as the *clinician-facing* landing page with both "View Online" and "Download PDF" buttons (optional fallback — not in the patient WhatsApp message)

4. **Optional polish**: add a short slug column (e.g. `guide_links` table mapping `slug → file path`) so the patient URL can be `peptidedoc.live/g/abc123` instead of a Supabase function URL. Not required for the fix to work.

# Alternative HTML/delivery options (you asked)

If you'd rather not build the Edge Function, here are real alternatives — but honestly, the Edge Function is the cleanest:

| Option | Pros | Cons |
|---|---|---|
| **Edge Function proxy (recommended)** | One file, no new service, instant render, works everywhere | ~30 lines of code |
| **Cloudflare R2 / AWS S3 + CloudFront** | Real static HTML hosting | New account, billing, DNS setup |
| **Netlify Drop / GitHub Pages per file** | Free static hosting | Manual upload per patient — not automatable cleanly |
| **Convert to PDF only, send PDF link** | Simplest | Loses interactivity, links in guide aren't clickable on all viewers |
| **Email the HTML inline via Resend** | Renders perfectly in Gmail/Apple Mail | Patient needs email, not WhatsApp; some clients strip styles |

# What I will change (in build mode)

- `supabase/functions/serve-guide/index.ts` — new public Edge Function
- `supabase/config.toml` — register the function with `verify_jwt = false`
- `src/utils/shareGuide.ts` — point WhatsApp link at the new function URL
- `src/components/ShareGuideDialog.tsx` — update the "Open guide" link in the success card to use the new URL
- No DB changes, no new dependencies, no UI changes for clinicians

After this, the WhatsApp link a patient taps will open a fully branded, fonts-loaded, image-loaded HTML page directly in their browser — exactly what your in-app preview shows.
