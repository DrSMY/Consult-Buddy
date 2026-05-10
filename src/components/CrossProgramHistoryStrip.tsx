import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";
import {
  groupConsultationsByPatient,
  normalizeMobile,
  programLabel,
  type ConsultationLike,
} from "@/utils/patientIdentity";

type Props = {
  /** Mobile of the current patient (any format). */
  mobile: string;
  /** Current consultation ID — excluded from the strip. */
  currentId?: string;
};

/**
 * Compact horizontal chip strip listing all prior visits across programs
 * for the same patient (matched by normalized mobile). Hidden when there
 * are no other visits.
 */
export default function CrossProgramHistoryStrip({ mobile, currentId }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ConsultationLike[]>([]);

  useEffect(() => {
    const key = normalizeMobile(mobile);
    if (!key) {
      setItems([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("consultations")
      .select("id, patient_name, program, status, created_at, intake_answers")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const groups = groupConsultationsByPatient((data || []) as ConsultationLike[]);
        const match = groups.find((g) => g.mobileKey === key);
        const list = (match?.consultations || []).filter((c) => c.id !== currentId);
        setItems(list);
      });
    return () => {
      cancelled = true;
    };
  }, [mobile, currentId]);

  if (items.length === 0) return null;

  return (
    <Card className="border-dashed">
      <CardContent className="py-3">
        <div className="flex items-center gap-2 mb-2">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">
            Patient history across programs
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {items.map((c) => {
            const target =
              c.program === "weight-loss"
                ? `/weight-loss/consultation/${c.id}`
                : `/consultation/${c.id}`;
            return (
              <button
                key={c.id}
                onClick={() => navigate(target)}
                className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px] hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  {programLabel(c.program)}
                </Badge>
                <span>{new Date(c.created_at).toLocaleDateString()}</span>
                <span className="text-muted-foreground">· {c.status}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
