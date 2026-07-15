import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, XCircle } from "lucide-react";
import Logo from "@/components/Logo";

// Beta @supabase/supabase-js OAuth namespace — typed wrapper.
type OAuthClient = {
  name?: string | null;
  client_uri?: string | null;
  redirect_uri?: string | null;
  logo_uri?: string | null;
};
type AuthorizationDetails = {
  client?: OAuthClient | null;
  scope?: string | string[] | null;
  redirect_uri?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};
const oauth = ((supabase.auth as unknown as { oauth: OAuthApi }).oauth) ?? null;

function scopeList(scope: AuthorizationDetails["scope"]): string[] {
  if (!scope) return [];
  return Array.isArray(scope) ? scope : String(scope).split(/\s+/).filter(Boolean);
}

function scopeLabel(scope: string): string {
  switch (scope) {
    case "openid":
      return "Confirm your identity";
    case "email":
      return "Share your email address";
    case "profile":
      return "Share your basic profile";
    default:
      return `Additional permission requested: ${scope}`;
  }
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id in the URL.");
        return;
      }
      if (!oauth) {
        setError("OAuth is not available on this build of the app.");
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setUserEmail(sessionData.session.user.email ?? null);

      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    if (!oauth) return;
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-surface px-4">
        <Card className="w-full max-w-md glass-card shadow-xl text-center">
          <CardHeader>
            <XCircle className="h-10 w-10 mx-auto text-destructive mb-1" />
            <CardTitle className="text-lg">Authorization error</CardTitle>
            <CardDescription>We couldn't load this authorization request.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground break-words">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-surface">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const clientName = details.client?.name ?? "an external app";
  const redirectUri = details.client?.redirect_uri ?? details.redirect_uri ?? "";
  const scopes = scopeList(details.scope);

  return (
    <div className="flex min-h-screen items-center justify-center gradient-surface px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>
        <Card className="glass-card shadow-xl">
          <CardHeader className="text-center space-y-1">
            <ShieldCheck className="h-10 w-10 mx-auto text-primary" />
            <CardTitle className="text-lg">
              Connect {clientName} to PeptiDOC
            </CardTitle>
            <CardDescription>
              {clientName} will be able to call this app's enabled tools while you are signed in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userEmail && (
              <div className="text-xs text-muted-foreground text-center">
                Signed in as <span className="font-medium text-foreground">{userEmail}</span>
              </div>
            )}
            {redirectUri && (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs break-all">
                <div className="text-muted-foreground mb-0.5">Redirect URI</div>
                <div className="font-mono">{redirectUri}</div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                This will
              </p>
              <ul className="space-y-1.5 text-sm">
                {scopes.length === 0 ? (
                  <li className="flex items-start gap-2">
                    <Badge variant="secondary" className="mt-0.5">•</Badge>
                    <span>Act as you when calling this app's tools.</span>
                  </li>
                ) : (
                  scopes.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">•</Badge>
                      <span>{scopeLabel(s)}</span>
                    </li>
                  ))
                )}
                <li className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">•</Badge>
                  <span>Respect this app's permissions and backend policies — nothing is bypassed.</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => decide(false)}
              >
                Cancel connection
              </Button>
              <Button
                className="flex-1 gradient-primary"
                disabled={busy}
                onClick={() => decide(true)}
              >
                {busy ? "Working..." : "Approve"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
