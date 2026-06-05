import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Link2, Send } from "lucide-react";
import { sanitizePhone } from "@/utils/whatsapp";

const DEFAULT_MESSAGE = `📅 Your Consultation Appointment is Confirmed

Thank you for booking your consultation.

To ensure a smooth and efficient appointment, we kindly request that you complete your patient profile and intake form before your scheduled consultation. This allows your doctor to review your information in advance and provide the best possible care during your appointment.

The intake form will only take a few minutes to complete and includes basic information such as your age, height, weight, and relevant health details.

👉 Please complete your intake form using the link below:
🔗 {INTAKE_LINK}

Completing your information before your appointment helps avoid delays and ensures your consultation can begin on time.

We look forward to assisting you on your health journey.

— DarDoc Healthcare`;

export default function QuickWhatsAppCard() {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");

  const intakeLink = `${window.location.origin}/book`;
  const message = DEFAULT_MESSAGE.replace("{INTAKE_LINK}", intakeLink);

  const waLink = useMemo(() => {
    const sanitized = sanitizePhone(phone);
    if (!sanitized || sanitized.length < 6) return "";
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${sanitized}?text=${encoded}`;
  }, [phone, message]);

  const copyLink = async () => {
    if (!waLink) return;
    try {
      await navigator.clipboard.writeText(waLink);
      toast({ title: "Copied", description: "WhatsApp link copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Please copy the link manually.", variant: "destructive" });
    }
  };

  const openLink = () => {
    if (waLink) window.open(waLink, "_blank");
  };

  return (
    <Card className="max-w-2xl mb-6 animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <MessageCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Send WhatsApp Link</CardTitle>
            <CardDescription>Enter a number to generate a shareable WhatsApp appointment link.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wa-phone">Mobile number</Label>
          <Input
            id="wa-phone"
            type="tel"
            placeholder="+971..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={openLink} disabled={!waLink}>
            <Send className="h-4 w-4 mr-2" /> Open WhatsApp
          </Button>
          <Button variant="secondary" onClick={copyLink} disabled={!waLink}>
            <Link2 className="h-4 w-4 mr-2" /> Copy Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
