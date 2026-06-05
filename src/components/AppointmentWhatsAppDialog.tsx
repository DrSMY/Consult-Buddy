import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, MessageCircle } from "lucide-react";
import { openWhatsApp } from "@/utils/whatsapp";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  patientName: string;
  phone: string;
  appointmentId: string;
}

type TemplateKey = "confirm_full" | "confirm_short" | "received_full" | "received_short";

const buildTemplates = (name: string, intakeLink: string): Record<TemplateKey, { label: string; text: string }> => {
  const hi = `Hi ${name || "there"},`;
  return {
    confirm_full: {
      label: "Appointment Confirmation (Full)",
      text: `📅 Your Consultation Appointment is Confirmed

${hi}

Thank you for booking your consultation.

To ensure a smooth and efficient appointment, we kindly request that you complete your patient profile and intake form before your scheduled consultation. This allows your doctor to review your information in advance and provide the best possible care during your appointment.

The intake form will only take a few minutes to complete and includes basic information such as your age, height, weight, and relevant health details.

👉 Please complete your intake form using the link below:
🔗 ${intakeLink}

Completing your information before your appointment helps avoid delays and ensures your consultation can begin on time.

We look forward to assisting you on your health journey.`,
    },
    confirm_short: {
      label: "Appointment Confirmation (Short)",
      text: `Appointment Confirmed ✅

${hi}
To help your doctor prepare for your consultation and ensure your appointment starts on time, please complete your patient intake form using the link below:

🔗 ${intakeLink}

Thank you for your cooperation.`,
    },
    received_full: {
      label: "Intake Received (Full)",
      text: `✅ Thank You – Your Information Has Been Received

${hi}

Thank you for completing your intake form.

Your information has been successfully submitted and is now available for your doctor to review prior to your consultation.

📞 Your appointment will commence on time, and the doctor will contact you directly for your scheduled consultation.

If you need to update any information before your appointment, please contact our team as soon as possible.

We look forward to speaking with you and supporting your healthcare journey.`,
    },
    received_short: {
      label: "Intake Received (Short)",
      text: `Intake Received ✅

${hi}
Thank you for completing your intake form. Your information has been received and reviewed.

📞 Your appointment will commence on time, and the doctor will call you directly for your consultation.

We look forward to assisting you.`,
    },
  };
};

export default function AppointmentWhatsAppDialog({ open, onOpenChange, patientName, phone, appointmentId }: Props) {
  const intakeLink = `${window.location.origin}/book?ref=${appointmentId}`;
  const templates = useMemo(() => buildTemplates(patientName, intakeLink), [patientName, intakeLink]);
  const [active, setActive] = useState<TemplateKey>("confirm_full");
  const [text, setText] = useState(templates.confirm_full.text);

  const pick = (k: TemplateKey) => {
    setActive(k);
    setText(templates[k].text);
  };

  const send = () => {
    openWhatsApp(phone, text);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) { setActive("confirm_full"); setText(templates.confirm_full.text); } onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            Send WhatsApp — {patientName}
          </DialogTitle>
          <DialogDescription>Pick a template, edit if needed, then send via WhatsApp ({phone || "no number"}).</DialogDescription>
        </DialogHeader>

        <Tabs value={active} onValueChange={(v) => pick(v as TemplateKey)}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="confirm_full" className="text-xs">Confirm</TabsTrigger>
            <TabsTrigger value="confirm_short" className="text-xs">Confirm (short)</TabsTrigger>
            <TabsTrigger value="received_full" className="text-xs">Received</TabsTrigger>
            <TabsTrigger value="received_short" className="text-xs">Received (short)</TabsTrigger>
          </TabsList>
          <TabsContent value={active} className="mt-3">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[280px] text-sm" />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={!phone || !text.trim()}>
            <Send className="h-4 w-4 mr-2" /> Send via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
