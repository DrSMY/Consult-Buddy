import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Hourglass, Phone, ArrowRight, Trash2, FlaskConical, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getConsultationMobile, deleteDraftConsultation } from "@/utils/consultationDraft";

interface DraftRow {
  id: string;
  patient_name: string;
  program: string;
  updated_at: string;
  created_at: string;
  intake_answers: any;
}

export default function IncompleteIntakesList() {
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("consultations")
      .select("id, patient_name, program, updated_at, created_at, intake_answers")
      .eq("status", "incomplete")
      .order("updated_at", { ascending: false })
      .limit(50);
    setRows((data as DraftRow[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const resume = (r: DraftRow) => {
    const path = r.program === "weight-loss" ? "/program/weight-loss" : "/program/peptides";
    navigate(`${path}?draft=${r.id}`);
  };

  const remove = async (r: DraftRow) => {
    if (!confirm(`Delete incomplete intake for ${r.patient_name || "this patient"}?`)) return;
    await deleteDraftConsultation(r.id);
    toast({ title: "Draft deleted" });
    load();
  };

  return (
    <Card className="mb-6 sm:mb-8 border-amber-200/60 dark:border-amber-700/40">
      <CardHeader className="pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Hourglass className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
          </div>
          Incomplete Intakes
          {rows && rows.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">{rows.length}</Badge>
          )}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Patients registered (name + mobile) but not yet submitted. Resume to continue.
        </p>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        {rows === null ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            No incomplete intakes — every patient who started has been submitted.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const mobile = getConsultationMobile(r);
              const Icon = r.program === "weight-loss" ? Scale : FlaskConical;
              return (
                <li key={r.id} className="py-2.5 flex items-center gap-2 sm:gap-3">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">
                        {r.patient_name || "Unnamed patient"}
                      </p>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {r.program === "weight-loss" ? "Weight Loss" : "Peptides"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                      {mobile && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {mobile}
                        </span>
                      )}
                      <span>Updated {new Date(r.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="default" className="h-8 px-2 sm:px-3" onClick={() => resume(r)}>
                    Resume <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(r)}
                    title="Delete draft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
