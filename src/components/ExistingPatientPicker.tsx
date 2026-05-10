import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ArrowRight, User, ArrowLeft, AlertTriangle } from "lucide-react";
import {
  groupConsultationsByPatient,
  programLabel,
  type ConsultationLike,
  type PatientGroup,
} from "@/utils/patientIdentity";

type Props = {
  /** Program the clinician is starting now — for the small "starting Peptides / Weight Loss" hint. */
  targetProgram: string;
  onSelect: (group: PatientGroup) => void;
  onBack?: () => void;
  /** Heading shown above the picker. */
  title?: string;
  subtitle?: string;
};

export default function ExistingPatientPicker({
  targetProgram,
  onSelect,
  onBack,
  title = "Existing Patient",
  subtitle = "Pick a patient who already has a record in any program.",
}: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<ConsultationLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("consultations")
      .select("id, patient_name, program, status, created_at, updated_at, intake_answers")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data || []) as ConsultationLike[]);
        setLoading(false);
      });
  }, [user]);

  const groups = useMemo(() => groupConsultationsByPatient(rows), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    const digits = q.replace(/\D/g, "");
    return groups.filter((g) => {
      if (g.displayName.toLowerCase().includes(q)) return true;
      if (digits.length >= 3 && g.mobileKey.includes(digits)) return true;
      return false;
    });
  }, [groups, search]);

  return (
    <div className="min-h-screen gradient-surface">
      <main className="container mx-auto max-w-3xl px-4 py-8 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Starting <span className="font-semibold">{programLabel(targetProgram)}</span> — demographics & history
            will be carried over; the treatment plan starts fresh.
          </p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No matching patients found</p>
              <p className="text-sm mt-1">
                {search ? "Try a different name or number." : "No patients with a saved mobile number yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((g) => (
              <Card
                key={g.mobileKey}
                className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
                onClick={() => onSelect(g)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{g.displayName}</h3>
                      {g.programs.map((p) => (
                        <Badge key={p} variant="secondary" className="text-[10px]">
                          {programLabel(p)}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {g.mobileDisplay && <span>{g.mobileDisplay}</span>}
                      <span>•</span>
                      <span>Last visit {new Date(g.lastVisit).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>
                        {g.consultations.length} visit{g.consultations.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {onBack && (
          <div className="mt-6">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
