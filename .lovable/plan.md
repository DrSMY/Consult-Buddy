## What's actually happening

Your real link works. I tested it just now:

```
GET https://kokottennducgqcearxu.supabase.co/functions/v1/serve-guide?file=sami_whatsapp_test_flow_1777215183853.html&raw=1
→ 200 OK, content-type: text/html, CORS headers present
```

So the file is reachable. The "link expired" copy on `peptidedoc.live/shared-guide` only appears in **one** place — when the page can't validate the `?html=` parameter:

```ts
if (!isAllowedSharedFileUrl(htmlUrl)) {
  setError("This guide link is invalid or has expired.");
}
```

The wording is misleading — guides never actually expire, the storage bucket is permanent and public. The real reasons this fires for some patients:

1. **WhatsApp / SMS / email clients shorten or strip query parameters** when previewing the link, so by the time the patient taps it, the `html=` param is gone or truncated.
2. **The validator is too strict** — any URL not containing the exact substrings `/patient-guides/` or `/functions/v1/serve-guide` is rejected as "expired", even if the host is clearly ours.
3. **The fetch itself can fail** on slow mobile networks (timeout, CORS preflight retry) and we currently surface that as a dead-end without offering the PDF.

## The fix

### 1. Stop saying "expired"

Replace the message with honest copy: "We couldn't open this guide right now" + a clear path forward (open PDF / try again). Guides never expire.

### 2. Auto-recover when `html=` is missing or malformed

If `?html=` is missing but `?pdf=` is present, switch the page into PDF view automatically so the patient still gets their guide instead of a dead end.

If neither is present but a filename can be inferred from the URL (`?file=`), reconstruct the canonical `serve-guide` URL on the fly.

### 3. Loosen URL validation

Accept any HTTPS URL on `*.supabase.co` (the only host we ever generate) so cached, slightly-rewritten, or proxied links still pass. This protects against WhatsApp's "smart" URL rewriting.

### 4. Retry the fetch once

If the first `fetch()` fails (common on flaky mobile data), retry once after 1.5 s before showing the error.

### 5. Always show the PDF fallback button

Even on the loading screen and the error screen, render the "Download PDF" button if `?pdf=` is present, so patients are never stuck.

### 6. Add a shorter, more durable WhatsApp link

Right now the WhatsApp message contains a ~250-char link with two encoded sub-URLs. WhatsApp tends to corrupt long links. Switch to a compact link format:

```
https://peptidedoc.live/g/sami_whatsapp_test_flow_1777215183853
```

…served by a tiny route that looks the file up by name and renders the same `SharedGuide` view. The full 250-char URL becomes the fallback, never the primary.

## Files to change

- `src/pages/SharedGuide.tsx` — looser validation, PDF auto-fallback, retry, honest copy.
- `src/utils/shareGuide.ts` — emit the new short `/g/<filename>` link as the primary WhatsApp URL.
- `src/App.tsx` (or wherever routes live) — register `/g/:file` route that renders `SharedGuide` with reconstructed params.

No edge function or database changes needed — `serve-guide` already works correctly.

## After approval

I'll implement all six fixes in one pass and confirm by opening the new short link end-to-end.