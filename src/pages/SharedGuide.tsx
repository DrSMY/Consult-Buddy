import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, Download, Eye, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Program = "peptides" | "weight_loss";

function safeParam(value: string | null, fallback = "") {
  return value?.trim() || fallback;
}

function isAllowedSharedFileUrl(value: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    // Accept either a direct storage URL or our serve-guide Edge Function URL.
    return (
      url.pathname.includes("/patient-guides/") ||
      url.pathname.includes("/functions/v1/serve-guide")
    );
  } catch {
    return false;
  }
}

export default function SharedGuide() {
  const [searchParams] = useSearchParams();
  const htmlUrl = safeParam(searchParams.get("html"));
  const pdfUrl = safeParam(searchParams.get("pdf"));
  const patientName = safeParam(searchParams.get("name"), "Patient");
  const program = (safeParam(searchParams.get("program"), "peptides") as Program) || "peptides";
  const view = safeParam(searchParams.get("view"), "landing");
  const [htmlDoc, setHtmlDoc] = useState("");
  const [loading, setLoading] = useState(view === "guide");
  const [error, setError] = useState("");

  const programLabel = program === "weight_loss" ? "Weight Loss Program" : "Peptide Therapy";
  const guideUrl = useMemo(() => {
    const next = new URL(window.location.href);
    next.searchParams.set("view", "guide");
    return `${next.pathname}${next.search}`;
  }, []);

  useEffect(() => {
    if (view !== "guide") return;
    if (!isAllowedSharedFileUrl(htmlUrl)) {
      setError("This guide link is invalid or has expired.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(htmlUrl, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Guide could not be loaded.");
        return res.text();
      })
      .then((doc) => {
        if (!cancelled) setHtmlDoc(doc);
      })
      .catch(() => {
        if (!cancelled) setError("We could not open this guide. Please try the PDF copy below.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [htmlUrl, view]);

  if (view === "guide") {
    return (
      <main className="min-h-screen bg-background">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b bg-card px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{programLabel}</p>
            <h1 className="truncate text-lg font-semibold text-foreground">{patientName} — Patient Guide</h1>
          </div>
          {isAllowedSharedFileUrl(pdfUrl) && (
            <Button asChild size="sm" className="shrink-0">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="mr-2 h-4 w-4" /> PDF
              </a>
            </Button>
          )}
        </header>

        {loading ? (
          <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening your guide…
          </div>
        ) : error ? (
          <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Guide unavailable</h2>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </div>
            {isAllowedSharedFileUrl(pdfUrl) && (
              <Button asChild>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="mr-2 h-4 w-4" /> Download PDF instead
                </a>
              </Button>
            )}
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
          <Button asChild size="lg" className="h-auto justify-start rounded-lg p-5">
            <Link to={guideUrl}>
              <Eye className="mr-3 h-5 w-5" />
              <span className="text-left">
                <span className="block font-semibold">View Online</span>
                <span className="block text-xs opacity-80">Open the full branded guide</span>
              </span>
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-auto justify-start rounded-lg p-5" disabled={!isAllowedSharedFileUrl(pdfUrl)}>
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