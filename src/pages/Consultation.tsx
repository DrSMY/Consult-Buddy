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
import { AlertTriangle, CheckCircle, FileText, ClipboardList, User, Copy, Loader2, FlaskConical, Info, ShieldCheck, Microscope, StickyNote, MessageCircle, Ruler, Weight, Scale, Activity, Printer, Plus, Pencil, ArrowRight, ArrowLeft, Stethoscope, Trash2, Pill } from "lucide-react";
import PatientGuideDisplay from "@/components/PatientGuideDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label as FormLabel } from "@/components/ui/label";
import PeptideDetailSheet from "@/components/PeptideDetailSheet";
import AppHeader from "@/components/AppHeader";
import LivePeptideSuggestions from "@/components/LivePeptideSuggestions";
import { openWhatsApp } from "@/utils/whatsapp";
import { printPatientGuide } from "@/utils/printGuide";

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
  vial_size_ml?: number;
  dose_per_injection_ml?: number;
  frequency?: string;
  supply_days?: number;
}

const FREQUENCY_OPTIONS = [
  { label: "Daily", value: "daily", factor: 1 },
  { label: "Every other day", value: "every other day", factor: 0.5 },
  { label: "5 days per week", value: "5 days per week", factor: 5 / 7 },
  { label: "3 times per week", value: "3 times per week", factor: 3 / 7 },
  { label: "3x per week", value: "3x per week", factor: 3 / 7 },
  { label: "2x per week", value: "2x per week", factor: 2 / 7 },
  { label: "Weekly", value: "weekly", factor: 1 / 7 },
  { label: "Bi-weekly", value: "bi-weekly", factor: 1 / 14 },
];

const calcSupplyDays = (vialMl?: number, doseMl?: number, frequency?: string): number | null => {
  if (!vialMl || !doseMl || doseMl <= 0 || !frequency) return null;
  const freq = FREQUENCY_OPTIONS.find((f) => f.value === frequency);
  if (!freq) return null;
  const injectionsPerDay = freq.factor;
  const totalInjections = vialMl / doseMl;
  return Math.floor(totalInjections / injectionsPerDay);
};

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
type WizardStep = "select" | "configure" | "labs" | "supplements";
type DoseUnit = "ml" | "units" | "spray" | "drops" | "capsule" | "tablet" | "mg" | "mcg";

const DOSE_UNIT_OPTIONS: { value: DoseUnit; label: string }[] = [
  { value: "ml", label: "ml" },
  { value: "units", label: "Units" },
  { value: "spray", label: "Spray" },
  { value: "drops", label: "Drops" },
  { value: "capsule", label: "Capsule" },
  { value: "tablet", label: "Tablet" },
  { value: "mg", label: "mg" },
  { value: "mcg", label: "mcg" },
];

// 0.1 ml = 10 units (1 ml = 100 units on a standard insulin syringe)
const mlToUnits = (ml: number): number => Math.round(ml * 100 * 100) / 100;
const unitsToMl = (units: number): number => Math.round((units / 100) * 1000) / 1000;
const formatDose = (ml: number, unit: DoseUnit): string => {
  if (unit === "units") return `${mlToUnits(ml)} Units`;
  if (unit === "ml") return `${ml} ml`;
  const opt = DOSE_UNIT_OPTIONS.find((o) => o.value === unit);
  return `${ml} ${opt?.label ?? unit}`;
};
const formatDoseLabel = (unit: DoseUnit): string =>
  DOSE_UNIT_OPTIONS.find((o) => o.value === unit)?.label ?? unit;

// Parse protocol data into supply calculator presets
interface ProtocolPreset {
  name: string;
  vial_size_ml: number | null;
  dose_per_injection_ml: number | null;
  frequency: string | null;
  raw_strength: string;
  raw_dosage: string;
}

const parseVialSize = (strength: string): number | null => {
  // Match patterns like "5 ml vial", "5ml Vial", "2 ml vial", "15ml bottle"
  const m = strength.match(/(\d+(?:\.\d+)?)\s*ml\s*(?:vial|bottle)/i);
  return m ? parseFloat(m[1]) : null;
};

const parseDoseVolume = (dosage: string): number | null => {
  // Match patterns like "0.10ml", "0.15 ml", "0.2-0.4 ml" (take first), "0.25 ml"
  const m = dosage.match(/(\d+(?:\.\d+)?)\s*ml/i);
  return m ? parseFloat(m[1]) : null;
};

const parseFrequency = (dosage: string): string | null => {
  const d = dosage.toLowerCase();
  if (d.includes("daily") || d.includes("every day") || d.includes("once daily")) return "daily";
  if (d.includes("every other day")) return "every other day";
  if (d.includes("3x") || d.includes("3 times") || d.includes("three times")) return "3x per week";
  if (d.includes("twice a week") || d.includes("2x") || d.includes("twice weekly")) return "2x per week";
  if (d.includes("once a week") || d.includes("once weekly") || d.includes("1x/week")) return "weekly";
  if (d.includes("5 days") || d.includes("5 out of 7")) return "daily"; // 5/7 is close to daily
  return null;
};

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
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedDuration, setNewMedDuration] = useState("");
  const [newMedAdmin, setNewMedAdmin] = useState("");
  const [newMedPriority, setNewMedPriority] = useState<"Primary" | "Supportive">("Primary");
  const [wizardStep, setWizardStep] = useState<WizardStep>("select");
  const [editingField, setEditingField] = useState<{ peptide: string; field: "dosage" | "duration" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [removedLabTests, setRemovedLabTests] = useState<Set<string>>(new Set());
  const [customLabTests, setCustomLabTests] = useState<string[]>([]);
  const [addLabOpen, setAddLabOpen] = useState(false);
  const [newLabName, setNewLabName] = useState("");
  // Protocol presets from DB
  const [protocolPresets, setProtocolPresets] = useState<Map<string, ProtocolPreset>>(new Map());
  // Quick-start guides from clinical_documents
  const [quickStartGuides, setQuickStartGuides] = useState<Map<string, string>>(new Map());
  // Dose display unit toggle
  const [doseUnit, setDoseUnit] = useState<DoseUnit>("ml");

  useEffect(() => {
    loadConsultation();
    loadProtocolPresets();
    loadQuickStartGuides();
  }, [id]);

  const loadQuickStartGuides = async () => {
    const { data } = await supabase
      .from("clinical_documents")
      .select("peptide_name, content")
      .eq("document_type", "patient_quickstart_guide");
    if (data) {
      const map = new Map<string, string>();
      data.forEach((row: any) => {
        if (row.peptide_name) map.set(row.peptide_name, row.content);
      });
      setQuickStartGuides(map);
    }
  };

  const loadProtocolPresets = async () => {
    const { data } = await supabase.from("peptide_protocols").select("name, strength_volume, dosage_instructions");
    if (data) {
      const map = new Map<string, ProtocolPreset>();
      data.forEach((row: any) => {
        map.set(row.name, {
          name: row.name,
          vial_size_ml: parseVialSize(row.strength_volume || ""),
          dose_per_injection_ml: parseDoseVolume(row.dosage_instructions || ""),
          frequency: parseFrequency(row.dosage_instructions || ""),
          raw_strength: row.strength_volume || "",
          raw_dosage: row.dosage_instructions || "",
        });
      });
      setProtocolPresets(map);
    }
  };

  const applyProtocolPreset = (peptideName: string) => {
    const preset = protocolPresets.get(peptideName);
    if (!preset || !recommendations) return;
    const updated: Recommendation = {
      ...recommendations,
      recommended_peptides: recommendations.recommended_peptides.map((p) => {
        if (p.name !== peptideName) return p;
        const newP = { ...p };
        if (preset.vial_size_ml) newP.vial_size_ml = preset.vial_size_ml;
        if (preset.dose_per_injection_ml) newP.dose_per_injection_ml = preset.dose_per_injection_ml;
        if (preset.frequency) newP.frequency = preset.frequency;
        const supply = calcSupplyDays(newP.vial_size_ml, newP.dose_per_injection_ml, newP.frequency);
        newP.supply_days = supply ?? undefined;
        return newP;
      }),
    };
    setRecommendations(updated);
    supabase.from("consultations").update({ ai_recommendations: updated as any }).eq("id", id);
    toast({ title: `Protocol loaded for ${peptideName}` });
  };

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
      if (raw.selected_lab_tier) setLabTier(raw.selected_lab_tier);
      if (raw.lab_notes) setLabNotes(raw.lab_notes);
      if (raw.custom_lab_tests) setCustomLabTests(raw.custom_lab_tests);
      if (raw.removed_lab_tests) setRemovedLabTests(new Set(raw.removed_lab_tests));
      if (data.status === "completed") {
        setSelectionConfirmed(true);
        setSelectedPeptides(new Set(rec.recommended_peptides.map((p) => p.name)));
        if (raw.selected_supplement_names) {
          setSelectedSupplements(new Set(raw.selected_supplement_names));
        } else {
          setSelectedSupplements(new Set(rec.recommended_supplements.map((s) => s.name)));
        }
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

  const updatePeptideField = (peptideName: string, field: keyof PeptideRec, value: any) => {
    if (!recommendations) return;
    const updated: Recommendation = {
      ...recommendations,
      recommended_peptides: recommendations.recommended_peptides.map((p) => {
        if (p.name !== peptideName) return p;
        const newP = { ...p, [field]: value };
        if (field === "vial_size_ml" || field === "dose_per_injection_ml" || field === "frequency") {
          const supply = calcSupplyDays(
            field === "vial_size_ml" ? value : newP.vial_size_ml,
            field === "dose_per_injection_ml" ? value : newP.dose_per_injection_ml,
            field === "frequency" ? value : newP.frequency,
          );
          newP.supply_days = supply ?? undefined;
        }
        return newP;
      }),
    };
    setRecommendations(updated);
    supabase.from("consultations").update({ ai_recommendations: updated as any }).eq("id", id);
  };

  const startInlineEdit = (peptide: string, field: "dosage" | "duration") => {
    const p = recommendations?.recommended_peptides.find((r) => r.name === peptide);
    if (p) {
      setEditingField({ peptide, field });
      setEditValue(p[field]);
    }
  };

  const saveInlineEdit = () => {
    if (editingField) {
      updatePeptideField(editingField.peptide, editingField.field, editValue);
      setEditingField(null);
      setEditValue("");
    }
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
    derivedBasicTests.forEach((t) => tests.add(t));
    recommendations.recommended_peptides.filter((p) => selectedPeptides.has(p.name)).forEach((p) => {
      getRecommendedTests(p).forEach((t) => tests.add(t));
    });
    if (tests.size === derivedBasicTests.length && selectedPeptides.size > 0 && recommendations.recommended_blood_tests) {
      recommendations.recommended_blood_tests.forEach((t) => tests.add(t));
    }
    return Array.from(tests).sort();
  }, [recommendations, selectedPeptides, derivedBasicTests]);

  // Final lab tests = (tier tests - removed) + custom
  const finalLabTests = useMemo(() => {
    const tierTests = labTier === "advanced" ? derivedAdvancedTests : derivedBasicTests;
    const filtered = tierTests.filter((t) => !removedLabTests.has(t));
    return [...filtered, ...customLabTests.filter((t) => !filtered.includes(t))].sort();
  }, [labTier, derivedBasicTests, derivedAdvancedTests, removedLabTests, customLabTests]);

  const removeLabTest = (test: string) => {
    if (customLabTests.includes(test)) {
      setCustomLabTests((prev) => prev.filter((t) => t !== test));
    } else {
      setRemovedLabTests((prev) => new Set([...prev, test]));
    }
  };

  const restoreLabTest = (test: string) => {
    setRemovedLabTests((prev) => { const next = new Set(prev); next.delete(test); return next; });
  };

  const addCustomLabTest = () => {
    if (!newLabName.trim()) return;
    const name = newLabName.trim();
    if (!customLabTests.includes(name) && !finalLabTests.includes(name)) {
      setCustomLabTests((prev) => [...prev, name]);
    }
    setNewLabName("");
    setAddLabOpen(false);
  };

  // Clinical rationale for each lab test
  const labTestRationale: Record<string, string> = {
    "CMP": "Comprehensive Metabolic Panel evaluates kidney/liver function, electrolytes, and glucose — critical for safe peptide metabolism and dosing adjustments.",
    "Comprehensive Metabolic Panel": "Evaluates kidney/liver function, electrolytes, and glucose — critical for safe peptide metabolism and dosing adjustments.",
    "BMP": "Basic Metabolic Panel checks electrolytes, kidney function, and blood sugar to ensure safe peptide administration.",
    "Basic Metabolic Panel": "Checks electrolytes, kidney function, and blood sugar to ensure safe peptide administration.",
    "Liver Function Tests": "Monitors ALT, AST, and bilirubin to detect hepatotoxicity risk before and during peptide therapy.",
    "Hepatic Function Panel": "Assesses liver enzymes and proteins to ensure the liver can safely process peptide compounds.",
    "Renal Function Panel": "Evaluates kidney filtration and waste removal capacity, essential for peptides cleared renally.",
    "GGT": "Gamma-glutamyl transferase is a sensitive marker for liver stress, important when using hepatically-metabolized peptides.",
    "CBC": "Complete Blood Count monitors red/white cells and platelets — detects anemia, infection risk, or clotting issues that could complicate therapy.",
    "Complete Blood Count": "Monitors red/white cells and platelets — detects anemia, infection risk, or clotting issues that could complicate therapy.",
    "CBC with Differential": "Detailed blood cell analysis including WBC subtypes, important for detecting immune changes during peptide therapy.",
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
    "TSH": "Thyroid-Stimulating Hormone screens for thyroid dysfunction that could affect metabolism and peptide efficacy.",
    "Free T3": "Active thyroid hormone level — important since some peptides can influence thyroid metabolism and energy regulation.",
    "Free T4": "Thyroxine level helps assess thyroid function, which interacts with metabolic peptide pathways.",
    "Thyroid Panel": "Comprehensive thyroid assessment ensures metabolic pathways are functioning properly for optimal peptide response.",
    "Thyroid Panel (TSH, Free T3, Free T4)": "Full thyroid assessment — metabolic function directly impacts peptide absorption and efficacy.",
    "Lipid Panel": "Monitors cholesterol and triglycerides — some peptides can favorably alter lipid metabolism; baseline is essential.",
    "Lipid Panel (Total, LDL, HDL, Triglycerides)": "Comprehensive lipid profile to track cardiovascular risk and peptide effects on fat metabolism.",
    "hs-CRP": "High-sensitivity C-reactive protein detects systemic inflammation — key for anti-inflammatory peptide monitoring (e.g., BPC-157, TB-500).",
    "Homocysteine": "Elevated homocysteine indicates cardiovascular and methylation risk — relevant for peptides targeting vascular health.",
    "Fibrinogen": "Clotting factor that indicates thrombotic risk, important when using peptides that may affect coagulation.",
    "Fasting Glucose": "Baseline blood sugar is critical since several peptides (e.g., GH-releasing) can affect insulin sensitivity.",
    "Fasting Insulin": "Measures insulin resistance — GH-releasing peptides can reduce insulin sensitivity, making this a key safety marker.",
    "HbA1c": "Glycated hemoglobin reflects 3-month average glucose — monitors long-term metabolic impact of peptide therapy.",
    "Hemoglobin A1c": "3-month glucose average — essential for tracking metabolic impact of growth hormone and metabolic peptides.",
    "Insulin": "Assesses insulin secretion and resistance, important for peptides that modulate glucose metabolism.",
    "HOMA-IR": "Homeostatic Model Assessment for Insulin Resistance — calculated marker for metabolic health during peptide therapy.",
    "ESR": "Erythrocyte Sedimentation Rate detects inflammation — useful for monitoring tissue-healing peptides like BPC-157.",
    "ANA": "Antinuclear Antibody screens for autoimmune conditions that could be affected by immune-modulating peptides.",
    "IL-6": "Interleukin-6 is a key inflammatory cytokine — monitors immune response during immunomodulatory peptide therapy.",
    "TNF-alpha": "Tumor Necrosis Factor alpha measures inflammatory load — relevant for anti-inflammatory peptide protocols.",
    "CRP": "C-Reactive Protein indicates acute inflammation — important baseline for healing and recovery peptides.",
    "Vitamin D (25-OH)": "Vitamin D status affects immune function, bone health, and hormone production — synergistic with many peptide protocols.",
    "Vitamin D": "Essential for immune and hormonal health — deficiency can reduce peptide therapy effectiveness.",
    "Vitamin B12": "B12 is critical for neurological function and energy metabolism — supports peptide-driven recovery processes.",
    "Folate": "Folate supports methylation and cell repair processes that complement peptide-driven tissue healing.",
    "Iron Panel": "Iron studies assess oxygen-carrying capacity — important for peptides targeting performance and recovery.",
    "Ferritin": "Stored iron levels indicate overall iron status — low ferritin can impair recovery peptide effectiveness.",
    "Magnesium": "Essential mineral for 300+ enzymatic reactions — magnesium status affects peptide receptor sensitivity.",
    "Zinc": "Zinc is crucial for immune function and hormone production — supports GH-releasing peptide pathways.",
    "BUN/Creatinine": "Evaluates kidney filtration — ensures safe renal clearance of peptide metabolites.",
    "Creatinine": "Kidney function marker critical for dose adjustments of renally-cleared peptides.",
    "eGFR": "Estimated Glomerular Filtration Rate assesses kidney capacity to safely excrete peptide byproducts.",
    "Cystatin C": "More sensitive kidney function marker than creatinine — useful for precise renal monitoring during therapy.",
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

  // Build action plan text
  const buildActionPlan = useMemo(() => {
    if (!recommendations) return { doctorNote: "", nurseInstructions: "", nextSteps: "", patientGuide: "" };

    const selectedRecs = recommendations.recommended_peptides.filter((p) => selectedPeptides.has(p.name));
    const selectedSupps = recommendations.recommended_supplements.filter((s) => selectedSupplements.has(s.name));

    const medsLines = selectedRecs.map((p) => {
      let line = `• ${p.name} — ${p.dosage}, ${p.administration}, ${p.duration}`;
      if (p.supply_days != null && p.vial_size_ml && p.dose_per_injection_ml) {
        line += `\n  Vial: ${p.vial_size_ml}ml | Dose: ${formatDose(p.dose_per_injection_ml, doseUnit)}/injection | Frequency: ${p.frequency} | Supply: ${p.supply_days} days (${Math.floor(p.vial_size_ml / p.dose_per_injection_ml)} injections)`;
      }
      return line;
    }).join("\n");

    const suppLines = selectedSupps.map((s) => `• ${s.name} — ${s.dosage} (${s.reason})`).join("\n");

    const labLabel = labTier === "advanced" ? "Advanced/Comprehensive Panel" : "Basic Panel";
    const labLines = finalLabTests.map((t) => `• ${t}`).join("\n");

    const doctorNote = `DOCTOR NOTE — ${consultation?.patient_name || "Patient"}

--- PRESCRIBED MEDICATIONS ---
${medsLines || "None selected"}

--- SUPPLEMENTS ---
${suppLines || "None selected"}

--- BLOOD WORK (${labLabel}) ---
${labLines || "None required"}${labNotes ? `\n\nLab Notes: ${labNotes}` : ""}

--- CLINICAL NOTES ---
${recommendations.clinical_summary || ""}`;

    // Nurse Instructions
    const nurseLines = selectedRecs.map((p) => {
      const lines = [`📌 ${p.name}`];
      lines.push(`   Route: ${p.administration}`);
      lines.push(`   Dose: ${p.dosage}`);
      if (p.dose_per_injection_ml) lines.push(`   Volume per injection: ${formatDose(p.dose_per_injection_ml, doseUnit)} (${formatDose(p.dose_per_injection_ml, doseUnit === "ml" ? "units" : "ml")})`);
      if (p.frequency) {
        const freqLabel = FREQUENCY_OPTIONS.find((f) => f.value === p.frequency)?.label || p.frequency;
        lines.push(`   Frequency: ${freqLabel}`);
      }
      if (p.vial_size_ml) lines.push(`   Vial size: ${p.vial_size_ml} ml`);
      if (p.supply_days != null && p.vial_size_ml && p.dose_per_injection_ml) {
        lines.push(`   Total injections per vial: ${Math.floor(p.vial_size_ml / p.dose_per_injection_ml)}`);
        lines.push(`   Vial lasts: ${p.supply_days} days`);
      }
      lines.push(`   Duration: ${p.duration}`);
      return lines.join("\n");
    }).join("\n\n");

    const nurseInstructions = `NURSE ADMINISTRATION INSTRUCTIONS — ${consultation?.patient_name || "Patient"}

--- MEDICATION PREPARATION & ADMINISTRATION ---

${nurseLines || "No medications prescribed"}

--- GENERAL ADMINISTRATION NOTES ---
• Verify patient identity and allergies before administration
• Ensure proper hand hygiene and aseptic technique
• For subcutaneous injections: rotate injection sites (abdomen, thigh, upper arm)
• For intramuscular injections: use appropriate needle gauge and injection site
• Store reconstituted peptides as per manufacturer instructions (typically 2-8°C)
• Document administration time, site, and any adverse reactions
• Monitor patient for 15 minutes post-injection for any immediate reactions

--- REQUIRED BLOOD WORK (${labLabel}) ---
${labLines || "None required"}${labNotes ? `\nLab Notes: ${labNotes}` : ""}

--- SUPPLEMENTS TO DISPENSE ---
${suppLines || "None"}`;

    const nextSteps = `NEXT STEPS — ${consultation?.patient_name || "Patient"}

Prescribed Medications:
${selectedRecs.map((p) => `• ${p.name} — ${p.dosage}, ${p.duration}`).join("\n") || "None"}

--- REQUIRED BLOOD WORK (${labLabel}) ---
${labLines || "None required"}${labNotes ? `\nNotes: ${labNotes}` : ""}

--- FOLLOW-UP ---
• Schedule follow-up appointment as per treatment duration
• Monitor for any side effects and report immediately`;

    // Build rich patient guide using quick-start guides from database
    const patientGuideHeader = `Dear ${consultation?.patient_name || "Patient"},

Welcome to your personalised treatment plan. Below you will find detailed instructions for each of your prescribed medications, along with supplement and lab test guidance.`;

    const patientMedSections = selectedRecs.map((p) => {
      // Try to find quick-start guide by matching peptide name
      let guideContent = "";
      for (const [key, content] of quickStartGuides.entries()) {
        if (key.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(key.split(" (")[0].toLowerCase())) {
          guideContent = content;
          break;
        }
      }

      const freqLabel = FREQUENCY_OPTIONS.find((f) => f.value === p.frequency)?.label || p.frequency || "";
      const totalInjections = (p.vial_size_ml && p.dose_per_injection_ml) ? Math.floor(p.vial_size_ml / p.dose_per_injection_ml) : null;

      // Build the personalised dose block that replaces generic DB dose info
      let doseBlock = `- Dose: ${p.dosage} (${p.administration})`;
      if (freqLabel) doseBlock += `\n- Frequency: ${freqLabel}`;
      doseBlock += `\n- Duration: ${p.duration}`;
      if (p.vial_size_ml) doseBlock += `\n- Vial Size: ${p.vial_size_ml} ml`;
      if (p.dose_per_injection_ml) doseBlock += `\n- Volume per injection: ${formatDose(p.dose_per_injection_ml, doseUnit)} (${formatDose(p.dose_per_injection_ml, doseUnit === "ml" ? "units" : "ml")})`;
      if (totalInjections) doseBlock += `\n- Total injections per vial: ${totalInjections}`;
      if (p.supply_days != null) doseBlock += `\n- Supply: Your vial will last approximately ${p.supply_days} days`;

      if (guideContent) {
        // Strip ALL generic dose/routine/schedule content from DB — patient only sees prescribed values
        let cleaned = guideContent
          .replace(/^- Dose:.*$/gm, "")
          .replace(/^- Supply:.*$/gm, "")
          .replace(/^- Frequency:.*$/gm, "")
          .replace(/^- Timing:.*$/gm, "")
          .replace(/^- Schedule:.*$/gm, "")
          .replace(/^- Wait .*$/gm, "")
          .replace(/^- Note:.*$/gm, "")
          .replace(/^- CRITICAL:.*$/gm, "")
          .replace(/^- Option [A-Z]:.*$/gm, "")
          .replace(/^- Cardio Boost:.*$/gm, "")
          .replace(/^- Rotate injection.*$/gim, "")
          .replace(/^###\s*(Your Daily Routine|Daily Routine|Your Prescribed Routine)\s*$/gm, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        // Split into sections by ### headers
        const sections = cleaned.split(/(?=###)/);
        // Keep only non-dose sections (Medication Handling, Support, What to Expect, etc.)
        const keptSections = sections.filter((s) => {
          const header = s.trim().split("\n")[0].toLowerCase();
          return !header.includes("routine") && !header.includes("dose") && !header.includes("schedule");
        });

        // First non-### block is the intro (analogy text)
        const intro = sections[0]?.includes("###") ? "" : sections[0]?.trim() || "";
        const guideRest = keptSections.filter((s) => s.trim().startsWith("###")).join("\n\n").trim();

        let personalised = "";
        if (intro) personalised += `${intro}\n\n`;
        personalised += `### Your Prescribed Medication\n${doseBlock}`;
        if (guideRest) personalised += `\n\n${guideRest}`;

        return `--- ${p.name.toUpperCase()} ---\n${personalised}`;
      } else {
        return `--- ${p.name.toUpperCase()} ---\n### Your Prescribed Medication\n${doseBlock}`;
      }
    }).join("\n\n");

    const patientGuide = `--- PATIENT CARE GUIDE ---
${patientGuideHeader}

${patientMedSections}

--- RECOMMENDED SUPPLEMENTS ---
${suppLines || "None"}

--- REQUIRED LAB TESTS (${labLabel}) ---
${labLines || "As directed by your doctor"}

--- IMPORTANT REMINDERS ---
• Take your medications exactly as prescribed
• Store all medications as instructed — most peptides require refrigeration (2-8°C)
• Complete all recommended lab tests before your next visit
• Report any unusual side effects immediately
• Schedule your follow-up appointment as discussed

Warm regards,
Dr Sami M. Yesuf
Medical Director
SCOPE Certified Physician`;

    return { doctorNote, nurseInstructions, nextSteps, patientGuide };
  }, [recommendations, selectedPeptides, selectedSupplements, finalLabTests, labTier, labNotes, consultation, quickStartGuides, doseUnit]);

  const confirmSelection = async () => {
    if (selectedPeptides.size === 0) {
      toast({ title: "Select at least one peptide", variant: "destructive" });
      return;
    }

    const selectedRecs = recommendations!.recommended_peptides.filter((p) => selectedPeptides.has(p.name));

    const updatedRec: any = {
      ...recommendations!,
      recommended_peptides: selectedRecs,
      // Keep ALL supplements in the list so they remain available on re-edit
      // Track which ones were selected via a separate field
      selected_supplement_names: Array.from(selectedSupplements),
      required_blood_tests: derivedBasicTests,
      recommended_blood_tests: derivedAdvancedTests,
      selected_lab_tier: labTier,
      lab_notes: labNotes,
      custom_lab_tests: customLabTests,
      removed_lab_tests: Array.from(removedLabTests),
      final_lab_tests: finalLabTests,
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
    toast({ title: "Consultation confirmed and saved" });
  };

  const handleEditSelection = async () => {
    await supabase.from("consultations").update({ status: "review" }).eq("id", id);
    const { data } = await supabase.from("consultations").select("*").eq("id", id).maybeSingle();
    if (data?.ai_recommendations) {
      const rec = data.ai_recommendations as unknown as Recommendation;
      setRecommendations(rec);
      setConsultation(data);
      setSelectedPeptides(new Set(rec.recommended_peptides.map((p) => p.name)));
      const saved = data.ai_recommendations as any;
      // Restore selected supplements from saved selection, or fall back to all
      if (saved.selected_supplement_names) {
        setSelectedSupplements(new Set(saved.selected_supplement_names));
      } else {
        setSelectedSupplements(new Set(rec.recommended_supplements.map((s) => s.name)));
      }
      
      if (saved.selected_lab_tier) setLabTier(saved.selected_lab_tier);
      if (saved.lab_notes) setLabNotes(saved.lab_notes);
      if (saved.custom_lab_tests) setCustomLabTests(saved.custom_lab_tests);
      if (saved.removed_lab_tests) setRemovedLabTests(new Set(saved.removed_lab_tests));
    }
    setSelectionConfirmed(false);
    setWizardStep("select");
    toast({ title: "Selection unlocked for editing" });
  };

  const addManualPeptide = () => {
    if (!newMedName.trim() || !recommendations) return;
    const newPeptide: PeptideRec = {
      name: newMedName.trim(),
      rationale: "Manually added by doctor",
      dosage: newMedDosage || "As prescribed",
      duration: newMedDuration || "As directed",
      administration: newMedAdmin || "As directed",
      priority: newMedPriority,
    };
    const updated: Recommendation = {
      ...recommendations,
      recommended_peptides: [...recommendations.recommended_peptides, newPeptide],
    };
    setRecommendations(updated);
    setSelectedPeptides((prev) => new Set([...prev, newPeptide.name]));
    supabase.from("consultations").update({ ai_recommendations: updated as any }).eq("id", id);
    setAddMedOpen(false);
    setNewMedName("");
    setNewMedDosage("");
    setNewMedDuration("");
    setNewMedAdmin("");
    setNewMedPriority("Primary");
    toast({ title: `${newPeptide.name} added to recommendations` });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  // Wizard step info
  const WIZARD_STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: "select", label: "Medications", icon: <Pill className="h-3.5 w-3.5" /> },
    { key: "configure", label: "Dose & Supply", icon: <Activity className="h-3.5 w-3.5" /> },
    { key: "labs", label: "Lab Tests", icon: <FlaskConical className="h-3.5 w-3.5" /> },
    { key: "supplements", label: "Supplements", icon: <Plus className="h-3.5 w-3.5" /> },
  ];

  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.key === wizardStep);

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

      <main className="container mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
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
          <>
          {/* Wizard Progress — only when not confirmed */}
          {!selectionConfirmed && (
            <div className="flex items-center gap-1 mb-6 bg-card rounded-lg border p-2">
              {WIZARD_STEPS.map((step, i) => (
                <div key={step.key} className="flex items-center flex-1">
                  <button
                    onClick={() => {
                      // Only allow going back or to current step
                      if (i <= currentStepIndex) setWizardStep(step.key);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium w-full transition-all ${
                      wizardStep === step.key
                        ? "bg-primary text-primary-foreground"
                        : i < currentStepIndex
                        ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                        : "text-muted-foreground"
                    }`}
                  >
                    {i < currentStepIndex ? <CheckCircle className="h-3.5 w-3.5" /> : step.icon}
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </button>
                  {i < WIZARD_STEPS.length - 1 && (
                    <ArrowRight className={`h-3 w-3 mx-1 shrink-0 ${i < currentStepIndex ? "text-primary" : "text-muted-foreground/30"}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Completed view — Tabs */}
          {selectionConfirmed ? (
            <Tabs defaultValue="prescriptions" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
                <TabsTrigger value="prescriptions" className="text-xs sm:text-sm">Prescriptions</TabsTrigger>
                <TabsTrigger value="doctor-note" className="text-xs sm:text-sm">Doctor Note</TabsTrigger>
                <TabsTrigger value="nurse" className="text-xs sm:text-sm">Nurse Instructions</TabsTrigger>
                <TabsTrigger value="next-steps" className="text-xs sm:text-sm">Next Steps</TabsTrigger>
                <TabsTrigger value="guidelines" className="text-xs sm:text-sm">Patient Guide</TabsTrigger>
              </TabsList>

              {/* Prescriptions Tab */}
              <TabsContent value="prescriptions" className="space-y-4">
                {/* Health Objectives */}
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
                    <CardTitle className="text-lg flex items-center gap-2"><User className="h-4 w-4" /> Clinical Summary</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm whitespace-pre-wrap">{recommendations.clinical_summary}</p></CardContent>
                </Card>

                {/* Prescribed Peptides */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2"><CheckCircle className="h-4 w-4 text-accent" /> Prescribed Peptides</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Dose unit:</span>
                        <div className="flex rounded-md border border-border overflow-hidden">
                          <button className={`px-2 py-1 text-[10px] font-medium ${doseUnit === "ml" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`} onClick={() => setDoseUnit("ml")}>ml</button>
                          <button className={`px-2 py-1 text-[10px] font-medium ${doseUnit === "units" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`} onClick={() => setDoseUnit("units")}>Units</button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.recommended_peptides.map((p, i) => (
                      <div key={i} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{p.name}</h4>
                            <button onClick={() => setDetailPeptide(p.name)} className="inline-flex items-center justify-center rounded-full h-6 w-6 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              <Info className="h-3 w-3" />
                            </button>
                          </div>
                          <Badge variant={p.priority === "Primary" ? "default" : "secondary"}>{p.priority}</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                          <div><span className="font-medium">Dosage:</span> {p.dosage}</div>
                          <div><span className="font-medium">Duration:</span> {p.duration}</div>
                          <div><span className="font-medium">Route:</span> {p.administration}</div>
                          {p.supply_days != null && (
                            <div><span className="font-medium">Supply:</span> <span className="text-accent font-semibold">{p.supply_days} days</span> ({p.frequency})</div>
                          )}
                        </div>
                        {p.vial_size_ml && p.dose_per_injection_ml && p.supply_days != null && (
                          <div className="text-[10px] text-muted-foreground">
                            {p.vial_size_ml}ml vial • {formatDose(p.dose_per_injection_ml, doseUnit)}/injection • {Math.floor(p.vial_size_ml / p.dose_per_injection_ml)} total injections
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Lab Tests Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2"><FlaskConical className="h-4 w-4 text-primary" /> Blood Work</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge variant={labTier === "advanced" ? "default" : "secondary"} className="text-xs">
                      {labTier === "advanced" ? "Advanced Panel" : "Basic Panel"}
                    </Badge>
                    <div className="flex flex-wrap gap-2">
                      {finalLabTests.map((t, i) => (
                        <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:ring-2 hover:ring-primary/30" onClick={() => setSelectedLabTest(t)}>
                          {t}
                        </Badge>
                      ))}
                    </div>
                    {labNotes && <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{labNotes}</p>}
                  </CardContent>
                </Card>

                {/* Supplements Summary */}
                {recommendations.recommended_supplements.filter((s) => selectedSupplements.has(s.name)).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Supplements</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {recommendations.recommended_supplements.filter((s) => selectedSupplements.has(s.name)).map((s, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{s.name}</span> — {s.dosage}
                          <p className="text-xs text-muted-foreground">{s.reason}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Doctor Note */}
              <TabsContent value="doctor-note">
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-4 w-4" /> Doctor Note</CardTitle>
                      <CardDescription>Clinical summary with prescribed medications, labs & supply calculations</CardDescription>
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

              {/* Nurse Instructions */}
              <TabsContent value="nurse">
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2"><Stethoscope className="h-4 w-4" /> Nurse Instructions</CardTitle>
                      <CardDescription>Administration guide with dosing, vial details & injection protocols</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(buildActionPlan.nurseInstructions, "Nurse instructions")}>
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => printPatientGuide(buildActionPlan.nurseInstructions, `Nurse_Instructions_${consultation?.patient_name}`)}>
                        <Printer className="h-3 w-3 mr-1" /> Print
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4">
                      {buildActionPlan.nurseInstructions}
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

              {/* Patient Guide */}
              <TabsContent value="guidelines">
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2"><User className="h-4 w-4" /> Patient Guidelines</CardTitle>
                      <CardDescription>Patient-friendly instructions with supply information</CardDescription>
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
                      >
                        <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => printPatientGuide(buildActionPlan.patientGuide, consultation?.patient_name)}>
                        <Printer className="h-3 w-3 mr-1" /> Print / PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PatientGuideDisplay text={buildActionPlan.patientGuide} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            /* WIZARD FLOW — Not confirmed */
            <div className="space-y-4">
              {/* Health Objectives — always visible */}
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
                  <CardTitle className="text-lg flex items-center gap-2"><User className="h-4 w-4" /> Clinical Summary</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{recommendations.clinical_summary}</p></CardContent>
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
                        <Badge variant={flag.severity === "high" ? "destructive" : "secondary"} className="mt-0.5 text-[10px]">{flag.severity}</Badge>
                        <div>
                          <p className="text-sm font-medium">{flag.concern}</p>
                          <p className="text-xs text-muted-foreground">{flag.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* ===== STEP 1: Select Medications ===== */}
              {wizardStep === "select" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Pill className="h-4 w-4 text-primary" /> Step 1: Choose Medications
                    </CardTitle>
                    <CardDescription>Tap to select which peptides to prescribe. Press ⓘ for full details.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.recommended_peptides.map((p, i) => (
                      <div
                        key={i}
                        onClick={() => togglePeptide(p.name)}
                        className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-all ${
                          selectedPeptides.has(p.name) ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox checked={selectedPeptides.has(p.name)} onCheckedChange={() => togglePeptide(p.name)} onClick={(e) => e.stopPropagation()} />
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm">{p.name}</h4>
                            <button onClick={(e) => { e.stopPropagation(); setDetailPeptide(p.name); }} className="inline-flex items-center justify-center rounded-full h-6 w-6 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0">
                              <Info className="h-3 w-3" />
                            </button>
                          </div>
                          <Badge variant={p.priority === "Primary" ? "default" : "secondary"} className="text-[10px] shrink-0">{p.priority}</Badge>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => setAddMedOpen(true)} variant="outline" className="flex-1" size="lg">
                        <Plus className="h-4 w-4 mr-2" /> Add Medication
                      </Button>
                      <Button onClick={() => setWizardStep("configure")} disabled={selectedPeptides.size === 0} className="flex-1" size="lg">
                        Next: Configure ({selectedPeptides.size}) <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ===== STEP 2: Configure Dose & Supply ===== */}
              {wizardStep === "configure" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> Step 2: Configure Dose, Duration & Supply
                    </CardTitle>
                    <CardDescription>Review and edit dosage, duration & vial supply for each selected peptide.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recommendations.recommended_peptides
                      .filter((p) => selectedPeptides.has(p.name))
                      .map((p, i) => (
                        <div key={i} className="border rounded-lg p-4 space-y-3 bg-primary/[0.02]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{p.name}</h4>
                              <button onClick={() => setDetailPeptide(p.name)} className="inline-flex items-center justify-center rounded-full h-6 w-6 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                <Info className="h-3 w-3" />
                              </button>
                            </div>
                            <Badge variant={p.priority === "Primary" ? "default" : "secondary"} className="text-[10px]">{p.priority}</Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-lg bg-muted/50 p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dosage</span>
                              {editingField?.peptide === p.name && editingField.field === "dosage" ? (
                                <Input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveInlineEdit} onKeyDown={(e) => e.key === "Enter" && saveInlineEdit()} className="mt-1 h-7 text-sm" />
                              ) : (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <p className="text-sm font-medium flex-1">{p.dosage}</p>
                                  <button onClick={() => startInlineEdit(p.name, "dosage")} className="text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3 w-3" /></button>
                                </div>
                              )}
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duration</span>
                              {editingField?.peptide === p.name && editingField.field === "duration" ? (
                                <Input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveInlineEdit} onKeyDown={(e) => e.key === "Enter" && saveInlineEdit()} className="mt-1 h-7 text-sm" />
                              ) : (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <p className="text-sm font-medium flex-1">{p.duration}</p>
                                  <button onClick={() => startInlineEdit(p.name, "duration")} className="text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-3 w-3" /></button>
                                </div>
                              )}
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Route</span>
                              <p className="text-sm font-medium mt-0.5">{p.administration}</p>
                            </div>
                          </div>

                          {/* Vial Supply Calculator */}
                          <div className="rounded-lg border border-dashed border-primary/20 bg-primary/[0.03] p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">💊 Vial Supply Calculator</span>
                              {protocolPresets.has(p.name) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] px-2 border-primary/30 text-primary hover:bg-primary/10"
                                  onClick={() => applyProtocolPreset(p.name)}
                                >
                                  <FileText className="h-3 w-3 mr-1" /> Load from Protocol
                                </Button>
                              )}
                            </div>

                            {/* Protocol reference info */}
                            {protocolPresets.has(p.name) && (
                              <div className="text-[10px] text-muted-foreground bg-muted/50 rounded-md p-2 space-y-0.5">
                                <p><span className="font-medium">Protocol strength:</span> {protocolPresets.get(p.name)!.raw_strength}</p>
                                <p><span className="font-medium">Protocol dosage:</span> {protocolPresets.get(p.name)!.raw_dosage}</p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Vial Size (ml)</Label>
                                <Input type="number" step="0.5" min="0" placeholder={protocolPresets.get(p.name)?.vial_size_ml ? `Protocol: ${protocolPresets.get(p.name)!.vial_size_ml}ml` : "e.g. 5"} value={p.vial_size_ml ?? ""} onChange={(e) => updatePeptideField(p.name, "vial_size_ml", e.target.value ? parseFloat(e.target.value) : undefined)} className="mt-1 h-8 text-sm" />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <Label className="text-[10px] text-muted-foreground">Dose per Injection ({formatDoseLabel(doseUnit)})</Label>
                                  <select
                                    value={doseUnit}
                                    onChange={(e) => setDoseUnit(e.target.value as DoseUnit)}
                                    className="h-6 rounded-md border border-border bg-card px-1.5 text-[10px] font-medium text-foreground"
                                  >
                                    {DOSE_UNIT_OPTIONS.map((o) => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <Input
                                  type="number"
                                  step={doseUnit === "units" || doseUnit === "spray" || doseUnit === "drops" || doseUnit === "capsule" || doseUnit === "tablet" ? "1" : "0.01"}
                                  min="0"
                                  placeholder={protocolPresets.get(p.name)?.dose_per_injection_ml ? `Protocol: ${doseUnit === "units" ? mlToUnits(protocolPresets.get(p.name)!.dose_per_injection_ml!) + " Units" : protocolPresets.get(p.name)!.dose_per_injection_ml + (doseUnit === "ml" ? "ml" : ` ${formatDoseLabel(doseUnit)}`)}` : doseUnit === "units" ? "e.g. 10" : doseUnit === "ml" ? "e.g. 0.1" : "e.g. 1"}
                                  value={p.dose_per_injection_ml != null ? (doseUnit === "units" ? mlToUnits(p.dose_per_injection_ml) : p.dose_per_injection_ml) : ""}
                                  onChange={(e) => {
                                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                    const mlVal = val != null ? (doseUnit === "units" ? unitsToMl(val) : val) : undefined;
                                    updatePeptideField(p.name, "dose_per_injection_ml", mlVal);
                                  }}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Frequency</Label>
                                <select value={p.frequency ?? ""} onChange={(e) => updatePeptideField(p.name, "frequency", e.target.value || undefined)} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-sm">
                                  <option value="">{protocolPresets.get(p.name)?.frequency ? `Protocol: ${FREQUENCY_OPTIONS.find(f => f.value === protocolPresets.get(p.name)!.frequency)?.label || protocolPresets.get(p.name)!.frequency}` : "Select..."}</option>
                                  {FREQUENCY_OPTIONS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
                                </select>
                              </div>
                            </div>
                            {p.supply_days != null && (
                              <div className="flex items-center gap-2 rounded-md bg-accent/10 border border-accent/20 px-3 py-2">
                                <Activity className="h-4 w-4 text-accent shrink-0" />
                                <p className="text-sm font-medium">
                                  Vial lasts <span className="text-accent font-bold">{p.supply_days} days</span>
                                  {p.vial_size_ml && p.dose_per_injection_ml && (
                                    <span className="text-muted-foreground font-normal ml-1">({Math.floor(p.vial_size_ml / p.dose_per_injection_ml)} injections × {formatDose(p.dose_per_injection_ml, doseUnit)} from {p.vial_size_ml}ml vial)</span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setWizardStep("select")} className="flex-1" size="lg">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                      </Button>
                      <Button onClick={() => setWizardStep("labs")} className="flex-1" size="lg">
                        Next: Lab Tests <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ===== STEP 3: Lab Tests ===== */}
              {wizardStep === "labs" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-primary" /> Step 3: Blood Work Panel
                    </CardTitle>
                    <CardDescription>Review, add or remove lab tests. Click a test for clinical rationale.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tier Toggle */}
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <button
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                          labTier === "basic" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted/50 text-muted-foreground"
                        }`}
                        onClick={() => setLabTier("basic")}
                      >
                        <ShieldCheck className="h-4 w-4" /> Basic ({derivedBasicTests.filter((t) => !removedLabTests.has(t)).length})
                      </button>
                      <button
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                          labTier === "advanced" ? "bg-accent text-accent-foreground" : "bg-card hover:bg-muted/50 text-muted-foreground"
                        }`}
                        onClick={() => setLabTier("advanced")}
                      >
                        <Microscope className="h-4 w-4" /> Advanced ({derivedAdvancedTests.filter((t) => !removedLabTests.has(t)).length})
                      </button>
                    </div>

                    {/* Active tests */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Tests ({finalLabTests.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {finalLabTests.map((t, i) => {
                          const isCustom = customLabTests.includes(t);
                          const isBasic = derivedBasicTests.includes(t);
                          return (
                            <Badge
                              key={i}
                              variant={isCustom ? "outline" : isBasic ? "default" : "outline"}
                              className={`text-xs cursor-pointer group hover:ring-2 hover:ring-primary/30 transition-all pr-1 ${isCustom ? "border-accent bg-accent/10 text-accent" : !isBasic ? "border-accent/40 bg-accent/5 text-accent" : ""}`}
                            >
                              <span onClick={() => setSelectedLabTest(t)} className="mr-1">
                                {isBasic ? <ShieldCheck className="h-3 w-3 mr-1 inline" /> : <Microscope className="h-3 w-3 mr-1 inline" />}
                                {t}
                              </span>
                              <button onClick={() => removeLabTest(t)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {/* Removed tests — restore option */}
                    {removedLabTests.size > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Removed Tests</p>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(removedLabTests).map((t, i) => (
                            <Badge key={i} variant="outline" className="text-xs cursor-pointer opacity-50 hover:opacity-100 line-through" onClick={() => restoreLabTest(t)}>
                              {t} <Plus className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add test button */}
                    <Button variant="outline" size="sm" onClick={() => setAddLabOpen(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Lab Test
                    </Button>

                    {/* Lab Notes */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground" /> Lab Notes
                      </Label>
                      <Textarea value={labNotes} onChange={(e) => setLabNotes(e.target.value)} placeholder="Add any specific instructions for lab work..." className="min-h-[60px] text-sm" />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setWizardStep("configure")} className="flex-1" size="lg">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                      </Button>
                      <Button onClick={() => setWizardStep("supplements")} className="flex-1" size="lg">
                        Next: Supplements <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ===== STEP 4: Supplements ===== */}
              {wizardStep === "supplements" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" /> Step 4: Supplements
                    </CardTitle>
                    <CardDescription>Choose which supplements to include in the plan, then submit.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.recommended_supplements.length > 0 ? (
                      recommendations.recommended_supplements.map((s, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 text-sm rounded-lg border p-3 transition-colors cursor-pointer ${
                            selectedSupplements.has(s.name) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleSupplement(s.name)}
                        >
                          <Checkbox checked={selectedSupplements.has(s.name)} onCheckedChange={() => toggleSupplement(s.name)} className="mt-0.5" />
                          <div>
                            <span className="font-medium">{s.name}</span>
                            <span className="text-muted-foreground"> — {s.dosage}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No supplements recommended for this protocol.</p>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={() => setWizardStep("labs")} className="flex-1" size="lg">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                      </Button>
                      <Button onClick={confirmSelection} className="flex-1" size="lg">
                        <CheckCircle className="h-4 w-4 mr-2" /> Submit Consultation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          </>
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

        {/* Add Lab Test Dialog */}
        <Dialog open={addLabOpen} onOpenChange={setAddLabOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Lab Test</DialogTitle>
              <DialogDescription>Add a custom lab test to the panel.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input value={newLabName} onChange={(e) => setNewLabName(e.target.value)} placeholder="e.g. Vitamin D, Ferritin, CRP" onKeyDown={(e) => e.key === "Enter" && addCustomLabTest()} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddLabOpen(false)}>Cancel</Button>
              <Button onClick={addCustomLabTest} disabled={!newLabName.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PeptideDetailSheet peptideName={detailPeptide} open={!!detailPeptide} onOpenChange={(open) => !open && setDetailPeptide(null)} />

        {/* Add Medication Dialog */}
        <Dialog open={addMedOpen} onOpenChange={setAddMedOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Medication</DialogTitle>
              <DialogDescription>Manually add a peptide or medication to the prescription list.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <FormLabel>Medication Name *</FormLabel>
                <Input value={newMedName} onChange={(e) => setNewMedName(e.target.value)} placeholder="e.g. BPC-157, Sermorelin" />
              </div>
              <div className="space-y-2">
                <FormLabel>Dosage</FormLabel>
                <Input value={newMedDosage} onChange={(e) => setNewMedDosage(e.target.value)} placeholder="e.g. 250mcg twice daily" />
              </div>
              <div className="space-y-2">
                <FormLabel>Duration</FormLabel>
                <Input value={newMedDuration} onChange={(e) => setNewMedDuration(e.target.value)} placeholder="e.g. 4-8 weeks" />
              </div>
              <div className="space-y-2">
                <FormLabel>Administration Route</FormLabel>
                <Input value={newMedAdmin} onChange={(e) => setNewMedAdmin(e.target.value)} placeholder="e.g. Subcutaneous injection" />
              </div>
              <div className="space-y-2">
                <FormLabel>Priority</FormLabel>
                <div className="flex gap-2">
                  <Button variant={newMedPriority === "Primary" ? "default" : "outline"} size="sm" onClick={() => setNewMedPriority("Primary")}>Primary</Button>
                  <Button variant={newMedPriority === "Supportive" ? "default" : "outline"} size="sm" onClick={() => setNewMedPriority("Supportive")}>Supportive</Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMedOpen(false)}>Cancel</Button>
              <Button onClick={addManualPeptide} disabled={!newMedName.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>

        {/* Patient Info Sidebar */}
        {consultation && (
          <aside className="w-full lg:w-80 shrink-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
            {(() => {
              const intake = consultation.intake_answers as Record<string, any> || {};
              const age = intake.age ? Number(intake.age) : null;
              const gender = intake.gender || null;
              const heightVal = intake.height ? Number(intake.height) : null;
              const weightVal = intake.weight ? Number(intake.weight) : null;
              const bmi = heightVal && weightVal ? Number((weightVal / ((heightVal / 100) ** 2)).toFixed(1)) : null;
              const activityLevel = intake.activity_level || null;
              const bodyShape = intake.body_shape || null;
              const healthConditions = intake.health_conditions;
              const allergies = intake.allergies;
              const healthConditionsOther = intake.health_conditions_other;
              const allergiesOther = intake.allergies_other;
              const healthConditionsNotes = intake.health_conditions_notes;
              const allergiesNotes = intake.allergies_notes;
              const heightFt = heightVal ? Math.floor(heightVal / 30.48) : null;
              const heightIn = heightVal ? Math.round((heightVal / 2.54) % 12) : null;
              const weightLbs = weightVal ? Math.round(weightVal * 2.20462) : null;

              return (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                        <Scale className="h-3.5 w-3.5" /> Patient Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm font-semibold">{consultation.patient_name}</div>
                      {intake.mobile_number && (
                        <div className="text-xs text-muted-foreground">{intake.mobile_number}</div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {age && (
                          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Age</p>
                            <p className="text-sm font-bold">{age}y</p>
                          </div>
                        )}
                        {gender && (
                          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Gender</p>
                            <p className="text-sm font-bold">{gender}</p>
                          </div>
                        )}
                        {heightVal && (
                          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-center gap-1"><Ruler className="h-3 w-3" /> Height</p>
                            <p className="text-sm font-bold">{Math.round(heightVal)} cm</p>
                            <p className="text-[10px] text-muted-foreground">{heightFt}'{heightIn}"</p>
                          </div>
                        )}
                        {weightVal && (
                          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-center gap-1"><Weight className="h-3 w-3" /> Weight</p>
                            <p className="text-sm font-bold">{Math.round(weightVal)} kg</p>
                            <p className="text-[10px] text-muted-foreground">{weightLbs} lbs</p>
                          </div>
                        )}
                      </div>

                      {bmi && (
                        <div className={`p-2.5 rounded-lg flex justify-between items-center ${
                          bmi < 18.5 ? "bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300" :
                          bmi < 25 ? "bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300" :
                          bmi < 30 ? "bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300" :
                          "bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300"
                        }`}>
                          <span className="text-xs font-bold">BMI: {bmi}</span>
                          <span className="text-[10px] font-bold uppercase">
                            {bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese"}
                          </span>
                        </div>
                      )}

                      {(activityLevel || bodyShape) && (
                        <div className="border-t pt-3 space-y-2">
                          {activityLevel && (
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Activity</span>
                              <Badge variant="outline" className="text-[10px]">{activityLevel}</Badge>
                            </div>
                          )}
                          {bodyShape && (
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-muted-foreground">Body Shape</span>
                              <Badge variant="outline" className="text-[10px]">{bodyShape}</Badge>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Missed Appointment WhatsApp */}
                      <div className="border-t pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-[11px] gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                          onClick={() => {
                            const phone = intake.mobile_number || intake.phone || "";
                            const name = consultation.patient_name || "Patient";
                            const now = new Date();
                            const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const msg = `Dear ${name},\n\nWe attempted to contact you at your scheduled appointment time (${time}) today for your Weight Loss Program — GLP-1 medication consultation, but were unable to reach you.\n\nPlease reply with your preferred time and availability for a call back (today or tomorrow), and we will arrange it.\n\nKind regards,\n\nDr Sami M. Yesuf\nScope Certified Physician`;
                            openWhatsApp(phone, msg);
                          }}
                          disabled={!intake.mobile_number && !intake.phone}
                          title={(!intake.mobile_number && !intake.phone) ? "No phone number available" : "Send missed appointment message via WhatsApp"}
                        >
                          <MessageCircle className="h-3 w-3" /> Missed Appointment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Health Conditions */}
                  {healthConditions && Array.isArray(healthConditions) && healthConditions.length > 0 && (
                    <Card className="border-amber-200 dark:border-amber-900/30">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" /> Health Conditions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="flex flex-wrap gap-1.5">
                          {healthConditions.map((c: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{c}</Badge>
                          ))}
                          {healthConditionsOther && <Badge variant="secondary" className="text-[10px]">{healthConditionsOther}</Badge>}
                        </div>
                        {healthConditionsNotes && <p className="text-[11px] text-muted-foreground mt-2 italic">{healthConditionsNotes}</p>}
                      </CardContent>
                    </Card>
                  )}

                  {/* Allergies */}
                  {allergies && Array.isArray(allergies) && allergies.length > 0 && (
                    <Card className="border-rose-200 dark:border-rose-900/30">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3.5 w-3.5" /> Allergies
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="flex flex-wrap gap-1.5">
                          {allergies.map((a: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{a}</Badge>
                          ))}
                          {allergiesOther && <Badge variant="secondary" className="text-[10px]">{allergiesOther}</Badge>}
                        </div>
                        {allergiesNotes && <p className="text-[11px] text-muted-foreground mt-2 italic">{allergiesNotes}</p>}
                      </CardContent>
                    </Card>
                  )}

                  {/* Suggested Peptides from Matrix — visible during wizard */}
                  {!selectionConfirmed && consultation?.intake_answers?.health_goals && (
                    <LivePeptideSuggestions
                      healthGoals={
                        Array.isArray(consultation.intake_answers.health_goals)
                          ? consultation.intake_answers.health_goals
                          : [consultation.intake_answers.health_goals]
                      }
                    />
                  )}

                  {/* Prescribed Medications — sidebar summary */}
                  {selectionConfirmed && recommendations && (
                    <Card className="border-primary/20">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
                          <CheckCircle className="h-3.5 w-3.5" /> Prescribed Medications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-2">
                        {recommendations.recommended_peptides.filter(p => selectedPeptides.has(p.name)).map((p, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-medium">{p.name}</span>
                            <p className="text-muted-foreground">{p.dosage}, {p.administration}</p>
                            {p.supply_days != null && (
                              <p className="text-accent text-[10px]">Supply: {p.supply_days} days</p>
                            )}
                          </div>
                        ))}
                        {recommendations.recommended_supplements.filter(s => selectedSupplements.has(s.name)).length > 0 && (
                          <div className="border-t pt-2 mt-2">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Supplements</p>
                            {recommendations.recommended_supplements.filter(s => selectedSupplements.has(s.name)).map((s, i) => (
                              <div key={i} className="text-xs">
                                <span className="font-medium">{s.name}</span>
                                <span className="text-muted-foreground"> — {s.dosage}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              );
            })()}
          </aside>
        )}
        </div>
      </main>
    </div>
  );
}
