import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, ShieldAlert, BookOpen, Pill, Loader2, Syringe, Clock, Snowflake,
  Calendar, Sparkles, FlaskConical,
} from "lucide-react";

interface Props {
  medicationName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Medication {
  name: string;
  category: string | null;
  mechanism_of_action: string | null;
  indications_uae: string | null;
  administration: string | null;
  available_doses: string | null;
  how_it_works_patient: string | null;
  how_to_use: string | null;
  missed_dose: string | null;
  storage_handling: string | null;
  what_to_expect: string | null;
  common_side_effects: string | null;
  contraindications: string | null;
  scientific_information: string | null;
  key_advantages: string | null;
}

export default function MedicationDetailSheet({ medicationName, open, onOpenChange }: Props) {
  const [med, setMed] = useState<Medication | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!medicationName || !open) return;
    setLoading(true);
    setMed(null);
    supabase
      .from("weight_loss_medications")
      .select("*")
      .eq("name", medicationName)
      .maybeSingle()
      .then(({ data }) => {
        setMed(data as Medication | null);
        setLoading(false);
      });
  }, [medicationName, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Syringe className="h-4 w-4 text-primary" />
            {medicationName || "Medication Details"}
          </SheetTitle>
          <SheetDescription>
            DarDoc GLP-1 Therapy Protocol — clinician reference
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="px-6 py-5 space-y-5 text-sm">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !med ? (
              <p className="text-muted-foreground text-center py-12">
                No reference data found for this medication.
              </p>
            ) : (
              <>
                {med.category && (
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className="text-xs bg-primary/15 text-primary border-primary/25 hover:bg-primary/20">
                      {med.category}
                    </Badge>
                  </div>
                )}

                {/* Talking Points — quick patient communication */}
                <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-4">
                  <h4 className="font-semibold text-sm mb-3 text-primary flex items-center gap-2">
                    💡 Talking Points for Patients
                  </h4>
                  <ul className="space-y-2.5 text-sm">
                    {med.mechanism_of_action && (
                      <TalkingPoint label="Mechanism" text={med.mechanism_of_action.split('.')[0] + '.'} />
                    )}
                    {med.administration && <TalkingPoint label="How given" text={med.administration} />}
                    {med.what_to_expect && (
                      <TalkingPoint label="Timeline" text={med.what_to_expect.split('\n')[0]} />
                    )}
                    {med.common_side_effects && (
                      <TalkingPoint label="Side Effects" text={med.common_side_effects} />
                    )}
                  </ul>
                </div>

                {/* Prescribing Info Grid */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <span className="h-px flex-1 bg-border" />
                    Prescribing Information
                    <span className="h-px flex-1 bg-border" />
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {med.available_doses && <InfoCard label="Available Doses" value={med.available_doses} color="bg-accent/50" />}
                    {med.administration && <InfoCard label="Administration" value={med.administration} color="bg-secondary/60" />}
                  </div>
                </div>

                {med.key_advantages && (
                  <Section icon={Sparkles} title="Key Advantages" content={med.key_advantages} variant="emerald" />
                )}

                {med.mechanism_of_action && (
                  <Section icon={Activity} title="Mechanism of Action" content={med.mechanism_of_action} variant="teal" />
                )}

                {med.indications_uae && (
                  <Section icon={BookOpen} title="Indications (UAE)" content={med.indications_uae} variant="amber" />
                )}

                {med.how_it_works_patient && (
                  <Section icon={Activity} title="How It Works (Patient-friendly)" content={med.how_it_works_patient} variant="sky" />
                )}

                {med.how_to_use && (
                  <Section icon={Pill} title="How to Use" content={med.how_to_use} variant="violet" />
                )}

                {med.missed_dose && (
                  <Section icon={Clock} title="Missed Dose" content={med.missed_dose} variant="amber" />
                )}

                {med.storage_handling && (
                  <Section icon={Snowflake} title="Storage & Handling" content={med.storage_handling} variant="sky" />
                )}

                {med.what_to_expect && (
                  <Section icon={Calendar} title="What to Expect" content={med.what_to_expect} variant="emerald" />
                )}

                {med.common_side_effects && (
                  <Section icon={ShieldAlert} title="Common Side Effects" content={med.common_side_effects} variant="rose" />
                )}

                {med.contraindications && (
                  <div className="rounded-xl p-4 bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20 shadow-[0_4px_16px_-2px_hsl(0_80%_50%/0.12)] border-l-[3px] border-l-destructive/50">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/15">
                        <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                      </div>
                      <span className="font-semibold text-xs uppercase tracking-wider text-destructive">
                        Contraindications
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-destructive/80 pl-[38px]">{med.contraindications}</p>
                  </div>
                )}

                {med.scientific_information && (
                  <Section icon={FlaskConical} title="Scientific Information" content={med.scientific_information} variant="violet" />
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

const variantStyles: Record<string, { card: string; iconBg: string; iconText: string; shadow: string; accent: string }> = {
  teal: {
    card: "bg-gradient-to-br from-[hsl(var(--panel-teal)/0.08)] to-[hsl(var(--panel-teal)/0.03)] border-[hsl(var(--panel-teal)/0.2)]",
    iconBg: "bg-[hsl(var(--panel-teal)/0.15)]",
    iconText: "text-[hsl(var(--panel-teal))]",
    shadow: "shadow-[0_4px_16px_-2px_hsl(var(--panel-teal)/0.15)]",
    accent: "border-l-[3px] border-l-[hsl(var(--panel-teal)/0.6)]",
  },
  amber: {
    card: "bg-gradient-to-br from-[hsl(var(--panel-amber)/0.08)] to-[hsl(var(--panel-amber)/0.03)] border-[hsl(var(--panel-amber)/0.2)]",
    iconBg: "bg-[hsl(var(--panel-amber)/0.15)]",
    iconText: "text-[hsl(var(--panel-amber))]",
    shadow: "shadow-[0_4px_16px_-2px_hsl(var(--panel-amber)/0.15)]",
    accent: "border-l-[3px] border-l-[hsl(var(--panel-amber)/0.6)]",
  },
  emerald: {
    card: "bg-gradient-to-br from-[hsl(var(--panel-emerald)/0.08)] to-[hsl(var(--panel-emerald)/0.03)] border-[hsl(var(--panel-emerald)/0.2)]",
    iconBg: "bg-[hsl(var(--panel-emerald)/0.15)]",
    iconText: "text-[hsl(var(--panel-emerald))]",
    shadow: "shadow-[0_4px_16px_-2px_hsl(var(--panel-emerald)/0.15)]",
    accent: "border-l-[3px] border-l-[hsl(var(--panel-emerald)/0.6)]",
  },
  rose: {
    card: "bg-gradient-to-br from-[hsl(var(--panel-rose)/0.08)] to-[hsl(var(--panel-rose)/0.03)] border-[hsl(var(--panel-rose)/0.2)]",
    iconBg: "bg-[hsl(var(--panel-rose)/0.15)]",
    iconText: "text-[hsl(var(--panel-rose))]",
    shadow: "shadow-[0_4px_16px_-2px_hsl(var(--panel-rose)/0.15)]",
    accent: "border-l-[3px] border-l-[hsl(var(--panel-rose)/0.6)]",
  },
  violet: {
    card: "bg-gradient-to-br from-[hsl(var(--panel-violet)/0.08)] to-[hsl(var(--panel-violet)/0.03)] border-[hsl(var(--panel-violet)/0.2)]",
    iconBg: "bg-[hsl(var(--panel-violet)/0.15)]",
    iconText: "text-[hsl(var(--panel-violet))]",
    shadow: "shadow-[0_4px_16px_-2px_hsl(var(--panel-violet)/0.15)]",
    accent: "border-l-[3px] border-l-[hsl(var(--panel-violet)/0.6)]",
  },
  sky: {
    card: "bg-gradient-to-br from-[hsl(var(--panel-sky)/0.08)] to-[hsl(var(--panel-sky)/0.03)] border-[hsl(var(--panel-sky)/0.2)]",
    iconBg: "bg-[hsl(var(--panel-sky)/0.15)]",
    iconText: "text-[hsl(var(--panel-sky))]",
    shadow: "shadow-[0_4px_16px_-2px_hsl(var(--panel-sky)/0.15)]",
    accent: "border-l-[3px] border-l-[hsl(var(--panel-sky)/0.6)]",
  },
};

function Section({ icon: Icon, title, content, variant = "teal" }: { icon: any; title: string; content: string; variant?: string }) {
  const s = variantStyles[variant] || variantStyles.teal;
  return (
    <div className={`rounded-xl border p-4 transition-all hover:scale-[1.01] ${s.card} ${s.shadow} ${s.accent}`}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${s.iconText}`} />
        </div>
        <span className={`font-semibold text-xs uppercase tracking-wider ${s.iconText}`}>{title}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed pl-[38px]">{content}</p>
    </div>
  );
}

function InfoCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-xl p-3.5 border border-border/50 shadow-sm hover:shadow-md transition-shadow ${color}`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <p className="text-sm mt-1 font-medium leading-snug whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function TalkingPoint({ label, text }: { label: string; text: string }) {
  return (
    <li className="flex items-start gap-2 list-none">
      <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px] font-semibold border-primary/30 text-primary">
        {label}
      </Badge>
      <span className="text-muted-foreground text-xs leading-relaxed">{text}</span>
    </li>
  );
}
