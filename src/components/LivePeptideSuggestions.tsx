import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Sparkles, Loader2 } from "lucide-react";
import PeptideDetailSheet from "@/components/PeptideDetailSheet";
import { getProtocolOptions } from "@/data/peptideProtocolOptions";

interface PeptideMatch {
  name: string;
  priority: string;
  categories: string[] | null;
  best_use_for: string | null;
}

interface Props {
  healthGoals: string[];
}

export default function LivePeptideSuggestions({ healthGoals }: Props) {
  const [matches, setMatches] = useState<PeptideMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailPeptide, setDetailPeptide] = useState<string | null>(null);

  useEffect(() => {
    if (healthGoals.length === 0) {
      setMatches([]);
      return;
    }

    const fetchMatches = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("peptide_program_matrix")
        .select("health_goal, priority, peptide_protocol_id, peptide_protocols(name, categories, best_use_for)")
        .in("health_goal", healthGoals);

      if (data) {
        const seen = new Set<string>();
        const results: PeptideMatch[] = [];
        for (const row of data) {
          const protocol = (row as any).peptide_protocols;
          if (protocol && !seen.has(protocol.name)) {
            seen.add(protocol.name);
            results.push({
              name: protocol.name,
              priority: row.priority,
              categories: protocol.categories,
              best_use_for: protocol.best_use_for,
            });
          }
        }
        // Sort: Primary first
        results.sort((a, b) => (a.priority === "Primary" ? -1 : 1) - (b.priority === "Primary" ? -1 : 1));
        setMatches(results);
      }
      setLoading(false);
    };

    fetchMatches();
  }, [healthGoals.join(",")]);

  if (healthGoals.length === 0) return null;

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Suggested Peptides
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Finding matches...</span>
            </div>
          ) : matches.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">No matching peptides for selected goals.</p>
          ) : (
            <div className="space-y-1.5">
              {matches.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between gap-2 rounded-lg bg-background/60 border border-border/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{m.name}</span>
                    <Badge
                      variant={m.priority === "Primary" ? "default" : "secondary"}
                      className="text-[9px] px-1.5 py-0 shrink-0"
                    >
                      {m.priority}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailPeptide(m.name)}
                    className="inline-flex items-center justify-center rounded-full h-6 w-6 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                    title={`View ${m.name} details`}
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground mt-1">
                Based on selected health goals • Tap ⓘ for full protocol details
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <PeptideDetailSheet
        peptideName={detailPeptide}
        open={!!detailPeptide}
        onOpenChange={(open) => !open && setDetailPeptide(null)}
      />
    </>
  );
}
