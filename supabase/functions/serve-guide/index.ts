// Public proxy that serves patient guide HTML/PDF files from the
// `patient-guides` storage bucket with proper Content-Type headers.
//
// Why this exists: Supabase Storage forces every served file to
// `Content-Type: text/plain` with `Content-Security-Policy: default-src 'none'; sandbox`,
// which makes the raw URL render as source code with broken fonts/images.
// This function re-serves the same file with `text/html; charset=utf-8`
// (or `application/pdf`) and no restrictive CSP, so the patient sees the
// fully branded page.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "patient-guides";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Only allow simple filenames inside the patient-guides bucket — no traversal,
// no subpaths, only .html or .pdf.
function isSafeFile(name: string): boolean {
  return /^[a-zA-Z0-9._-]+\.(html|pdf)$/i.test(name) && !name.includes("..");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Accept ?file=name.html or trailing path /serve-guide/name.html
    let file = url.searchParams.get("file") || "";
    if (!file) {
      const parts = url.pathname.split("/").filter(Boolean);
      file = parts[parts.length - 1] || "";
    }

    if (!isSafeFile(file)) {
      return new Response("Invalid or expired guide link.", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data, error } = await supabase.storage.from(BUCKET).download(file);

    if (error || !data) {
      return new Response("This guide is no longer available.", {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const isPdf = file.toLowerCase().endsWith(".pdf");
    const contentType = isPdf
      ? "application/pdf"
      : "text/html; charset=utf-8";

    const headers: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    };
    if (isPdf) {
      headers["Content-Disposition"] = `inline; filename="${file}"`;
    }

    const buffer = await data.arrayBuffer();
    return new Response(buffer, { status: 200, headers });
  } catch (err) {
    console.error("serve-guide error", err);
    return new Response("Something went wrong opening this guide.", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
