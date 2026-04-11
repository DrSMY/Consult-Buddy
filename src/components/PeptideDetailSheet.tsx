import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Activity, ShieldAlert, TestTubes, Combine, BookOpen, Pill, Loader2, Syringe,
} from "lucide-react";

interface Props {
  peptideName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Protocol {
  name: string;
  categories: string[] | null;
  how_it_works: string | null;
  target_benefits: string | null;
  best_use_for: string | null;
  dosage_instructions: string | null;
  administration_route: string | null;
  strength_volume: string | null;
  treatment_duration: string | null;
  contraindications: string | null;
  common_side_effects: string | null;
  key_blood_tests: string | null;
  recommended_supplements: string | null;
  possible_combinations: string | null;
}

export default function PeptideDetailSheet({ peptideName, open, onOpenChange }: Props) {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!peptideName || !open) return;
    setLoading(true);
    supabase
      .from("peptide_protocols")
      .select("*")
      .eq("name", peptideName)
      .maybeSingle()
      .then(({ data }) => {
        setProtocol(data as Protocol | null);
        setLoading(false);
      });
  }, [peptideName, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Syringe className="h-4 w-4 text-primary" />
            {peptideName || "Peptide Details"}
          </SheetTitle>
          <SheetDescription>Clinical reference for practitioner use</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="px-6 py-5 space-y-5 text-sm">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !protocol ? (
              <p className="text-muted-foreground text-center py-12">
                No protocol data found for this peptide.
              </p>
            ) : (
              <>
                {protocol.categories && protocol.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {protocol.categories.map((c, i) => (
                      <Badge key={i} className="text-xs bg-primary/15 text-primary border-primary/25 hover:bg-primary/20">{c}</Badge>
                    ))}
                  </div>
                )}

                {/* Talking Points — at the top for quick patient communication */}
                <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-4">
                  <h4 className="font-semibold text-sm mb-3 text-primary flex items-center gap-2">
                    💡 Talking Points for Patients
                  </h4>
                  <ul className="space-y-2.5 text-sm">
                    {protocol.how_it_works && (
                      <TalkingPoint label="Mechanism" text={`${protocol.how_it_works.split('.')[0]}.`} />
                    )}
                    {protocol.target_benefits && (
                      <TalkingPoint label="Benefits" text={protocol.target_benefits} />
                    )}
                    {protocol.treatment_duration && (
                      <TalkingPoint label="Timeline" text={protocol.treatment_duration} />
                    )}
                    {protocol.common_side_effects && (
                      <TalkingPoint label="Side Effects" text={protocol.common_side_effects} />
                    )}
                  </ul>
                </div>

                {protocol.how_it_works && (
                  <Section icon={Activity} title="How It Works" content={protocol.how_it_works} variant="teal" />
                )}

                {protocol.best_use_for && (
                  <Section icon={BookOpen} title="Best Use For" content={protocol.best_use_for} variant="amber" />
                )}

                {protocol.target_benefits && (
                  <Section icon={Activity} title="Target Benefits" content={protocol.target_benefits} variant="emerald" />
                )}

                <div className="space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <span className="h-px flex-1 bg-border" />
                    Prescribing Information
                    <span className="h-px flex-1 bg-border" />
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {protocol.dosage_instructions && <InfoCard label="Dosage" value={protocol.dosage_instructions} color="bg-accent/50" />}
                    {protocol.administration_route && <InfoCard label="Route" value={protocol.administration_route} color="bg-secondary/60" />}
                    {protocol.strength_volume && <InfoCard label="Strength" value={protocol.strength_volume} color="bg-primary/5" />}
                    {protocol.treatment_duration && <InfoCard label="Duration" value={protocol.treatment_duration} color="bg-muted" />}
                  </div>
                </div>

                {protocol.contraindications && (
                  <div className="rounded-xl p-4 bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/20">
                        <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                      </div>
                      <span className="font-semibold text-xs uppercase tracking-wide text-destructive">
                        Contraindications
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-destructive/80">{protocol.contraindications}</p>
                  </div>
                )}

                {protocol.common_side_effects && (
                  <Section icon={ShieldAlert} title="Common Side Effects" content={protocol.common_side_effects} variant="rose" />
                )}

                {protocol.key_blood_tests && (
                  <Section icon={TestTubes} title="Key Blood Tests" content={protocol.key_blood_tests} variant="violet" />
                )}

                {protocol.possible_combinations && (
                  <Section icon={Combine} title="Possible Combinations" content={protocol.possible_combinations} variant="sky" />
                )}

                {protocol.recommended_supplements && (
                  <Section icon={Pill} title="Recommended Supplements" content={protocol.recommended_supplements} variant="amber" />
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
      <p className="text-sm mt-1 font-medium leading-snug">{value}</p>
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
