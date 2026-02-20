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
import { AlertTriangle, CheckCircle, FileText, ClipboardList, User, Copy, Loader2, FlaskConical, Info, ShieldCheck, Microscope, StickyNote, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PeptideDetailSheet from "@/components/PeptideDetailSheet";
import AppHeader from "@/components/AppHeader";
import { openWhatsApp } from "@/utils/whatsapp";

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
  const [selectedLabTest, setSelectedLabTest] = useState<string | null>(null);

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
      const raw = data.ai_recommendations as any;
      // Weight-loss consultations have a different shape — redirect to dedicated page
      if (data.program === "weight-loss") {
        navigate(`/weight-loss/${data.id}`, { replace: true });
        return;
      }
      const rec: Recommendation = {
        recommended_peptides: raw.recommended_peptides || [],
        safety_flags: raw.safety_flags || [],
        required_blood_tests: raw.required_blood_tests || [],
        recommended_blood_tests: raw.recommended_blood_tests || [],
        recommended_supplements: raw.recommended_supplements || [],
        doctor_note: raw.doctor_note || "",
        next_steps: raw.next_steps || "",
        patient_guidelines: raw.patient_guidelines || "",
        clinical_summary: raw.clinical_summary || "",
      };
      setRecommendations(rec);
      // Restore saved lab tier & notes
      if (raw.selected_lab_tier) setLabTier(raw.selected_lab_tier);
      if (raw.lab_notes) setLabNotes(raw.lab_notes);
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

  // Clinical rationale for each lab test
  const labTestRationale: Record<string, string> = {
    // Metabolic & Organ Function
    "CMP": "Comprehensive Metabolic Panel evaluates kidney/liver function, electrolytes, and glucose — critical for safe peptide metabolism and dosing adjustments.",
    "Comprehensive Metabolic Panel": "Evaluates kidney/liver function, electrolytes, and glucose — critical for safe peptide metabolism and dosing adjustments.",
    "BMP": "Basic Metabolic Panel checks electrolytes, kidney function, and blood sugar to ensure safe peptide administration.",
    "Basic Metabolic Panel": "Checks electrolytes, kidney function, and blood sugar to ensure safe peptide administration.",
    "Liver Function Tests": "Monitors ALT, AST, and bilirubin to detect hepatotoxicity risk before and during peptide therapy.",
    "Hepatic Function Panel": "Assesses liver enzymes and proteins to ensure the liver can safely process peptide compounds.",
    "Renal Function Panel": "Evaluates kidney filtration and waste removal capacity, essential for peptides cleared renally.",
    "GGT": "Gamma-glutamyl transferase is a sensitive marker for liver stress, important when using hepatically-metabolized peptides.",
    // Hematology
    "CBC": "Complete Blood Count monitors red/white cells and platelets — detects anemia, infection risk, or clotting issues that could complicate therapy.",
    "Complete Blood Count": "Monitors red/white cells and platelets — detects anemia, infection risk, or clotting issues that could complicate therapy.",
    "CBC with Differential": "Detailed blood cell analysis including WBC subtypes, important for detecting immune changes during peptide therapy.",
    // Hormones
    "IGF-1": "Insulin-like Growth Factor 1 is the primary biomarker for growth hormone activity — essential to monitor GH-releasing peptide effectiveness and safety.",
    "Testosterone (Total)": "Measures total testosterone levels to establish baseline and monitor hormonal peptide effects on the HPG axis.",
    "Testosterone (Free)": "Free testosterone reflects bioavailable hormone levels, more clinically relevant for assessing peptide-driven hormonal changes.",
    "Testosterone Total & Free": "Assesses both total and bioavailable testosterone to monitor peptide effects on hormonal balance.",
    "Estradiol": "Monitors estrogen levels to detect aromatization and hormonal imbalance during testosterone-modulating peptide therapy.",
    "DHEA-S": "Adrenal androgen marker that helps assess overall hormonal balance and adrenal function during peptide therapy.",
    "Cortisol (AM)": "Morning cortisol evaluates HPA axis function — important for peptides affecting stress response and recovery.",
    "Cortisol": "Evaluates adrenal function and stress response, which can be modulated by certain peptide therapies.",
    "Progesterone": "Monitors progesterone levels for hormonal balance assessment during peptide-based hormone optimization.",
    "LH": "Luteinizing Hormone helps assess pituitary-gonadal axis function, especially relevant for GnRH-related peptides.",
    "FSH": "Follicle-Stimulating Hormone evaluates reproductive endocrine function and pituitary response.",
    "SHBG": "Sex Hormone-Binding Globulin affects bioavailable hormone levels — important for interpreting testosterone results during therapy.",
    "Prolactin": "Elevated prolactin can indicate pituitary issues; some peptides may affect dopamine pathways influencing prolactin.",
    "Growth Hormone": "Direct GH measurement helps assess baseline secretion and response to GH-secretagogue peptides.",
    // Thyroid
    "TSH": "Thyroid-Stimulating Hormone screens for thyroid dysfunction that could affect metabolism and peptide efficacy.",
    "Free T3": "Active thyroid hormone level — important since some peptides can influence thyroid metabolism and energy regulation.",
    "Free T4": "Thyroxine level helps assess thyroid function, which interacts with metabolic peptide pathways.",
    "Thyroid Panel": "Comprehensive thyroid assessment ensures metabolic pathways are functioning properly for optimal peptide response.",
    "Thyroid Panel (TSH, Free T3, Free T4)": "Full thyroid assessment — metabolic function directly impacts peptide absorption and efficacy.",
    // Lipids & Cardiovascular
    "Lipid Panel": "Monitors cholesterol and triglycerides — some peptides can favorably alter lipid metabolism; baseline is essential.",
    "Lipid Panel (Total, LDL, HDL, Triglycerides)": "Comprehensive lipid profile to track cardiovascular risk and peptide effects on fat metabolism.",
    "hs-CRP": "High-sensitivity C-reactive protein detects systemic inflammation — key for anti-inflammatory peptide monitoring (e.g., BPC-157, TB-500).",
    "Homocysteine": "Elevated homocysteine indicates cardiovascular and methylation risk — relevant for peptides targeting vascular health.",
    "Fibrinogen": "Clotting factor that indicates thrombotic risk, important when using peptides that may affect coagulation.",
    // Glucose & Insulin
    "Fasting Glucose": "Baseline blood sugar is critical since several peptides (e.g., GH-releasing) can affect insulin sensitivity.",
    "Fasting Insulin": "Measures insulin resistance — GH-releasing peptides can reduce insulin sensitivity, making this a key safety marker.",
    "HbA1c": "Glycated hemoglobin reflects 3-month average glucose — monitors long-term metabolic impact of peptide therapy.",
    "Hemoglobin A1c": "3-month glucose average — essential for tracking metabolic impact of growth hormone and metabolic peptides.",
    "Insulin": "Assesses insulin secretion and resistance, important for peptides that modulate glucose metabolism.",
    "HOMA-IR": "Homeostatic Model Assessment for Insulin Resistance — calculated marker for metabolic health during peptide therapy.",
    // Inflammatory & Immune
    "ESR": "Erythrocyte Sedimentation Rate detects inflammation — useful for monitoring tissue-healing peptides like BPC-157.",
    "ANA": "Antinuclear Antibody screens for autoimmune conditions that could be affected by immune-modulating peptides.",
    "IL-6": "Interleukin-6 is a key inflammatory cytokine — monitors immune response during immunomodulatory peptide therapy.",
    "TNF-alpha": "Tumor Necrosis Factor alpha measures inflammatory load — relevant for anti-inflammatory peptide protocols.",
    "CRP": "C-Reactive Protein indicates acute inflammation — important baseline for healing and recovery peptides.",
    // Vitamins & Minerals
    "Vitamin D (25-OH)": "Vitamin D status affects immune function, bone health, and hormone production — synergistic with many peptide protocols.",
    "Vitamin D": "Essential for immune and hormonal health — deficiency can reduce peptide therapy effectiveness.",
    "Vitamin B12": "B12 is critical for neurological function and energy metabolism — supports peptide-driven recovery processes.",
    "Folate": "Folate supports methylation and cell repair processes that complement peptide-driven tissue healing.",
    "Iron Panel": "Iron studies assess oxygen-carrying capacity — important for peptides targeting performance and recovery.",
    "Ferritin": "Stored iron levels indicate overall iron status — low ferritin can impair recovery peptide effectiveness.",
    "Magnesium": "Essential mineral for 300+ enzymatic reactions — magnesium status affects peptide receptor sensitivity.",
    "Zinc": "Zinc is crucial for immune function and hormone production — supports GH-releasing peptide pathways.",
    // Kidney
    "BUN/Creatinine": "Evaluates kidney filtration — ensures safe renal clearance of peptide metabolites.",
    "Creatinine": "Kidney function marker critical for dose adjustments of renally-cleared peptides.",
    "eGFR": "Estimated Glomerular Filtration Rate assesses kidney capacity to safely excrete peptide byproducts.",
    "Cystatin C": "More sensitive kidney function marker than creatinine — useful for precise renal monitoring during therapy.",
    // Other
    "PSA": "Prostate-Specific Antigen monitors prostate health — important for male patients on hormonal or GH-releasing peptides.",
    "Urinalysis": "Screens for kidney stress, infection, and metabolic byproducts during peptide therapy.",
    "Hemoglobin/Hematocrit": "Monitors oxygen-carrying capacity and polycythemia risk, especially with testosterone-modulating peptides.",
    "Hematocrit": "Elevated hematocrit increases blood viscosity — critical to monitor with GH and testosterone-affecting peptides.",
  };

  const getTestRationale = (testName: string, relatedPeptides: { peptide: string; tier: "mandatory" | "recommended" | "legacy" }[]) => {
    const rationale = labTestRationale[testName];
    const peptideInfo = relatedPeptides.length > 0
      ? relatedPeptides.map((rp) => `${rp.peptide} (${rp.tier === "mandatory" ? "Mandatory" : rp.tier === "recommended" ? "Recommended" : "Standard"})`).join(", ")
      : null;
    return { rationale: rationale || "Clinical monitoring test to ensure patient safety during peptide therapy.", peptideInfo };
  };

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
              {/* Primary Health Objectives */}
              {consultation?.intake_answers?.health_goals && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" /> Primary Health Objectives
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(consultation.intake_answers.health_goals)
                        ? consultation.intake_answers.health_goals
                        : [consultation.intake_answers.health_goals]
                      ).map((goal: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs py-1 px-3">{goal}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

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

                    {/* Test list - clickable badges */}
                    <div className="flex flex-wrap gap-2">
                      {finalLabTests.map((t, i) => {
                        const isBasic = derivedBasicTests.includes(t);
                        return (
                          <Badge
                            key={i}
                            variant={isBasic ? "default" : "outline"}
                            className={`text-xs cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all ${!isBasic ? "border-accent/40 bg-accent/5 text-accent" : ""}`}
                            onClick={() => setSelectedLabTest(t)}
                          >
                            {isBasic ? <ShieldCheck className="h-3 w-3 mr-1" /> : <Microscope className="h-3 w-3 mr-1" />}
                            {t}
                          </Badge>
                        );
                      })}
                    </div>

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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(buildActionPlan.patientGuide, "Patient guidelines")}>
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const phone = consultation?.intake_answers?.mobile_number || consultation?.intake_answers?.phone || "";
                        openWhatsApp(phone, buildActionPlan.patientGuide);
                      }}
                      disabled={!consultation?.intake_answers?.mobile_number && !consultation?.intake_answers?.phone}
                      title={(!consultation?.intake_answers?.mobile_number && !consultation?.intake_answers?.phone) ? "No phone number available" : "Send via WhatsApp"}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                  </div>
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

        {/* Lab Test Detail Dialog */}
        <Dialog open={!!selectedLabTest} onOpenChange={(open) => !open && setSelectedLabTest(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                {selectedLabTest}
              </DialogTitle>
              <DialogDescription>Clinical rationale for this test</DialogDescription>
            </DialogHeader>
            {selectedLabTest && (() => {
              const relatedPeptides = testToPeptideMap.get(selectedLabTest) || [];
              const { rationale, peptideInfo } = getTestRationale(selectedLabTest, relatedPeptides);
              const isBasic = derivedBasicTests.includes(selectedLabTest);
              return (
                <div className="space-y-4">
                  <Badge variant={isBasic ? "default" : "outline"} className="text-xs">
                    {isBasic ? "Basic Panel" : "Advanced Panel"}
                  </Badge>
                  <p className="text-sm leading-relaxed text-muted-foreground">{rationale}</p>
                  {peptideInfo && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs font-medium text-primary">Related peptides:</p>
                      <p className="text-xs text-muted-foreground mt-1">{peptideInfo}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        <PeptideDetailSheet peptideName={detailPeptide} open={!!detailPeptide} onOpenChange={(open) => !open && setDetailPeptide(null)} />
      </main>
    </div>
  );
}
