import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Eye, Pencil, Sparkles, Copy, Check } from "lucide-react";
import PatientGuideDisplay from "@/components/PatientGuideDisplay";
import { generateAndShareGuide } from "@/utils/shareGuide";
import { buildGuideHtml } from "@/utils/printGuide";
import type { WeightLossPatientSummary } from "@/utils/weightLossGuideHtml";
import { useToast } from "@/hooks/use-toast";

interface ShareGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  phone: string;
  program: "peptides" | "weight_loss";
  initialGuideText: string;
  /** Optional patient summary rendered in the weight-loss layout. */
  weightLossSummary?: WeightLossPatientSummary;
  /** Called with the edited guide text after a successful send so the parent can persist it. */
  onSent?: (editedGuideText: string) => void;
}

export default function ShareGuideDialog({
  open,
  onOpenChange,
  patientName,
  phone,
  program,
  initialGuideText,
  weightLossSummary,
  onSent,
}: ShareGuideDialogProps) {
  const { toast } = useToast();
  const [guideText, setGuideText] = useState(initialGuideText);
  const [sending, setSending] = useState(false);
  const [linksReady, setLinksReady] = useState<{ landing: string; html: string; pdf: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const previewHtml = useMemo(
    () => buildGuideHtml(guideText, patientName, program, { weightLossSummary }),
    [guideText, patientName, program, weightLossSummary],
  );

  // Reset state whenever the dialog re-opens with potentially new content
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setGuideText(initialGuideText);
      setLinksReady(null);
      setCopied(false);
    }
    onOpenChange(next);
  };

  const handleSend = async () => {
    if (!phone) {
      toast({ title: "No phone number on file", description: "Add a mobile number to share via WhatsApp.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const result = await generateAndShareGuide(guideText, patientName, phone, program, {
        autoOpenWhatsApp: true,
        weightLossSummary,
      });

      setLinksReady({ landing: result.landingUrl, html: result.htmlUrl, pdf: result.pdfUrl });
      onSent?.(guideText);
      toast({ title: "Guide sent", description: "WhatsApp opened with the share link." });
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message || "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Share Patient Guide — {patientName}
          </DialogTitle>
          <DialogDescription>
            Edit the guide on the left, preview on the right. When ready, send a branded WhatsApp link with both an
            online view and a downloadable PDF.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="split" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="self-start">
            <TabsTrigger value="split">Edit & Preview</TabsTrigger>
            <TabsTrigger value="edit">
              <Pencil className="h-3 w-3 mr-1" /> Edit only
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-3 w-3 mr-1" /> Preview only
            </TabsTrigger>
          </TabsList>

          <TabsContent value="split" className="flex-1 min-h-0 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full min-h-0">
              <div className="flex flex-col min-h-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Editable content</div>
                <Textarea
                  value={guideText}
                  onChange={(e) => setGuideText(e.target.value)}
                  className="flex-1 min-h-[400px] font-mono text-xs resize-none"
                  placeholder="Patient guide markup (use ::: SECTION TITLE ::: blocks)…"
                />
              </div>
              <div className="flex flex-col min-h-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Live preview</div>
                <div className="flex-1 min-h-[400px] overflow-hidden rounded-lg border bg-background">
                  <iframe
                    title="Branded patient guide preview"
                    srcDoc={previewHtml}
                    className="h-full min-h-[400px] w-full bg-background"
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="flex-1 min-h-0 mt-3">
            <Textarea
              value={guideText}
              onChange={(e) => setGuideText(e.target.value)}
              className="w-full h-full min-h-[440px] font-mono text-xs resize-none"
            />
          </TabsContent>

          <TabsContent value="preview" className="flex-1 min-h-0 mt-3 overflow-hidden rounded-lg border bg-background">
            <iframe
              title="Branded patient guide preview"
              srcDoc={previewHtml}
              className="h-full min-h-[440px] w-full bg-background"
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </TabsContent>
        </Tabs>

        {linksReady && (
          <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-3 space-y-2 text-xs">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" /> Links ready & WhatsApp opened
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate bg-background rounded px-2 py-1 border">{linksReady.landing}</code>
              <Button size="sm" variant="outline" onClick={() => copyLink(linksReady.landing)}>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <div className="flex gap-3 text-muted-foreground text-[11px]">
              <a href={linksReady.html} target="_blank" rel="noreferrer" className="underline hover:text-primary">Open HTML</a>
              <a href={linksReady.pdf} target="_blank" rel="noreferrer" className="underline hover:text-primary">Open PDF</a>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Close
          </Button>
          <Button onClick={handleSend} disabled={sending || !guideText.trim()} className="min-w-[180px]">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" /> Generate & Send via WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
