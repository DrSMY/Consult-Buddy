import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, FileText, ClipboardList, User, Copy, Loader2, FlaskConical, Info, ShieldCheck, Microscope, StickyNote } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PeptideDetailSheet from "@/components/PeptideDetailSheet";
import AppHeader from "@/components/AppHeader";

interface PeptideRec {
  name: string;
  rationale: string;
  dosage: string;
  duration: string;
  administration: string;
  priority: string;
  required_blood_tests?: string[];
  mandatory_blood_tests?: string[];
  recommended_blood_tests?: string[];
}

interface Recommendation {
  recommended_peptides: PeptideRec[];
  safety_flags: Array<{ concern: string; severity: string; recommendation: string }>;
  required_blood_tests: string[];
  recommended_blood_tests?: string[];
  recommended_supplements: Array<{ name: string; dosage: string; reason: string }>;
  doctor_note: string;
  next_steps: string;
  patient_guidelines: string;
  clinical_summary: string;
}

type LabTier = "basic" | "advanced";

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
  const [labTier, setLabTier] = useState<LabTier>("basic");
  const [labNotes, setLabNotes] = useState("");

  useEffect(() => {
    loadConsultation();
  }, [id]);

  const loadConsultation = async () => {
    const { data, error } = await supabase.from("consultations").select("*").eq("id", id).single();
    if (error || !data) {
      toast({ title: "Consultation not found", variant: "destructive" });
      navigate("/dashboard");
      return;
    }
    setConsultation(data);
    if (data.ai_recommendations) {
      const rec = data.ai_recommendations as unknown as Recommendation;
      setRecommendations(rec);
      // Restore saved lab tier & notes
      const saved = data.ai_recommendations as any;
      if (saved.selected_lab_tier) setLabTier(saved.selected_lab_tier);
      if (saved.lab_notes) setLabNotes(saved.lab_notes);
      if (data.status === "completed") {
        setSelectionConfirmed(true);
        setSelectedPeptides(new Set(rec.recommended_peptides.map((p) => p.name)));
        setSelectedSupplements(new Set(rec.recommended_supplements.map((s) => s.name)));
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
        body: { intake_answers: consultData.intake_answers, peptide_protocols: protocols },
      });
      if (response.error) throw new Error(response.error.message);
      const rec = response.data as Recommendation;
      setRecommendations(rec);
      const primary = new Set<string>(rec.recommended_peptides.filter((p) => p.priority === "Primary").map((p) => p.name));
      setSelectedPeptides(primary);
      setSelectedSupplements(new Set(rec.recommended_supplements.map((s) => s.name)));
      await supabase.from("consultations").update({ ai_recommendations: rec as any, status: "review" }).eq("id", consultData.id);
    } catch (e: any) {
      toast({ title: "AI Analysis Failed", description: e.message, variant: "destructive" });
    }
    setAnalyzing(false);
  };

  const togglePeptide = (name: string) => {
    setSelectedPeptides((prev) => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  };
  const toggleSupplement = (name: string) => {
    setSelectedSupplements((prev) => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  };

  const getMandatoryTests = (p: PeptideRec) => p.mandatory_blood_tests || [];
  const getRecommendedTests = (p: PeptideRec) => p.recommended_blood_tests || [];
  const getLegacyTests = (p: PeptideRec) => p.required_blood_tests || [];

  const derivedBasicTests = useMemo(() => {
    if (!recommendations) return [];
    const tests = new Set<string>();
    recommendations.recommended_peptides.filter((p) => selectedPeptides.has(p.name)).forEach((p) => {
      getMandatoryTests(p).forEach((t) => tests.add(t));
      if (getMandatoryTests(p).length === 0 && getRecommendedTests(p).length === 0) getLegacyTests(p).forEach((t) => tests.add(t));
    });
    if (tests.size === 0 && selectedPeptides.size > 0) recommendations.required_blood_tests.forEach((t) => tests.add(t));
    return Array.from(tests).sort();
  }, [recommendations, selectedPeptides]);

  const derivedAdvancedTests = useMemo(() => {
    if (!recommendations) return [];
    const tests = new Set<string>();
    // Advanced = basic + recommended
    derivedBasicTests.forEach((t) => tests.add(t));
    recommendations.recommended_peptides.filter((p) => selectedPeptides.has(p.name)).forEach((p) => {
      getRecommendedTests(p).forEach((t) => tests.add(t));
    });
    if (tests.size === derivedBasicTests.length && selectedPeptides.size > 0 && recommendations.recommended_blood_tests) {
      recommendations.recommended_blood_tests.forEach((t) => tests.add(t));
    }
    return Array.from(tests).sort();
  }, [recommendations, selectedPeptides, derivedBasicTests]);

  // The final lab tests based on selected tier
  const finalLabTests = useMemo(() => labTier === "advanced" ? derivedAdvancedTests : derivedBasicTests, [labTier, derivedBasicTests, derivedAdvancedTests]);

  // Map each test to the peptides that require/recommend it
  const testToPeptideMap = useMemo(() => {
    if (!recommendations) return new Map<string, { peptide: string; tier: "mandatory" | "recommended" | "legacy" }[]>();
    const map = new Map<string, { peptide: string; tier: "mandatory" | "recommended" | "legacy" }[]>();
    recommendations.recommended_peptides.filter((p) => selectedPeptides.has(p.name)).forEach((p) => {
      getMandatoryTests(p).forEach((t) => {
        if (!map.has(t)) map.set(t, []);
        map.get(t)!.push({ peptide: p.name, tier: "mandatory" });
      });
      getRecommendedTests(p).forEach((t) => {
        if (!map.has(t)) map.set(t, []);
        map.get(t)!.push({ peptide: p.name, tier: "recommended" });
      });
      if (getMandatoryTests(p).length === 0 && getRecommendedTests(p).length === 0) {
        getLegacyTests(p).forEach((t) => {
          if (!map.has(t)) map.set(t, []);
          map.get(t)!.push({ peptide: p.name, tier: "legacy" });
        });
      }
    });
    return map;
  }, [recommendations, selectedPeptides]);

  // Build the action plan text dynamically
  const buildActionPlan = useMemo(() => {
    if (!recommendations) return { doctorNote: "", nextSteps: "", patientGuide: "" };

    const selectedRecs = recommendations.recommended_peptides.filter((p) => selectedPeptides.has(p.name));
    const selectedSupps = recommendations.recommended_supplements.filter((s) => selectedSupplements.has(s.name));

    // Medications section
    const medsLines = selectedRecs.map((p) =>
      `• ${p.name} — ${p.dosage}, ${p.administration}, ${p.duration}`
    ).join("\n");

    // Supplements
    const suppLines = selectedSupps.map((s) => `• ${s.name} — ${s.dosage} (${s.reason})`).join("\n");

    // Lab tests
    const labLabel = labTier === "advanced" ? "Advanced/Comprehensive Panel" : "Basic Panel";
    const labLines = finalLabTests.map((t) => `• ${t}`).join("\n");

    // Doctor Note
    const doctorNote = `${recommendations.doctor_note}

--- PRESCRIBED MEDICATIONS ---
${medsLines || "None selected"}

--- SUPPLEMENTS ---
${suppLines || "None selected"}

--- BLOOD WORK (${labLabel}) ---
${labLines || "None required"}${labNotes ? `\n\nLab Notes: ${labNotes}` : ""}`;

    // Next Steps
    const nextSteps = `${recommendations.next_steps}

--- REQUIRED BLOOD WORK (${labLabel}) ---
${labLines || "None required"}${labNotes ? `\nNotes: ${labNotes}` : ""}`;

    // Patient Guidelines
    const patientGuide = `${recommendations.patient_guidelines}

--- YOUR PRESCRIBED MEDICATIONS ---
${selectedRecs.map((p) => `• ${p.name}: ${p.dosage} (${p.administration})`).join("\n") || "As discussed with your doctor"}

--- RECOMMENDED SUPPLEMENTS ---
${suppLines || "None"}

--- REQUIRED LAB TESTS (${labLabel}) ---
${labLines || "As directed by your doctor"}`;

    return { doctorNote, nextSteps, patientGuide };
  }, [recommendations, selectedPeptides, selectedSupplements, finalLabTests, labTier, labNotes]);

  const confirmSelection = async () => {
    if (selectedPeptides.size === 0) {
      toast({ title: "Select at least one peptide", variant: "destructive" });
      return;
    }

    const selectedRecs = recommendations!.recommended_peptides.filter((p) => selectedPeptides.has(p.name));
    const selectedSupps = recommendations!.recommended_supplements.filter((s) => selectedSupplements.has(s.name));

    const updatedRec: any = {
      ...recommendations!,
      recommended_peptides: selectedRecs,
      recommended_supplements: selectedSupps,
      required_blood_tests: derivedBasicTests,
      recommended_blood_tests: derivedAdvancedTests,
      selected_lab_tier: labTier,
      lab_notes: labNotes,
    };

    await supabase.from("consultations").update({
      ai_recommendations: updatedRec,
      doctor_notes: buildActionPlan.doctorNote,
      next_steps: buildActionPlan.nextSteps,
      patient_guidelines: buildActionPlan.patientGuide,
      status: "completed",
    }).eq("id", id);

    setRecommendations(updatedRec);
    setSelectionConfirmed(true);
    toast({ title: "Selection confirmed and saved" });
  };

  const handleEditSelection = async () => {
    await supabase.from("consultations").update({ status: "review" }).eq("id", id);
    const { data } = await supabase.from("consultations").select("*").eq("id", id).maybeSingle();
    if (data?.ai_recommendations) {
      const rec = data.ai_recommendations as unknown as Recommendation;
      setRecommendations(rec);
      setConsultation(data);
      setSelectedPeptides(new Set(rec.recommended_peptides.map((p) => p.name)));
      setSelectedSupplements(new Set(rec.recommended_supplements.map((s) => s.name)));
      const saved = data.ai_recommendations as any;
      if (saved.selected_lab_tier) setLabTier(saved.selected_lab_tier);
      if (saved.lab_notes) setLabNotes(saved.lab_notes);
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
    <div className="min-h-screen gradient-surface">
      <AppHeader title={consultation?.patient_name} subtitle="Peptide Consultation" showBack>
        <Badge variant={consultation?.status === "completed" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
          {consultation?.status}
        </Badge>
        {selectionConfirmed && (
          <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3" onClick={handleEditSelection}>Edit</Button>
        )}
      </AppHeader>

      <main className="container mx-auto max-w-4xl px-4 py-6">
        {analyzing && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Analyzing patient data...</p>
                <p className="text-sm text-muted-foreground">AI is reviewing intake answers against peptide protocols</p>
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
                        <Badge variant={flag.severity === "high" ? "destructive" : "secondary"} className="mt-0.5 text-[10px]">
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

              {/* Peptide Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    {selectionConfirmed ? "Prescribed Peptides" : "Select Peptides to Prescribe"}
                  </CardTitle>
                  {!selectionConfirmed && (
                    <CardDescription>Check the peptides you want to prescribe. Lab tests will update based on your selection.</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {recommendations.recommended_peptides.map((p, i) => (
                    <div
                      key={i}
                      className={`border rounded-lg p-4 space-y-2 transition-colors ${
                        !selectionConfirmed && selectedPeptides.has(p.name) ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {!selectionConfirmed && (
                          <Checkbox checked={selectedPeptides.has(p.name)} onCheckedChange={() => togglePeptide(p.name)} />
                        )}
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{p.name}</h4>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDetailPeptide(p.name); }}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 hover:border-primary/50 transition-colors"
                            >
                              <Info className="h-3 w-3" />Details
                            </button>
                          </div>
                          <Badge variant={p.priority === "Primary" ? "default" : "secondary"}>{p.priority}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{p.rationale}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div><span className="font-medium">Dosage:</span> {p.dosage}</div>
                        <div><span className="font-medium">Duration:</span> {p.duration}</div>
                        <div><span className="font-medium">Route:</span> {p.administration}</div>
                      </div>
                      {!selectionConfirmed && (getMandatoryTests(p).length > 0 || getRecommendedTests(p).length > 0 || getLegacyTests(p).length > 0) && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {getMandatoryTests(p).map((t, j) => (
                            <Badge key={`m-${j}`} variant="outline" className="text-[10px] border-primary/40 bg-primary/5">
                              <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />{t}
                            </Badge>
                          ))}
                          {getRecommendedTests(p).map((t, j) => (
                            <Badge key={`r-${j}`} variant="outline" className="text-[10px]">
                              <Microscope className="h-2.5 w-2.5 mr-0.5" />{t}
                            </Badge>
                          ))}
                          {getMandatoryTests(p).length === 0 && getRecommendedTests(p).length === 0 && getLegacyTests(p).map((t, j) => (
                            <Badge key={`l-${j}`} variant="outline" className="text-[10px]">{t}</Badge>
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

              {/* Lab Test Tier Selection */}
              {(derivedBasicTests.length > 0 || derivedAdvancedTests.length > 0) && (
                <Card className={labTier === "advanced" ? "border-accent/30" : "border-primary/20"}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-primary" />
                      Blood Work Panel
                    </CardTitle>
                    <CardDescription>Select the lab test tier for this patient</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tier Toggle */}
                    {!selectionConfirmed && (
                      <div className="flex rounded-lg border border-border overflow-hidden">
                        <button
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                            labTier === "basic"
                              ? "bg-primary text-primary-foreground"
                              : "bg-card hover:bg-muted/50 text-muted-foreground"
                          }`}
                          onClick={() => setLabTier("basic")}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Basic ({derivedBasicTests.length})
                        </button>
                        <button
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                            labTier === "advanced"
                              ? "bg-accent text-accent-foreground"
                              : "bg-card hover:bg-muted/50 text-muted-foreground"
                          }`}
                          onClick={() => setLabTier("advanced")}
                        >
                          <Microscope className="h-4 w-4" />
                          Advanced ({derivedAdvancedTests.length})
                        </button>
                      </div>
                    )}

                    {selectionConfirmed && (
                      <Badge variant={labTier === "advanced" ? "default" : "secondary"} className="text-xs">
                        {labTier === "advanced" ? "Advanced/Comprehensive Panel" : "Basic Panel"} Selected
                      </Badge>
                    )}

                    {/* Test list */}
                    <TooltipProvider delayDuration={200}>
                      <div className="flex flex-wrap gap-2">
                        {finalLabTests.map((t, i) => {
                          const isBasic = derivedBasicTests.includes(t);
                          const relatedPeptides = testToPeptideMap.get(t) || [];
                          return (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant={isBasic ? "default" : "outline"}
                                  className={`text-xs cursor-help ${!isBasic ? "border-accent/40 bg-accent/5 text-accent" : ""}`}
                                >
                                  {isBasic ? <ShieldCheck className="h-3 w-3 mr-1" /> : <Microscope className="h-3 w-3 mr-1" />}
                                  {t}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                {relatedPeptides.length > 0 ? (
                                  <div className="space-y-1">
                                    <p className="font-medium text-xs">Required for:</p>
                                    {relatedPeptides.map((rp, j) => (
                                      <p key={j} className="text-xs">
                                        <span className="font-medium">{rp.peptide}</span>
                                        <span className="text-muted-foreground"> — {rp.tier === "mandatory" ? "Mandatory baseline test" : rp.tier === "recommended" ? "Recommended for comprehensive monitoring" : "Standard protocol test"}</span>
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs">Standard clinical panel test</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </TooltipProvider>

                    {labTier === "basic" && derivedAdvancedTests.length > derivedBasicTests.length && !selectionConfirmed && (
                      <p className="text-xs text-muted-foreground">
                        Switch to Advanced to add {derivedAdvancedTests.length - derivedBasicTests.length} more comprehensive tests.
                      </p>
                    )}

                    {/* Lab Notes */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                        Lab Notes
                      </Label>
                      {!selectionConfirmed ? (
                        <Textarea
                          value={labNotes}
                          onChange={(e) => setLabNotes(e.target.value)}
                          placeholder="Add any specific instructions for lab work (e.g., fasting requirements, timing notes)..."
                          className="min-h-[60px] text-sm"
                        />
                      ) : (
                        labNotes && <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{labNotes}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Legacy fallback */}
              {derivedBasicTests.length === 0 && derivedAdvancedTests.length === 0 && recommendations.required_blood_tests.length > 0 && selectedPeptides.size > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Required Lab Tests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.required_blood_tests.map((t, i) => <Badge key={i} variant="outline">{t}</Badge>)}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Supplements */}
              {recommendations.recommended_supplements.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{selectionConfirmed ? "Selected Supplements" : "Select Supplements"}</CardTitle>
                    {!selectionConfirmed && <CardDescription>Choose which supplements to include in the plan.</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.recommended_supplements.map((s, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 text-sm rounded-lg border p-3 transition-colors ${
                            !selectionConfirmed && selectedSupplements.has(s.name) ? "border-primary bg-primary/5" : ""
                          }`}
                        >
                          {!selectionConfirmed && (
                            <Checkbox checked={selectedSupplements.has(s.name)} onCheckedChange={() => toggleSupplement(s.name)} className="mt-0.5" />
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

            {/* Doctor Note - uses dynamic action plan */}
            <TabsContent value="doctor-note">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-4 w-4" /> Doctor Note</CardTitle>
                    <CardDescription>Clinical consultation summary with prescribed medications & labs</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(buildActionPlan.doctorNote, "Doctor note")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4">
                    {buildActionPlan.doctorNote}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Next Steps */}
            <TabsContent value="next-steps">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Next Steps</CardTitle>
                    <CardDescription>Follow-up schedule and monitoring plan</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(buildActionPlan.nextSteps, "Next steps")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4">
                    {buildActionPlan.nextSteps}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Patient Guidelines */}
            <TabsContent value="guidelines">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><User className="h-4 w-4" /> Patient Guidelines</CardTitle>
                    <CardDescription>Patient-friendly instructions with prescribed plan</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(buildActionPlan.patientGuide, "Patient guidelines")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4">
                    {buildActionPlan.patientGuide}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <PeptideDetailSheet peptideName={detailPeptide} open={!!detailPeptide} onOpenChange={(open) => !open && setDetailPeptide(null)} />
      </main>
    </div>
  );
}
