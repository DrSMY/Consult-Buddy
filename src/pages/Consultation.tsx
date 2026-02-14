import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Activity, ArrowLeft, AlertTriangle, CheckCircle, FileText, ClipboardList, User, Copy, Loader2, FlaskConical, Info } from "lucide-react";
import PeptideDetailSheet from "@/components/PeptideDetailSheet";

interface PeptideRec {
  name: string;
  rationale: string;
  dosage: string;
  duration: string;
  administration: string;
  priority: string;
  required_blood_tests?: string[];
}

interface Recommendation {
  recommended_peptides: PeptideRec[];
  safety_flags: Array<{
    concern: string;
    severity: string;
    recommendation: string;
  }>;
  required_blood_tests: string[];
  recommended_supplements: Array<{
    name: string;
    dosage: string;
    reason: string;
  }>;
  doctor_note: string;
  next_steps: string;
  patient_guidelines: string;
  clinical_summary: string;
}

export default function Consultation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [consultation, setConsultation] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedPeptides, setSelectedPeptides] = useState<Set<string>>(new Set());
  const [selectedSupplements, setSelectedSupplements] = useState<Set<string>>(new Set());
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);
  const [detailPeptide, setDetailPeptide] = useState<string | null>(null);

  useEffect(() => {
    loadConsultation();
  }, [id]);

  const loadConsultation = async () => {
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast({ title: "Consultation not found", variant: "destructive" });
      navigate("/dashboard");
      return;
    }
    setConsultation(data);
    if (data.ai_recommendations) {
      const rec = data.ai_recommendations as unknown as Recommendation;
      setRecommendations(rec);
      // If already completed with a selection, mark confirmed
      if (data.status === "completed") {
        setSelectionConfirmed(true);
        const selected = new Set<string>(rec.recommended_peptides.map((p) => p.name));
        setSelectedPeptides(selected);
        const selectedSupps = new Set<string>(rec.recommended_supplements.map((s) => s.name));
        setSelectedSupplements(selectedSupps);
      }
    } else {
      runAIAnalysis(data);
    }
    setLoading(false);
  };

  const runAIAnalysis = async (consultData: any) => {
    setAnalyzing(true);
    try {
      const { data: protocols } = await supabase.from("peptide_protocols").select("*");

      const response = await supabase.functions.invoke("consultation", {
        body: {
          intake_answers: consultData.intake_answers,
          peptide_protocols: protocols,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const rec = response.data as Recommendation;
      setRecommendations(rec);

      // Pre-select primary peptides and all supplements
      const primary = new Set<string>(
        rec.recommended_peptides.filter((p) => p.priority === "Primary").map((p) => p.name)
      );
      setSelectedPeptides(primary);
      setSelectedSupplements(new Set(rec.recommended_supplements.map((s) => s.name)));

      // Save raw AI recommendations (not yet completed - doctor needs to confirm)
      await supabase
        .from("consultations")
        .update({
          ai_recommendations: rec as any,
          status: "review",
        })
        .eq("id", consultData.id);
    } catch (e: any) {
      toast({ title: "AI Analysis Failed", description: e.message, variant: "destructive" });
    }
    setAnalyzing(false);
  };

  const togglePeptide = (name: string) => {
    setSelectedPeptides((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSupplement = (name: string) => {
    setSelectedSupplements((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Derive lab tests from selected peptides
  const derivedLabTests = useMemo(() => {
    if (!recommendations) return [];
    const tests = new Set<string>();
    recommendations.recommended_peptides
      .filter((p) => selectedPeptides.has(p.name))
      .forEach((p) => {
        (p.required_blood_tests || []).forEach((t) => tests.add(t));
      });
    // Fallback: if no per-peptide tests, use the global list
    if (tests.size === 0 && selectedPeptides.size > 0) {
      recommendations.required_blood_tests.forEach((t) => tests.add(t));
    }
    return Array.from(tests).sort();
  }, [recommendations, selectedPeptides]);

  const confirmSelection = async () => {
    if (selectedPeptides.size === 0) {
      toast({ title: "Select at least one peptide", variant: "destructive" });
      return;
    }

    const selectedRecs = recommendations!.recommended_peptides.filter((p) =>
      selectedPeptides.has(p.name)
    );
    const selectedSupps = recommendations!.recommended_supplements.filter((s) =>
      selectedSupplements.has(s.name)
    );

    // Save confirmed selection
    const updatedRec: Recommendation = {
      ...recommendations!,
      recommended_peptides: selectedRecs,
      recommended_supplements: selectedSupps,
      required_blood_tests: derivedLabTests,
    };

    await supabase
      .from("consultations")
      .update({
        ai_recommendations: updatedRec as any,
        doctor_notes: recommendations!.doctor_note,
        next_steps: recommendations!.next_steps,
        patient_guidelines: recommendations!.patient_guidelines,
        status: "completed",
      })
      .eq("id", id);

    setRecommendations(updatedRec);
    setSelectionConfirmed(true);
    toast({ title: "Selection confirmed and saved" });
  };

  const handleEditSelection = async () => {
    // Revert status to review so doctor can re-select
    await supabase
      .from("consultations")
      .update({ status: "review" })
      .eq("id", id);

    // Re-fetch to get original AI recs and unlock UI
    const { data } = await supabase
      .from("consultations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (data?.ai_recommendations) {
      const rec = data.ai_recommendations as unknown as Recommendation;
      setRecommendations(rec);
      setConsultation(data);
      // Pre-select all current peptides/supplements for editing
      setSelectedPeptides(new Set(rec.recommended_peptides.map((p) => p.name)));
      setSelectedSupplements(new Set(rec.recommended_supplements.map((s) => s.name)));
    }
    setSelectionConfirmed(false);
    toast({ title: "Selection unlocked for editing" });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate">{consultation?.patient_name}</h1>
            <p className="text-xs text-muted-foreground">Peptide Consultation</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={consultation?.status === "completed" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
              {consultation?.status}
            </Badge>
            {selectionConfirmed && (
              <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3" onClick={handleEditSelection}>
                Edit
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-6">
        {analyzing && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Analyzing patient data...</p>
                <p className="text-sm text-muted-foreground">
                  AI is reviewing intake answers against peptide protocols
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {recommendations && (
          <Tabs defaultValue="recommendations" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="recommendations" className="text-xs sm:text-sm">
                {selectionConfirmed ? "Prescriptions" : "Medications"}
              </TabsTrigger>
              <TabsTrigger value="doctor-note" disabled={!selectionConfirmed} className="text-xs sm:text-sm">Doctor Note</TabsTrigger>
              <TabsTrigger value="next-steps" disabled={!selectionConfirmed} className="text-xs sm:text-sm">Next Steps</TabsTrigger>
              <TabsTrigger value="guidelines" disabled={!selectionConfirmed} className="text-xs sm:text-sm">Patient Guide</TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="space-y-4">
              {/* Clinical Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" /> Clinical Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{recommendations.clinical_summary}</p>
                </CardContent>
              </Card>

              {/* Safety Flags */}
              {recommendations.safety_flags.length > 0 && (
                <Card className="border-destructive/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" /> Safety Considerations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.safety_flags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Badge
                          variant={flag.severity === "high" ? "destructive" : "secondary"}
                          className="mt-0.5 text-[10px]"
                        >
                          {flag.severity}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{flag.concern}</p>
                          <p className="text-xs text-muted-foreground">{flag.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Peptide Selection / Confirmed List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    {selectionConfirmed ? "Prescribed Peptides" : "Select Peptides to Prescribe"}
                  </CardTitle>
                  {!selectionConfirmed && (
                    <CardDescription>
                      Check the peptides you want to prescribe. Lab tests will update based on your selection.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {recommendations.recommended_peptides.map((p, i) => (
                    <div
                      key={i}
                      className={`border rounded-lg p-4 space-y-2 transition-colors ${
                        !selectionConfirmed && selectedPeptides.has(p.name)
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {!selectionConfirmed && (
                          <Checkbox
                            checked={selectedPeptides.has(p.name)}
                            onCheckedChange={() => togglePeptide(p.name)}
                          />
                        )}
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{p.name}</h4>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDetailPeptide(p.name); }}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 hover:border-primary/50 transition-colors"
                              title="View clinical details"
                            >
                              <Info className="h-3 w-3" />
                              Details
                            </button>
                          </div>
                          <Badge variant={p.priority === "Primary" ? "default" : "secondary"}>
                            {p.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{p.rationale}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div><span className="font-medium">Dosage:</span> {p.dosage}</div>
                        <div><span className="font-medium">Duration:</span> {p.duration}</div>
                        <div><span className="font-medium">Route:</span> {p.administration}</div>
                      </div>
                      {!selectionConfirmed && p.required_blood_tests && p.required_blood_tests.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {p.required_blood_tests.map((t, j) => (
                            <Badge key={j} variant="outline" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {!selectionConfirmed && (
                    <Button onClick={confirmSelection} className="w-full" size="lg">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Selection ({selectedPeptides.size} peptide{selectedPeptides.size !== 1 ? "s" : ""})
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Dynamic Lab Tests */}
              {derivedLabTests.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FlaskConical className="h-4 w-4" />
                      {selectionConfirmed ? "Required Lab Tests" : "Lab Tests (based on selection)"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {derivedLabTests.map((t, i) => (
                        <Badge key={i} variant="outline">{t}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Supplements Selection */}
              {recommendations.recommended_supplements.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      {selectionConfirmed ? "Selected Supplements" : "Select Supplements"}
                    </CardTitle>
                    {!selectionConfirmed && (
                      <CardDescription>Choose which supplements to include in the plan.</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.recommended_supplements.map((s, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 text-sm rounded-lg border p-3 transition-colors ${
                            !selectionConfirmed && selectedSupplements.has(s.name)
                              ? "border-primary bg-primary/5"
                              : ""
                          }`}
                        >
                          {!selectionConfirmed && (
                            <Checkbox
                              checked={selectedSupplements.has(s.name)}
                              onCheckedChange={() => toggleSupplement(s.name)}
                              className="mt-0.5"
                            />
                          )}
                          <div>
                            <span className="font-medium">{s.name}</span>
                            <span className="text-muted-foreground"> — {s.dosage}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="doctor-note">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Doctor Note
                    </CardTitle>
                    <CardDescription>Clinical consultation summary</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(recommendations.doctor_note, "Doctor note")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4">
                    {recommendations.doctor_note}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="next-steps">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" /> Next Steps
                    </CardTitle>
                    <CardDescription>Follow-up schedule and monitoring plan</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(recommendations.next_steps, "Next steps")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4">
                    {recommendations.next_steps}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="guidelines">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4" /> Patient Guidelines
                    </CardTitle>
                    <CardDescription>Patient-friendly instructions</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(recommendations.patient_guidelines, "Patient guidelines")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4">
                    {recommendations.patient_guidelines}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <PeptideDetailSheet
          peptideName={detailPeptide}
          open={!!detailPeptide}
          onOpenChange={(open) => !open && setDetailPeptide(null)}
        />
      </main>
    </div>
  );
}
