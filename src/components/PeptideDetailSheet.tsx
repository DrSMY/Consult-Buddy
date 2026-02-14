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
                      <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                )}

                {protocol.how_it_works && (
                  <Section icon={Activity} title="How It Works" content={protocol.how_it_works} />
                )}

                {protocol.best_use_for && (
                  <Section icon={BookOpen} title="Best Use For" content={protocol.best_use_for} />
                )}

                {protocol.target_benefits && (
                  <Section icon={Activity} title="Target Benefits" content={protocol.target_benefits} />
                )}

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                    Prescribing Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {protocol.dosage_instructions && <InfoItem label="Dosage" value={protocol.dosage_instructions} />}
                    {protocol.administration_route && <InfoItem label="Route" value={protocol.administration_route} />}
                    {protocol.strength_volume && <InfoItem label="Strength" value={protocol.strength_volume} />}
                    {protocol.treatment_duration && <InfoItem label="Duration" value={protocol.treatment_duration} />}
                  </div>
                </div>

                <Separator />

                {protocol.contraindications && (
                  <div className="rounded-lg p-3 bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                      <span className="font-medium text-xs uppercase tracking-wide text-destructive">
                        Contraindications
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{protocol.contraindications}</p>
                  </div>
                )}

                {protocol.common_side_effects && (
                  <InfoItem label="Common Side Effects" value={protocol.common_side_effects} />
                )}

                {protocol.key_blood_tests && (
                  <Section icon={TestTubes} title="Key Blood Tests" content={protocol.key_blood_tests} />
                )}

                {protocol.possible_combinations && (
                  <Section icon={Combine} title="Possible Combinations" content={protocol.possible_combinations} />
                )}

                {protocol.recommended_supplements && (
                  <Section icon={Pill} title="Recommended Supplements" content={protocol.recommended_supplements} />
                )}

                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 mt-4">
                  <h4 className="font-semibold text-xs mb-2 text-primary">💡 Talking Points for Patients</h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                    {protocol.how_it_works && (
                      <li>Explain mechanism: {protocol.how_it_works.split('.')[0]}.</li>
                    )}
                    {protocol.target_benefits && (
                      <li>Expected benefits: {protocol.target_benefits}</li>
                    )}
                    {protocol.treatment_duration && (
                      <li>Treatment timeline: {protocol.treatment_duration}</li>
                    )}
                    {protocol.common_side_effects && (
                      <li>Potential side effects to mention: {protocol.common_side_effects}</li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Section({ icon: Icon, title, content }: { icon: any; title: string; content: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium text-xs uppercase tracking-wide">{title}</span>
      </div>
      <p className="whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p>{value}</p>
    </div>
  );
}
