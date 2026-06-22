import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function sanitize(val: unknown, maxLen: number): string {
  if (typeof val !== "string") return "";
  return val.slice(0, maxLen).replace(/[<>&"']/g, (c) => {
    const map: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" };
    return map[c] || c;
  }).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require an authenticated caller to prevent phishing-style abuse
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    const name = sanitize(body.name, 100);
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 255) : "";

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const displayName = name || 'there';

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f7; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0891b2, #0e7490); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .body { padding: 32px 24px; }
    .body h2 { color: #1e293b; font-size: 20px; margin-top: 0; }
    .body p { color: #475569; font-size: 15px; line-height: 1.6; }
    .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { color: #94a3b8; font-size: 13px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PeptiDOC</h1>
    </div>
    <div class="body">
      <h2>Welcome aboard, ${displayName}!</h2>
      <p>Thanks for signing up for <strong>PeptiDOC</strong>. We're excited to have you!</p>
      <p>Your account has been created successfully. Our admin team will now review your account and approve access.</p>
      <p>Hang tight — good things are on the way!</p>
      <p>We'll notify you as soon as you're all set to dive in.</p>
    </div>
    <div class="footer">
      <p>&copy; PeptiDOC — Smart Clinical Consultation Platform</p>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PeptiDOC <onboarding@resend.dev>',
        to: [email],
        subject: "Welcome to PeptiDOC — You're Almost In!",
        html: htmlContent,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error('Email service error');
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error sending confirmation email:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
