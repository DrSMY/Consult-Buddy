import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, ClipboardCheck, MessageCircle, Eye, Link2, Loader2, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { generateGuideHTML, guideToPlainText, type PatientGuideData } from "@/utils/guideHtml";
import { openWhatsApp } from "@/utils/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  data: PatientGuideData;
  phoneNumber?: string;
  consultationId?: string;
  program?: string;
  /** If a guide link already exists */
  existingGuideId?: string;
  onGuideSaved?: (guideId: string, guideUrl: string) => void;
}

export default function PatientGuideHTML({ data, phoneNumber, consultationId, program, existingGuideId, onGuideSaved }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [guideId, setGuideId] = useState<string | null>(existingGuideId || null);
  const { user } = useAuth();
  const { toast } = useToast();

  const html = generateGuideHTML(data);
  const plainText = guideToPlainText(data);

  const getGuideUrl = (id: string) => {
    const base = window.location.origin;
    return `${base}/guide/${id}`;
  };

  const handleSaveAndShare = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: row, error } = await supabase
        .from("patient_guides")
        .insert({
          user_id: user.id,
          consultation_id: consultationId || null,
          patient_name: data.patient.name,
          program: program || "general",
          guide_data: data as any,
        })
        .select("id")
        .single();

      if (error) throw error;
      const newId = row.id;
      setGuideId(newId);
      const url = getGuideUrl(newId);

      // Copy link to clipboard
      await navigator.clipboard.writeText(url);
      setCopiedType("link");
      setTimeout(() => setCopiedType(null), 3000);

      toast({ title: "Guide link created & copied!", description: "Link expires in 30 days." });
      onGuideSaved?.(newId, url);
    } catch (e: any) {
      toast({ title: "Failed to create guide link", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleCopyLink = () => {
    if (!guideId) return;
    navigator.clipboard.writeText(getGuideUrl(guideId));
    setCopiedType("link");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleWhatsAppLink = () => {
    if (!phoneNumber) return;
    const url = guideId ? getGuideUrl(guideId) : "";
    const message = `Hi ${data.patient.name}, here is your care guide from PeptiDOC:\n${url}\n\nThis link expires in 30 days.`;
    openWhatsApp(phoneNumber, message);
  };

  const handleWhatsAppText = () => {
    if (phoneNumber) openWhatsApp(phoneNumber, plainText);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(plainText);
    setCopiedType("text");
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* Primary action: create shareable link */}
        {!guideId ? (
          <Button size="sm" onClick={handleSaveAndShare} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Share2 className="h-3 w-3 mr-1" />}
            {saving ? "Creating..." : "Create & Copy Link"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={handleCopyLink}>
            {copiedType === "link" ? <ClipboardCheck className="h-3 w-3 mr-1" /> : <Link2 className="h-3 w-3 mr-1" />}
            {copiedType === "link" ? "Copied!" : "Copy Link"}
          </Button>
        )}

        {/* WhatsApp with link */}
        {guideId && phoneNumber && (
          <Button size="sm" variant="outline" onClick={handleWhatsAppLink}>
            <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp Link
          </Button>
        )}

        {/* Preview */}
        <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-3 w-3 mr-1" /> Preview
        </Button>

        {/* Fallback text options */}
        <Button variant="ghost" size="sm" onClick={handleCopyText}>
          {copiedType === "text" ? <ClipboardCheck className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copiedType === "text" ? "Copied!" : "Copy Text"}
        </Button>

        {phoneNumber && (
          <Button variant="ghost" size="sm" onClick={handleWhatsAppText}>
            <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp Text
          </Button>
        )}
      </div>

      {/* Show link if created */}
      {guideId && (
        <div className="bg-muted/50 rounded-lg p-3 border flex items-center gap-2 text-xs">
          <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate text-muted-foreground">{getGuideUrl(guideId)}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">(30 days)</span>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Patient Guide Preview
            </DialogTitle>
            <DialogDescription>
              This is how {data.patient.name} will see the guide
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-lg border">
            <iframe
              srcDoc={html}
              className="w-full border-0"
              style={{ minHeight: 500, height: "100%" }}
              title="Patient Guide Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
