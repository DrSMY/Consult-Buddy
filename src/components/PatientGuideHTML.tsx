import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, ClipboardCheck, MessageCircle, Eye, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { generateGuideHTML, guideToPlainText, type PatientGuideData } from "@/utils/guideHtml";
import { openWhatsApp } from "@/utils/whatsapp";

interface Props {
  data: PatientGuideData;
  phoneNumber?: string;
  /** Show inline preview instead of just buttons */
  showInlinePreview?: boolean;
}

export default function PatientGuideHTML({ data, phoneNumber, showInlinePreview = false }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = generateGuideHTML(data);
  const plainText = guideToPlainText(data);

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(html);
    setCopiedType("html");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(plainText);
    setCopiedType("text");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleWhatsApp = () => {
    if (phoneNumber) openWhatsApp(phoneNumber, plainText);
  };

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-3 w-3 mr-1" /> Preview Guide
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopyText}>
          {copiedType === "text" ? <ClipboardCheck className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copiedType === "text" ? "Copied!" : "Copy Text"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopyHTML}>
          {copiedType === "html" ? <ClipboardCheck className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
          {copiedType === "html" ? "Copied!" : "Copy HTML"}
        </Button>
        {phoneNumber && (
          <Button variant="outline" size="sm" onClick={handleWhatsApp}>
            <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
          </Button>
        )}
      </div>

      {/* Inline preview */}
      {showInlinePreview && (
        <div className="rounded-lg border overflow-hidden bg-muted/30">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full border-0"
            style={{ minHeight: 400, height: "60vh" }}
            title="Patient Guide Preview"
            sandbox="allow-same-origin"
          />
        </div>
      )}

      {/* Full-screen preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Patient Guide Preview
            </DialogTitle>
            <DialogDescription>
              Preview of the formatted patient guide for {data.patient.name}
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
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleCopyText}>
              <Copy className="h-3 w-3 mr-1" /> Copy Text
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopyHTML}>
              <FileText className="h-3 w-3 mr-1" /> Copy HTML
            </Button>
            {phoneNumber && (
              <Button size="sm" variant="outline" onClick={handleWhatsApp}>
                <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
