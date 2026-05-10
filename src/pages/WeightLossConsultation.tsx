import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, User, Copy, ClipboardCheck, ArrowLeft, Activity, Utensils, Zap, ThermometerSnowflake,
  Weight, Ruler, Heart, Flame, TrendingDown, Pill, AlertTriangle, MessageSquare, Scale, Loader2, Sparkles,
  StickyNote, FlaskConical, MessageCircle, Printer, Send, Pencil,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PatientGuideDisplay from "@/components/PatientGuideDisplay";
import { getBMICategory, getBMIColorClass, getDoseOptions, type MedicationType, type BloodTestLevel, generateClinicalSuggestion } from "@/data/glp1Config";
import { openWhatsApp } from "@/utils/whatsapp";
import { printPatientGuide } from "@/utils/printGuide";
import { sendGuideAsWhatsappText } from "@/utils/guideWhatsappText";
import { buildEmrOutput } from "@/utils/emrOutput";
import ShareGuideDialog from "@/components/ShareGuideDialog";
import CrossProgramHistoryStrip from "@/components/CrossProgramHistoryStrip";

const MEDICATION_OPTIONS: MedicationType[] = ["Mounjaro", "Wegovy", "Ozempic", "Rybelsus", "Other"];

export default function WeightLossConsultation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editMed, setEditMed] = useState<MedicationType | "">("");
  const [editDose, setEditDose] = useState("");
  const [editOtherDetail, setEditOtherDetail] = useState("");
  const [editBloodTest, setEditBloodTest] = useState<BloodTestLevel>("none");
  const [editNotes, setEditNotes] = useState("");
  const [editDoctorNotes, setEditDoctorNotes] = useState("");

  const { data: consultation, isLoading } = useQuery({
    queryKey: ["weight-loss-consultation", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleCopy = (text: string | undefined, section: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const generatePatientGuide = async () => {
    if (!consultation) return;
    setGenerating(true);
    try {
      const intake = consultation.intake_answers as any;
      const recs = consultation.ai_recommendations as any;
      const treatment = intake?.treatment || {};
      const patient = intake?.patient || {};

      const { data, error } = await supabase.functions.invoke("consultation", {
        body: {
          action: "generate-glp1-guide",
          patient_data: patient,
          treatment_data: treatment,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const guide = data?.guide || "";
      // Save to consultation
      const updatedRecs = { ...recs, patientGuide: guide };
      await supabase.from("consultations").update({
        ai_recommendations: updatedRecs,
        patient_guidelines: guide,
      }).eq("id", id);

      queryClient.invalidateQueries({ queryKey: ["weight-loss-consultation", id] });
      toast({ title: "Patient guide generated successfully" });
    } catch (e: any) {
      toast({ title: "Failed to generate guide", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleShareGuideWhatsApp = () => {
    if (!consultation || !patientGuide || !patient?.mobileNumber) return;
    setShareOpen(true);
  };

  const openEditDialog = () => {
    const recs = consultation?.ai_recommendations as any;
    const intake = consultation?.intake_answers as any;
    const treatment = intake?.treatment || {};
    setEditMed((recs?.medication || treatment?.medication || "") as MedicationType | "");
    setEditDose(recs?.dose || treatment?.dose || "");
    setEditOtherDetail(treatment?.otherDetail || "");
    setEditBloodTest((recs?.bloodTestLevel || treatment?.bloodTestLevel || "none") as BloodTestLevel);
    setEditNotes(treatment?.notes || "");
    setEditDoctorNotes(consultation?.doctor_notes || "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!consultation) return;
    setEditSaving(true);
    try {
      const intake = consultation.intake_answers as any;
      const oldRecs = consultation.ai_recommendations as any || {};
      const patient = intake?.patient || {};
      const followupData = intake?.followupData;

      // Update treatment in intake_answers
      const updatedTreatment = {
        ...(intake?.treatment || {}),
        medication: editMed,
        dose: editDose,
        otherDetail: editOtherDetail,
        bloodTestLevel: editBloodTest,
        notes: editNotes,
      };
      const updatedIntake = { ...intake, treatment: updatedTreatment };

      // Regenerate clinical suggestion
      const updatedSuggestion = generateClinicalSuggestion(
        { ...patient, ...updatedTreatment },
        updatedTreatment,
        followupData
      );

      const updatedRecs = {
        ...oldRecs,
        medication: editMed,
        dose: editDose,
        bloodTestLevel: editBloodTest,
        doctorSuggestions: updatedSuggestion,
      };

      await supabase.from("consultations").update({
        intake_answers: updatedIntake,
        ai_recommendations: updatedRecs,
        doctor_notes: editDoctorNotes,
      }).eq("id", consultation.id);

      queryClient.invalidateQueries({ queryKey: ["weight-loss-consultation", id] });
      setEditOpen(false);
      toast({ title: "Consultation updated successfully" });
    } catch (e: any) {
      toast({ title: "Failed to save changes", description: e.message, variant: "destructive" });
    }
    setEditSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-surface">
        <AppHeader title="Weight Loss Consultation" showBack />
        <main className="container mx-auto max-w-3xl px-4 py-12 text-center text-muted-foreground">Loading...</main>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="min-h-screen gradient-surface">
        <AppHeader title="Consultation Not Found" showBack />
        <main className="container mx-auto max-w-3xl px-4 py-12 text-center">
          <p className="text-muted-foreground">Consultation not found.</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">Back to Dashboard</Button>
        </main>
      </div>
    );
  }

  const recs = consultation.ai_recommendations as any;
  const doctorSuggestions = recs?.doctorSuggestions || "";
  const patientGuide = recs?.patientGuide || "";
  const medication = recs?.medication || "";
  const dose = recs?.dose || "";

  const intake = consultation.intake_answers as any;
  const patient = intake?.patient;
  const treatment = intake?.treatment;
  const followupData = intake?.followupData;
  const flowType = intake?.flowType;

  const emrOutput = buildEmrOutput({
    patient,
    treatment,
    recs,
    doctorNotes: consultation.doctor_notes,
    createdAt: consultation.created_at,
  });

  const bmi = patient?.bmi ? Number(patient.bmi) : null;
  const weight = patient?.weight ? Number(patient.weight) : null;
  const height = patient?.height ? Number(patient.height) : null;
  const age = patient?.age ? Number(patient.age) : null;
  const gender = patient?.gender || "";
  const activityLevel = patient?.activityLevel || "";
  const bmr = patient?.bmr ? Math.round(Number(patient.bmr)) : null;
  const dailyCalories = patient?.dailyCalories ? Math.round(Number(patient.dailyCalories)) : null;
  const weightLossCalories = patient?.weightLossCalories ? Math.round(Number(patient.weightLossCalories)) : null;
  const chronicIllnesses = patient?.chronicIllnesses || "";
  const medications = patient?.medications || "";
  const previousGlp1 = patient?.previousGlp1Use;
  const previousMed = patient?.previousMedication || "";
  const previousDose = patient?.previousDose || "";
  const isPregnant = patient?.isPregnant;
  const isBreastfeeding = patient?.isBreastfeeding;

  // Build talking points
  const talkingPoints: { color: string; icon: React.ReactNode; title: string; points: string[] }[] = [];

  // Medication talking points
  const medName = medication === "Other" ? treatment?.otherDetail || "Medication" : medication;
  if (medName) {
    const medPoints = [];
    if (["Mounjaro", "Wegovy", "Ozempic"].includes(medication)) {
      medPoints.push(`${medName} is a weekly subcutaneous injection`);
      medPoints.push("Inject in thigh, abdomen, or upper arm — rotate sites each week");
      medPoints.push("Store in refrigerator (2-8°C). Do not freeze.");
      if (medication === "Mounjaro") medPoints.push("Mounjaro targets both GIP and GLP-1 receptors for enhanced weight loss");
      if (medication === "Wegovy") medPoints.push("Wegovy is specifically FDA-approved for chronic weight management");
    } else if (medication === "Rybelsus") {
      medPoints.push(`${medName} is a daily oral GLP-1 tablet`);
      medPoints.push("Take on empty stomach with ≤ 4oz plain water, 30 min before food");
      medPoints.push("Store at room temperature. No refrigeration needed.");
    }
    if (dose) medPoints.push(`Current prescribed dose: ${dose}`);
    talkingPoints.push({
      color: "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20",
      icon: <Pill className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      title: "Medication & Administration",
      points: medPoints,
    });
  }

  // Nutrition talking points
  if (weight) {
    const proteinMin = Math.round(weight * 1.2);
    const proteinMax = Math.round(weight * 1.5);
    talkingPoints.push({
      color: "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20",
      icon: <Utensils className="h-4 w-4 text-green-600 dark:text-green-400" />,
      title: "Nutrition Guidance",
      points: [
        `Protein target: ${proteinMin}–${proteinMax}g/day (1.2–1.5g/kg)`,
        "Aim for 40-50% protein, 40-50% fiber-rich carbs, <20% fats",
        weightLossCalories ? `Calorie target: ~${weightLossCalories} kcal/day for weight loss` : "",
        "Eat slowly, stop when full — GLP-1 enhances satiety",
        "Stay well-hydrated: minimum 2L water/day",
      ].filter(Boolean),
    });
  }

  // Side effects talking points
  talkingPoints.push({
    color: "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20",
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    title: "Common Side Effects",
    points: [
      "Nausea — usually improves within 2-4 weeks; eat smaller, more frequent meals",
      "Constipation — increase fiber and water intake",
      "Decreased appetite — expected; ensure adequate protein intake",
      "Injection site reactions — mild redness/swelling is normal",
      "Contact clinic if severe vomiting, abdominal pain, or pancreatitis symptoms",
    ],
  });

  // Safety & Contraindications
  const safetyPoints: string[] = [];
  if (isPregnant) safetyPoints.push("⚠️ Patient is pregnant — GLP-1 medications are contraindicated");
  if (isBreastfeeding) safetyPoints.push("⚠️ Patient is breastfeeding — discuss risks vs. benefits");
  if (chronicIllnesses) safetyPoints.push(`Medical history: ${chronicIllnesses}`);
  if (medications) safetyPoints.push(`Current medications: ${medications}`);
  safetyPoints.push("Contraindicated in personal/family history of medullary thyroid carcinoma or MEN2");
  safetyPoints.push("Monitor for signs of pancreatitis, gallbladder disease");

  talkingPoints.push({
    color: "bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20",
    icon: <Heart className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
    title: "Safety & Contraindications",
    points: safetyPoints,
  });

  // Follow-up guidance
  const followupPoints = [
    "Schedule monthly follow-up to assess weight, side effects, and dose titration",
    previousGlp1 ? `Previous GLP-1 history: ${previousMed} ${previousDose}` : "First-time GLP-1 user — start at lowest dose",
  ];
  if (flowType === "followup" && followupData) {
    if (followupData.weightLost) followupPoints.unshift(`Weight lost since last visit: ${followupData.weightLost} kg`);
    if (followupData.sideEffects) followupPoints.unshift(`Reported side effects: ${followupData.sideEffects}`);
  }
  talkingPoints.push({
    color: "bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/20",
    icon: <MessageSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
    title: "Follow-up & Monitoring",
    points: followupPoints,
  });

  return (
    <div className="min-h-screen gradient-surface">
      <AppHeader title="Weight Loss Consultation" subtitle={consultation.patient_name} showBack>
        <Button variant="outline" size="sm" className="text-xs px-2 sm:px-3" onClick={openEditDialog}>
          <Pencil className="h-3 w-3 mr-1" /> Edit
        </Button>
      </AppHeader>

      <main className="container mx-auto px-4 py-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
          {/* Main Content */}
          <div className="flex-1 space-y-6 min-w-0">
            <CrossProgramHistoryStrip
              mobile={patient?.mobileNumber || ""}
              currentId={consultation.id}
            />
            {/* Clinical Record */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Clinical Record & Suggestions
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(doctorSuggestions, "clinical")}>
                    {copiedSection === "clinical" ? <ClipboardCheck className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedSection === "clinical" ? "Copied" : "Copy Record"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg border text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {doctorSuggestions || "No clinical suggestions recorded."}
                </div>
              </CardContent>
            </Card>

            {/* Doctor Notes */}
            {consultation.doctor_notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-primary" /> Doctor Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 p-4 rounded-lg border text-sm whitespace-pre-wrap leading-relaxed">
                    {consultation.doctor_notes}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Blood Test Status */}
            {recs?.bloodTestLevel && recs.bloodTestLevel !== "none" && (
              <Card className={recs.bloodTestLevel === "required" ? "border-primary/30" : "border-amber-200 dark:border-amber-900/30"}>
                <CardContent className="p-4 flex items-center gap-3">
                  <FlaskConical className={`h-5 w-5 ${recs.bloodTestLevel === "required" ? "text-primary" : "text-amber-500"}`} />
                  <div>
                    <p className="text-sm font-bold">
                      Blood Test {recs.bloodTestLevel === "required" ? "Required" : "Recommended"}
                    </p>
                    <a href="https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                      Dardoc Weight Loss Blood Test
                    </a>
                  </div>
                  <Badge variant={recs.bloodTestLevel === "required" ? "default" : "secondary"} className="ml-auto text-[10px]">
                    {recs.bloodTestLevel === "required" ? "REQUIRED" : "RECOMMENDED"}
                  </Badge>
                </CardContent>
              </Card>
            )}
            {/* Patient Guide */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-accent" /> Patient Care Guide
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={generatePatientGuide} disabled={generating}>
                      {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      {generating ? "Generating..." : patientGuide ? "Regenerate" : "Generate"}
                    </Button>
                    {patientGuide && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleCopy(patientGuide, "guide")}>
                          {copiedSection === "guide" ? <ClipboardCheck className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          {copiedSection === "guide" ? "Copied" : "Copy"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => printPatientGuide(patientGuide, consultation.patient_name)}
                        >
                          <Printer className="h-3 w-3 mr-1" /> Print / PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendGuideAsWhatsappText(patient?.mobileNumber || "", patientGuide, consultation.patient_name)}
                          disabled={!patient?.mobileNumber}
                          title={!patient?.mobileNumber ? "No phone number available" : "Send guide as WhatsApp text"}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp Text
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleShareGuideWhatsApp}
                          disabled={!patient?.mobileNumber}
                          title={!patient?.mobileNumber ? "No phone number available" : "Edit & send branded guide via WhatsApp"}
                        >
                          <Send className="h-3 w-3 mr-1" /> Send to Patient
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className="text-[10px]"><Activity className="h-3 w-3 mr-1" /> Weekly Injection</Badge>
                  <Badge variant="secondary" className="text-[10px]"><Utensils className="h-3 w-3 mr-1" /> High Protein Plan</Badge>
                  <Badge variant="secondary" className="text-[10px]"><Zap className="h-3 w-3 mr-1" /> TDEE Focused</Badge>
                  <Badge variant="secondary" className="text-[10px]"><ThermometerSnowflake className="h-3 w-3 mr-1" /> Refrigerated Storage</Badge>
                </div>
                <PatientGuideDisplay text={patientGuide} />
              </CardContent>
            </Card>

            {/* EMR Output */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> EMR Output
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(emrOutput, "emr")}>
                    {copiedSection === "emr" ? <ClipboardCheck className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedSection === "emr" ? "Copied" : "Copy EMR"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg border text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {emrOutput}
                </div>
              </CardContent>
            </Card>

            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
            </Button>
          </div>

          {/* Side Panel */}
          <aside className="w-full lg:w-80 shrink-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* Patient Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                  <Scale className="h-3.5 w-3.5" /> Patient Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                  {height && (
                    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-center gap-1"><Ruler className="h-3 w-3" /> Height</p>
                      <p className="text-sm font-bold">{Math.round(height)} cm</p>
                    </div>
                  )}
                  {weight && (
                    <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center justify-center gap-1"><Weight className="h-3 w-3" /> Weight</p>
                      <p className="text-sm font-bold">{Math.round(weight)} kg</p>
                    </div>
                  )}
                </div>

                {/* BMI */}
                {bmi && (
                  <div className={`p-2.5 rounded-lg flex justify-between items-center ${getBMIColorClass(bmi)}`}>
                    <span className="text-xs font-bold">BMI: {bmi.toFixed(1)}</span>
                    <span className="text-[10px] font-bold uppercase">{getBMICategory(bmi)}</span>
                  </div>
                )}

                {/* Metabolic */}
                <div className="border-t pt-3 space-y-2">
                  {bmr && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Flame className="h-3 w-3" /> BMR</span>
                      <span className="text-xs font-bold">{bmr} kcal</span>
                    </div>
                  )}
                  {dailyCalories && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Utensils className="h-3 w-3" /> TDEE</span>
                      <span className="text-xs font-bold">{dailyCalories} kcal</span>
                    </div>
                  )}
                  {weightLossCalories && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Target</span>
                      <span className="text-xs font-bold text-primary">{weightLossCalories} kcal</span>
                    </div>
                  )}
                  {activityLevel && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Activity</span>
                      <Badge variant="outline" className="text-[10px]">{activityLevel}</Badge>
                    </div>
                  )}
                </div>

                {/* Medication */}
                {medName && (
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Pill className="h-3 w-3" /> Rx</span>
                      <Badge className="text-[10px]">{medName} {dose}</Badge>
                    </div>
                  </div>
                )}
                {/* Missed Appointment WhatsApp */}
                <div className="border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[11px] gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                    onClick={() => {
                      const phone = patient?.mobileNumber || "";
                      const name = consultation.patient_name || "Patient";
                      const now = new Date();
                      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const msg = `Dear ${name},\n\nWe attempted to contact you at your scheduled appointment time (${time}) today for your Weight Loss Program — GLP-1 medication consultation, but were unable to reach you.\n\nPlease reply with your preferred time and availability for a call back (today or tomorrow), and we will arrange it.\n\nKind regards,\n\nDr Sami M. Yesuf\nScope Certified Physician`;
                      openWhatsApp(phone, msg);
                    }}
                    disabled={!patient?.mobileNumber}
                    title={!patient?.mobileNumber ? "No phone number available" : "Send missed appointment message via WhatsApp"}
                  >
                    <MessageCircle className="h-3 w-3" /> Missed Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Talking Points */}
            {talkingPoints.map((section, idx) => (
              <Card key={idx} className={`border ${section.color}`}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    {section.icon} {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <ul className="space-y-1.5">
                    {section.points.map((point, pidx) => (
                      <li key={pidx} className="text-[11px] leading-relaxed text-foreground/80 flex items-start gap-1.5">
                        <span className="text-muted-foreground mt-1 shrink-0">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </aside>
        </div>
      </main>

      {/* Edit Medication Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Edit Consultation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Medication</Label>
              <Select value={editMed} onValueChange={(v) => { setEditMed(v as MedicationType); setEditDose(""); }}>
                <SelectTrigger><SelectValue placeholder="Select medication" /></SelectTrigger>
                <SelectContent>
                  {MEDICATION_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editMed === "Other" && (
              <div className="space-y-2">
                <Label>Medication Name</Label>
                <Input value={editOtherDetail} onChange={(e) => setEditOtherDetail(e.target.value)} placeholder="Enter medication name" />
              </div>
            )}
            {editMed && editMed !== "Other" && (
              <div className="space-y-2">
                <Label>Dose</Label>
                <Select value={editDose} onValueChange={setEditDose}>
                  <SelectTrigger><SelectValue placeholder="Select dose" /></SelectTrigger>
                  <SelectContent>
                    {getDoseOptions(editMed).map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editMed === "Other" && (
              <div className="space-y-2">
                <Label>Dose</Label>
                <Input value={editDose} onChange={(e) => setEditDose(e.target.value)} placeholder="Enter dose" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Blood Test</Label>
              <Select value={editBloodTest} onValueChange={(v) => setEditBloodTest(v as BloodTestLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="required">Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Treatment Notes</Label>
              <Textarea rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Monthly followup, blood test, etc." />
            </div>
            <div className="space-y-2">
              <Label>Doctor Notes</Label>
              <Textarea rows={3} value={editDoctorNotes} onChange={(e) => setEditDoctorNotes(e.target.value)} placeholder="Additional doctor notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {consultation && patientGuide && (
        <ShareGuideDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          patientName={consultation.patient_name}
          phone={patient?.mobileNumber || ""}
          program="weight_loss"
          initialGuideText={patientGuide}
          weightLossSummary={{
            weightKg: weight,
            heightCm: height,
            bmi: bmi,
            bmiClass: bmi ? getBMICategory(bmi) : null,
            calorieTarget: weightLossCalories ?? dailyCalories ?? null,
            medication: medName || null,
            dose: dose || null,
          }}
        />
      )}
    </div>
  );
}
