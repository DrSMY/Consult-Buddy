import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, Download, Eye, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Program = "peptides" | "weight_loss";

const PROJECT_REF =
  (import.meta.env.VITE_SUPABASE_PROJECT_ID as string) || "kokottennducgqcearxu";
const SUPABASE_HOST = `${PROJECT_REF}.supabase.co`;

function safeParam(value: string | null | undefined, fallback = "") {
  return value?.trim() || fallback;
}

/**
 * Accept any HTTPS URL on our Supabase host. Old strict matching against
 * specific path substrings was rejecting perfectly valid links that had been
 * lightly rewritten by WhatsApp / SMS clients, surfacing a misleading
 * "expired" message. Guides themselves never expire.
 */
function isAllowedSharedFileUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return url.hostname === SUPABASE_HOST || url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

/** Build the canonical serve-guide URL for a stored filename. */
function buildServeGuideUrl(file: string): string {
  return `https://${SUPABASE_HOST}/functions/v1/serve-guide?file=${encodeURIComponent(file)}&raw=1`;
}

/** Fetch with a single retry to survive flaky mobile networks. */
async function fetchWithRetry(url: string, signal: AbortSignal): Promise<string> {
  const attempt = async () => {
    const res = await fetch(url, { cache: "no-store", signal });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return res.text();
  };
  try {
    return await attempt();
  } catch (e) {
    if (signal.aborted) throw e;
    await new Promise((r) => setTimeout(r, 1500));
    return attempt();
  }
}

export default function SharedGuide() {
  const [searchParams] = useSearchParams();
  const params = useParams<{ file?: string }>();

  // Reconstruct html/pdf URLs from the short /g/:file route if present.
  const inferredHtmlUrl = useMemo(() => {
    const file = params.file;
    if (!file) return "";
    const base = file.replace(/\.(html?|pdf)$/i, "");
    return buildServeGuideUrl(`${base}.html`);
  }, [params.file]);

  const inferredPdfUrl = useMemo(() => {
    const file = params.file;
    if (!file) return "";
    const base = file.replace(/\.(html?|pdf)$/i, "");
    return buildServeGuideUrl(`${base}.pdf`);
  }, [params.file]);

  const htmlUrlParam = safeParam(searchParams.get("html"));
  const pdfUrlParam = safeParam(searchParams.get("pdf"));
  const htmlUrl = htmlUrlParam || inferredHtmlUrl;
  const pdfUrl = pdfUrlParam || inferredPdfUrl;
  const patientName = safeParam(searchParams.get("name"), "Patient");
  const program = (safeParam(searchParams.get("program"), "peptides") as Program) || "peptides";

  // Default to "guide" view on the short /g/:file route so patients see the
  // rendered guide immediately without an extra tap.
  const requestedView = safeParam(searchParams.get("view"), params.file ? "guide" : "landing");

  // Auto-fallback: if html is unreachable but pdf is present, jump to PDF.
  const hasHtml = isAllowedSharedFileUrl(htmlUrl);
  const hasPdf = isAllowedSharedFileUrl(pdfUrl);
  const view = requestedView === "guide" && !hasHtml && hasPdf ? "pdf" : requestedView;

  const [htmlDoc, setHtmlDoc] = useState("");
  const [loading, setLoading] = useState(view === "guide");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const programLabel = program === "weight_loss" ? "Weight Loss Program" : "Peptide Therapy";
  const guideUrl = useMemo(() => {
    const next = new URL(window.location.href);
    next.searchParams.set("view", "guide");
    return `${next.pathname}${next.search}`;
  }, []);

  useEffect(() => {
    if (view !== "guide") return;
    if (!hasHtml) {
      setError("We couldn't open the online guide. Please use the PDF copy below.");
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError("");

    fetchWithRetry(htmlUrl, ctrl.signal)
      .then((doc) => setHtmlDoc(doc))
      .catch(() => {
        if (!ctrl.signal.aborted) {
          setError("We couldn't open the online guide right now. Please try again or use the PDF copy.");
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [htmlUrl, view, hasHtml, reloadKey]);

  // ---------- PDF auto-fallback view ----------
  if (view === "pdf" && hasPdf) {
    return (
      <main className="min-h-screen bg-background">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b bg-card px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{programLabel}</p>
            <h1 className="truncate text-lg font-semibold text-foreground">{patientName} — Patient Guide</h1>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="mr-2 h-4 w-4" /> Download
            </a>
          </Button>
        </header>
        <iframe
          title="Patient guide PDF"
          src={pdfUrl}
          className="h-[calc(100vh-4rem)] w-full border-0 bg-background"
        />
      </main>
    );
  }

  // ---------- Online guide view ----------
  if (view === "guide") {
    return (
      <main className="min-h-screen bg-background">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b bg-card px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{programLabel}</p>
            <h1 className="truncate text-lg font-semibold text-foreground">{patientName} — Patient Guide</h1>
          </div>
          {hasPdf && (
            <Button asChild size="sm" variant="secondary" className="shrink-0">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="mr-2 h-4 w-4" /> PDF
              </a>
            </Button>
          )}
        </header>

        {loading ? (
          <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="flex items-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening your guide…
            </div>
            {hasPdf && (
              <Button asChild size="sm" variant="ghost">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="mr-2 h-4 w-4" /> Open PDF instead
                </a>
              </Button>
            )}
          </div>
        ) : error ? (
          <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Guide temporarily unavailable</h2>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try again
              </Button>
              {hasPdf && (
                <Button asChild>
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </a>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <iframe
            title="Patient guide"
            srcDoc={htmlDoc}
            className="h-[calc(100vh-4rem)] w-full border-0 bg-background"
            sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals"
          />
        )}
      </main>
    );
  }

  // ---------- Landing view ----------
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background px-4 py-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center">
        <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{programLabel}</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Hello, {patientName}</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Your personalized guide from Dr Sami M. Yesuf is ready. Open the styled online guide or save the PDF copy.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Button asChild size="lg" className="h-auto justify-start rounded-lg p-5" disabled={!hasHtml && !hasPdf}>
            <Link to={guideUrl}>
              <Eye className="mr-3 h-5 w-5" />
              <span className="text-left">
                <span className="block font-semibold">View Online</span>
                <span className="block text-xs opacity-80">Open the full branded guide</span>
              </span>
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-auto justify-start rounded-lg p-5" disabled={!hasPdf}>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="mr-3 h-5 w-5" />
              <span className="text-left">
                <span className="block font-semibold">Download PDF</span>
                <span className="block text-xs opacity-80">Save a copy</span>
              </span>
            </a>
          </Button>
        </div>
      </section>
    </main>
  );
}
