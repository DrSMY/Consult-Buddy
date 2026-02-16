import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, UserPlus, History, CircleUser, Phone, Clock,
  CalendarDays, Ruler, Weight as WeightIcon, Calculator, Flame, Utensils,
  TrendingDown, Info, ClipboardList, Pill, StickyNote, FileText, Sparkles,
  BookOpen, Loader2, FlaskConical, Check, Wand2, RefreshCw, Copy, ClipboardCheck,
  Activity, Zap, ThermometerSnowflake, User, Search, AlertTriangle,
} from "lucide-react";
import {
  type GLP1Patient, type TreatmentPlan, type MedicationType, type FollowupData,
  Gender, ActivityLevel, ACTIVITY_MULTIPLIERS, ACTIVITY_DESCRIPTIONS,
  createEmptyPatient, createEmptyTreatment, createEmptyFollowup, getDoseOptions,
  calculateBMI, calculateBMR, getBMICategory, getBMIColorClass,
  generateClinicalSuggestion,
} from "@/data/glp1Config";
import AppHeader from "@/components/AppHeader";

type FlowType = "new" | "followup" | null;

export default function WeightLossIntake() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [flowType, setFlowType] = useState<FlowType>(null);
  const [step, setStep] = useState(0); // 0=identity, 1=clinical, 2=treatment, 3=summary
  const [patient, setPatient] = useState<GLP1Patient>(createEmptyPatient());
  const [treatment, setTreatment] = useState<TreatmentPlan>(createEmptyTreatment());
  const [saving, setSaving] = useState(false);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [smartInput, setSmartInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Follow-up state
  const [followup, setFollowup] = useState<FollowupData>(createEmptyFollowup());
  const [previousConsultations, setPreviousConsultations] = useState<any[]>([]);
  const [followupSearch, setFollowupSearch] = useState("");
  const [loadingFollowups, setLoadingFollowups] = useState(false);
  const [selectedPrevConsultation, setSelectedPrevConsultation] = useState<any>(null);
  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  // Auto-calculate BMI, BMR, calories
  useEffect(() => {
    if (!patient.height || !patient.weight) {
      if (patient.bmi !== null) setPatient(p => ({ ...p, bmi: null, bmr: null, dailyCalories: null, weightLossCalories: null }));
      return;
    }
    const h = Number(patient.height);
    const w = Number(patient.weight);
    const a = Number(patient.age);

    const bmi = calculateBMI(h, w);
    let bmr: number | null = null;
    let dailyCalories: number | null = null;
    let weightLossCalories: number | null = null;

    if (a && patient.gender) {
      bmr = calculateBMR(w, h, a, patient.gender);
      const multiplier = ACTIVITY_MULTIPLIERS[patient.activityLevel];
      dailyCalories = bmr * multiplier;
      weightLossCalories = Math.max(1200, dailyCalories - 500);
    }

    setPatient(p => ({ ...p, bmi, bmr, dailyCalories, weightLossCalories }));
  }, [patient.height, patient.weight, patient.age, patient.gender, patient.activityLevel]);

  // Auto-generate clinical suggestion
  useEffect(() => {
    if (treatment.medication) {
      const suggestion = generateClinicalSuggestion(patient, treatment);
      setTreatment(t => ({ ...t, doctorSuggestions: suggestion }));
    }
  }, [treatment.medication, treatment.dose, treatment.otherDetail, treatment.notes, treatment.bloodTestRequired, patient.mobileNumber, patient.name, patient.bmi, patient.previousGlp1Use, patient.previousMedication, patient.previousDose, patient.chronicIllnesses, patient.weight, patient.weightLossCalories, patient.bookingId, patient.gender]);

  // Load previous weight-loss consultations for follow-up
  useEffect(() => {
    if (flowType !== "followup" || !user) return;
    setLoadingFollowups(true);
    supabase
      .from("consultations")
      .select("*")
      .eq("program", "weight-loss")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPreviousConsultations(data || []);
        setLoadingFollowups(false);
      });
  }, [flowType, user]);

  const handleSelectPreviousPatient = (consultation: any) => {
    setSelectedPrevConsultation(consultation);
    const prevPatient = consultation.intake_answers?.patient;
    const prevTreatment = consultation.intake_answers?.treatment;
    if (prevPatient) {
      setPatient({
        ...createEmptyPatient(),
        name: prevPatient.name || "",
        mobileNumber: prevPatient.mobileNumber || "",
        bookingId: prevPatient.bookingId || "",
        age: prevPatient.age || "",
        gender: prevPatient.gender || Gender.Male,
        height: prevPatient.height || "",
        weight: prevPatient.weight || "",
        activityLevel: prevPatient.activityLevel || ActivityLevel.Sedentary,
        chronicIllnesses: prevPatient.chronicIllnesses || "",
        medications: prevPatient.medications || "",
        allergies: prevPatient.allergies || "",
        allergyNotes: prevPatient.allergyNotes || "",
        previousGlp1Use: true,
        previousMedication: prevTreatment?.medication || "",
        previousDose: prevTreatment?.dose || "",
      });
      setFollowup(f => ({
        ...f,
        previousDose: prevTreatment?.dose || prevTreatment?.otherDetail || "",
      }));
      setTreatment(t => ({
        ...t,
        medication: prevTreatment?.medication || "",
      }));
    }
    setStep(0); // go to identity (pre-filled)
  };

  const filteredPrevConsultations = previousConsultations.filter(c =>
    !followupSearch || c.patient_name?.toLowerCase().includes(followupSearch.toLowerCase())
  );

  const handleSmartFill = async () => {
    if (!smartInput.trim()) return;
    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("consultation", {
        body: {
          action: "smart-fill",
          raw_text: smartInput,
        },
      });
      if (error) throw error;
      if (data) {
        setPatient(p => ({
          ...p,
          ...(data.name && { name: data.name }),
          ...(data.mobileNumber && { mobileNumber: data.mobileNumber }),
          ...(data.bookingId && { bookingId: data.bookingId }),
          ...(data.bookingTime && { bookingTime: data.bookingTime }),
          ...(data.age && { age: Number(data.age) }),
          ...(data.gender && { gender: data.gender as Gender }),
          ...(data.height && { height: Number(data.height) }),
          ...(data.weight && { weight: Number(data.weight) }),
          ...(data.chronicIllnesses && { chronicIllnesses: data.chronicIllnesses }),
          ...(data.medications && { medications: data.medications }),
          ...(data.allergies && { allergies: data.allergies }),
        }));
        setSmartInput("");
      }
    } catch {
      toast({ title: "Smart Fill failed", description: "Could not parse the input.", variant: "destructive" });
    }
    setIsParsing(false);
  };

  const handleGenerateGuide = async () => {
    if (!treatment.medication) return;
    setIsGeneratingGuide(true);
    try {
      const { data, error } = await supabase.functions.invoke("consultation", {
        body: {
          action: "generate-glp1-guide",
          patient_data: patient,
          treatment_data: treatment,
        },
      });
      if (error) throw error;
      if (data?.guide) {
        setTreatment(t => ({ ...t, patientGuide: data.guide }));
      }
    } catch {
      toast({ title: "Guide generation failed", variant: "destructive" });
    }
    setIsGeneratingGuide(false);
  };

  const handleCopy = (text: string | undefined, section: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleSubmit = async () => {
    if (!user || !patient.name.trim()) {
      toast({ title: "Patient name required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const intakeAnswers = { patient, treatment, flowType, ...(flowType === "followup" ? { followupData: followup, previousConsultationId: selectedPrevConsultation?.id } : {}) };

    const { data, error } = await supabase
      .from("consultations")
      .insert({
        user_id: user.id,
        patient_name: patient.name,
        program: "weight-loss",
        intake_answers: intakeAnswers as any,
        ai_recommendations: {
          doctorSuggestions: treatment.doctorSuggestions,
          patientGuide: treatment.patientGuide,
          medication: treatment.medication,
          dose: treatment.dose,
          bloodTestRequired: treatment.bloodTestRequired,
        } as any,
        status: "completed",
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Consultation saved" });
      navigate(`/consultation/${data.id}`);
    }
    setSaving(false);
  };

  const updatePatient = (field: keyof GLP1Patient, value: any) => {
    setPatient(p => ({ ...p, [field]: value }));
  };

  const updateTreatment = (field: keyof TreatmentPlan, value: any) => {
    setTreatment(t => ({ ...t, [field]: value }));
  };

  const isIdentityValid = patient.name && patient.mobileNumber && patient.age && patient.height && patient.weight;
  const isTreatmentComplete = treatment.medication !== "" && (treatment.medication === "Other" ? !!treatment.otherDetail : !!treatment.dose);

  // ---- SELECTION SCREEN ----
  if (flowType === null) {
    return (
      <div className="min-h-screen gradient-surface">
        <AppHeader title="Weight Loss / GLP-1" subtitle="Select encounter type" showBack />
        <main className="container mx-auto max-w-3xl px-4 py-12 animate-fade-in">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">Select Encounter Type</h2>
            <p className="text-muted-foreground mt-2">Choose how to proceed with this patient.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card
              className="cursor-pointer group hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              onClick={() => setFlowType("new")}
            >
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UserPlus className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">New Patient</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Full intake: demographics, medical history, and clinical analysis.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer group hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              onClick={() => setFlowType("followup")}
            >
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <History className="h-7 w-7 text-secondary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Patient Follow-up</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review progress, adjust dosages, and manage side effects.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // ---- FOLLOW-UP PATIENT SEARCH ----
  if (flowType === "followup" && !selectedPrevConsultation) {
    return (
      <div className="min-h-screen gradient-surface">
        <AppHeader title="Weight Loss / GLP-1" subtitle="Select previous patient" showBack />
        <main className="container mx-auto max-w-3xl px-4 py-8 animate-fade-in">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Follow-up Visit</h2>
            <p className="text-muted-foreground mt-1">Select a previous weight-loss patient to continue their journey.</p>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name..."
              value={followupSearch}
              onChange={e => setFollowupSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {loadingFollowups ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredPrevConsultations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No previous weight-loss patients found</p>
                <p className="text-sm mt-1">You can start a new follow-up encounter manually.</p>
                <Button className="mt-4" onClick={() => { setSelectedPrevConsultation({}); setStep(0); }}>
                  <UserPlus className="h-4 w-4 mr-1" /> New Follow-up Patient
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredPrevConsultations.map(c => {
                const prevPatient = c.intake_answers?.patient;
                const prevTreatment = c.intake_answers?.treatment;
                return (
                  <Card
                    key={c.id}
                    className="cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
                    onClick={() => handleSelectPreviousPatient(c)}
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{c.patient_name || "Unnamed"}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{new Date(c.created_at).toLocaleDateString()}</span>
                          {prevTreatment?.medication && (
                            <Badge variant="secondary" className="text-[10px]">
                              {prevTreatment.medication} {prevTreatment.dose || ""}
                            </Badge>
                          )}
                          {prevPatient?.weight && <span>{prevPatient.weight}kg</span>}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setFlowType(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={() => { setSelectedPrevConsultation({}); setStep(0); }}>
              <UserPlus className="h-4 w-4 mr-1" /> New Follow-up Patient
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Patient summary component for the sidebar
  const PatientSummary = () => {
    const bmi = patient.bmi;
    const weight = typeof patient.weight === "number" ? patient.weight : null;
    const height = typeof patient.height === "number" ? patient.height : null;
    const age = typeof patient.age === "number" ? patient.age : null;
    const bmr = patient.bmr ? Math.round(patient.bmr) : null;
    const dailyCal = patient.dailyCalories ? Math.round(patient.dailyCalories) : null;
    const wlCal = patient.weightLossCalories ? Math.round(patient.weightLossCalories) : null;

    if (!patient.name && !age && !weight) return null;

    return (
      <Card className="lg:sticky lg:top-6 lg:self-start">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
            <CircleUser className="h-3.5 w-3.5" /> Patient Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {patient.name && (
            <div className="text-sm font-semibold">{patient.name}</div>
          )}
          {patient.bookingId && (
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Booking</span>
              <span className="text-xs font-bold">{patient.bookingId}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {age && (
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Age</p>
                <p className="text-sm font-bold">{age}y</p>
              </div>
            )}
            {patient.gender && (
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Gender</p>
                <p className="text-sm font-bold">{patient.gender}</p>
              </div>
            )}
            {height && (
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Height</p>
                <p className="text-sm font-bold">{Math.round(height)} cm</p>
              </div>
            )}
            {weight && (
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Weight</p>
                <p className="text-sm font-bold">{Math.round(weight)} kg</p>
              </div>
            )}
          </div>
          {bmi && (
            <div className={`p-2 rounded-lg flex justify-between items-center ${getBMIColorClass(bmi)}`}>
              <span className="text-xs font-bold">BMI: {bmi.toFixed(1)}</span>
              <span className="text-[10px] font-bold uppercase">{getBMICategory(bmi)}</span>
            </div>
          )}
          {(bmr || dailyCal || wlCal) && (
            <div className="border-t pt-2 space-y-1.5">
              {bmr && (
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Flame className="h-3 w-3" /> BMR</span>
                  <span className="text-xs font-bold">{bmr} kcal</span>
                </div>
              )}
              {dailyCal && (
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Utensils className="h-3 w-3" /> TDEE</span>
                  <span className="text-xs font-bold">{dailyCal} kcal</span>
                </div>
              )}
              {wlCal && (
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Target</span>
                  <span className="text-xs font-bold text-primary">{wlCal} kcal</span>
                </div>
              )}
            </div>
          )}
          {patient.allergies && (
            <div className="border-t pt-2">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Allergies
              </span>
              <p className="text-xs mt-0.5">{patient.allergies}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ---- MAIN MULTI-STEP FORM ----
  return (
    <div className="min-h-screen gradient-surface">
      <AppHeader title="Weight Loss / GLP-1" subtitle={`Step ${step + 1} of ${totalSteps}`} showBack />

      <main className="container mx-auto max-w-5xl px-4 py-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* STEP 0: Identity */}
        {step === 0 && (
          <div className="space-y-6">
            {/* Smart Fill */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <Label className="text-sm font-bold flex items-center gap-2 mb-2">
                  <Wand2 className="h-4 w-4 text-primary" /> AI Smart Fill
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ahmed Ali, 0501234567, 35y Male, 180cm, 95kg..."
                    value={smartInput}
                    onChange={e => setSmartInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSmartFill()}
                  />
                  <Button onClick={handleSmartFill} disabled={isParsing || !smartInput} size="sm">
                    {isParsing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    <span className="ml-1">{isParsing ? "Parsing..." : "Fill"}</span>
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Paste raw patient data to auto-extract fields</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CircleUser className="h-5 w-5 text-muted-foreground" /> Identity & Demographics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Booking Ref</Label>
                    <Input value={patient.bookingId} onChange={e => updatePatient("bookingId", e.target.value)} placeholder="#12345" className="mt-1" />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Appointment Time</Label>
                    <Input type="time" value={patient.bookingTime} onChange={e => updatePatient("bookingTime", e.target.value)} className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input value={patient.name} onChange={e => updatePatient("name", e.target.value)} placeholder="Patient Full Name" className="mt-1" />
                </div>

                <div>
                  <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Mobile Number <span className="text-destructive">*</span></Label>
                  <Input value={patient.mobileNumber} onChange={e => updatePatient("mobileNumber", e.target.value)} placeholder="+971..." className="mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Age <span className="text-destructive">*</span></Label>
                    <Input type="number" value={patient.age} onChange={e => updatePatient("age", e.target.value === "" ? "" : Number(e.target.value))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={patient.gender}
                      onChange={e => updatePatient("gender", e.target.value as Gender)}
                    >
                      <option value={Gender.Male}>Male</option>
                      <option value={Gender.Female}>Female</option>
                      <option value={Gender.Other}>Other</option>
                    </select>
                  </div>
                </div>

                {/* Height */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> Height <span className="text-destructive">*</span></Label>
                      <div className="flex bg-secondary rounded-md p-0.5 text-[10px] font-bold">
                        <button type="button" onClick={() => setHeightUnit("cm")} className={`px-2 py-0.5 rounded transition-all ${heightUnit === "cm" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}>CM</button>
                        <button type="button" onClick={() => setHeightUnit("ft")} className={`px-2 py-0.5 rounded transition-all ${heightUnit === "ft" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}>FT</button>
                      </div>
                    </div>
                    {heightUnit === "cm" ? (
                      <div className="relative">
                        <Input type="number" value={patient.height} onChange={e => updatePatient("height", e.target.value === "" ? "" : Number(e.target.value))} />
                        <span className="absolute right-3 top-2.5 text-muted-foreground text-xs font-bold">cm</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input type="number" value={patient.height ? Math.floor(Number(patient.height) / 30.48) : ""} onChange={e => {
                            const ft = Number(e.target.value);
                            const currIn = patient.height ? Math.round((Number(patient.height) / 2.54) % 12) : 0;
                            updatePatient("height", (ft * 12 + currIn) * 2.54);
                          }} />
                          <span className="absolute right-3 top-2.5 text-muted-foreground text-xs font-bold">ft</span>
                        </div>
                        <div className="relative flex-1">
                          <Input type="number" value={patient.height ? Math.round((Number(patient.height) / 2.54) % 12) : ""} onChange={e => {
                            const inches = Number(e.target.value);
                            const currFt = patient.height ? Math.floor(Number(patient.height) / 30.48) : 0;
                            updatePatient("height", (currFt * 12 + inches) * 2.54);
                          }} />
                          <span className="absolute right-3 top-2.5 text-muted-foreground text-xs font-bold">in</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Weight */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label className="flex items-center gap-1"><WeightIcon className="h-3.5 w-3.5" /> Weight <span className="text-destructive">*</span></Label>
                      <div className="flex bg-secondary rounded-md p-0.5 text-[10px] font-bold">
                        <button type="button" onClick={() => setWeightUnit("kg")} className={`px-2 py-0.5 rounded transition-all ${weightUnit === "kg" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}>KG</button>
                        <button type="button" onClick={() => setWeightUnit("lbs")} className={`px-2 py-0.5 rounded transition-all ${weightUnit === "lbs" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}>LBS</button>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        value={patient.weight === "" ? "" : weightUnit === "kg" ? patient.weight : (Number(patient.weight) * 2.20462).toFixed(1)}
                        onChange={e => {
                          if (e.target.value === "") updatePatient("weight", "");
                          else {
                            const num = Number(e.target.value);
                            updatePatient("weight", weightUnit === "kg" ? num : num / 2.20462);
                          }
                        }}
                      />
                      <span className="absolute right-3 top-2.5 text-muted-foreground text-xs font-bold uppercase">{weightUnit}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 1: Clinical Analysis */}
        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-muted-foreground" /> Vitals & Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* BMI Badge */}
                <div className={`p-3 rounded-lg flex justify-between items-center ${getBMIColorClass(patient.bmi)}`}>
                  <span className="font-semibold text-sm">BMI: {patient.bmi ? patient.bmi.toFixed(1) : "--"}</span>
                  <span className="text-xs font-bold uppercase tracking-wide">{patient.bmi ? getBMICategory(patient.bmi) : "Waiting for data..."}</span>
                </div>

                {/* Activity Level */}
                <div>
                  <Label>Activity Level</Label>
                  <select
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={patient.activityLevel}
                    onChange={e => updatePatient("activityLevel", e.target.value as ActivityLevel)}
                  >
                    {Object.values(ActivityLevel).map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <div className="bg-primary/5 border border-primary/10 p-2.5 rounded-lg mt-2 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-foreground/70 font-medium italic">{ACTIVITY_DESCRIPTIONS[patient.activityLevel]}</p>
                  </div>
                </div>

                {/* Metabolic Stats */}
                <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg border border-orange-100 dark:border-orange-900/20 space-y-3">
                  <h3 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
                    <Flame className="h-3 w-3" /> Metabolic Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">BMR (Resting)</p>
                      <p className="text-lg font-bold">{patient.bmr ? Math.round(patient.bmr) : "--"} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Utensils className="h-3 w-3" /> Maintenance</p>
                      <p className="text-lg font-bold">{patient.dailyCalories ? Math.round(patient.dailyCalories) : "--"} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-orange-100 dark:border-orange-900/20">
                    <p className="text-xs text-orange-700 dark:text-orange-400 mb-1 flex items-center gap-1 font-semibold">
                      <TrendingDown className="h-3 w-3" /> Weight Loss Target
                    </p>
                    <p className="text-xl font-extrabold text-orange-600 dark:text-orange-400">
                      {patient.weightLossCalories ? Math.round(patient.weightLossCalories) : "--"} <span className="text-xs font-normal">kcal/day</span>
                    </p>
                  </div>
                </div>

                {/* Pregnancy screening */}
                {patient.gender === Gender.Female && (
                  <div className="bg-pink-50 dark:bg-pink-900/10 p-4 rounded-lg border border-pink-100 dark:border-pink-900/20">
                    <h3 className="text-xs font-bold text-pink-500 uppercase tracking-wider mb-3">Pregnancy Screening</h3>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2">
                        <Checkbox checked={patient.isPregnant} onCheckedChange={v => updatePatient("isPregnant", !!v)} />
                        <span className="text-sm">Is Pregnant?</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox checked={patient.isBreastfeeding} onCheckedChange={v => updatePatient("isBreastfeeding", !!v)} />
                        <span className="text-sm">Is Breastfeeding?</span>
                      </label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medical History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" /> Medical History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Chronic Illnesses</Label>
                  <Textarea rows={2} placeholder="e.g. Hypertension, Type 2 Diabetes..." value={patient.chronicIllnesses} onChange={e => updatePatient("chronicIllnesses", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Current Medications</Label>
                  <Textarea rows={2} placeholder="e.g. Metformin 500mg..." value={patient.medications} onChange={e => updatePatient("medications", e.target.value)} className="mt-1" />
                </div>

                {/* Allergy History */}
                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-900/20 space-y-3">
                  <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Allergy History
                  </h3>
                  <div>
                    <Label className="text-sm">Known Allergies</Label>
                    <Textarea rows={2} placeholder="e.g. Penicillin, Shellfish, Latex..." value={patient.allergies} onChange={e => updatePatient("allergies", e.target.value)} className="mt-1" />
                  </div>
                  {patient.allergies.trim() && (
                    <div className="animate-fade-in">
                      <Label className="text-xs text-muted-foreground">Allergy Notes (severity, reactions, etc.)</Label>
                      <Textarea rows={2} placeholder="e.g. Severe anaphylaxis to penicillin, mild rash with shellfish..." value={patient.allergyNotes} onChange={e => updatePatient("allergyNotes", e.target.value)} className="mt-1 text-sm" />
                    </div>
                  )}
                </div>

                {/* GLP-1 History */}
                <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                  <label className="flex items-center space-x-2">
                    <Checkbox checked={patient.previousGlp1Use} onCheckedChange={v => updatePatient("previousGlp1Use", !!v)} />
                    <span className="text-sm font-bold flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Previous History of GLP-1 Use
                    </span>
                  </label>
                  {patient.previousGlp1Use && (
                    <div className="ml-6 grid grid-cols-2 gap-3 animate-fade-in">
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Medication</Label>
                        <select
                          className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                          value={patient.previousMedication}
                          onChange={e => updatePatient("previousMedication", e.target.value as MedicationType)}
                        >
                          <option value="">Select...</option>
                          <option value="Mounjaro">Mounjaro</option>
                          <option value="Wegovy">Wegovy</option>
                          <option value="Ozempic">Ozempic</option>
                          <option value="Rybelsus">Rybelsus</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Last Dose</Label>
                        {["Mounjaro", "Wegovy", "Ozempic", "Rybelsus"].includes(patient.previousMedication) ? (
                          <select
                            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                            value={patient.previousDose}
                            onChange={e => updatePatient("previousDose", e.target.value)}
                          >
                            <option value="">Select...</option>
                            {getDoseOptions(patient.previousMedication as MedicationType).map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        ) : (
                          <Input value={patient.previousDose} onChange={e => updatePatient("previousDose", e.target.value)} placeholder="e.g. 10mg" className="mt-1 h-9 text-xs" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Follow-up Tracking (only for follow-up visits) */}
            {flowType === "followup" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" /> Follow-up Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Previous Dose</Label>
                      <Input value={followup.previousDose} readOnly className="mt-1 bg-muted/50" />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Weight Lost (kg)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 3.5"
                        value={followup.weightLost}
                        onChange={e => setFollowup(f => ({ ...f, weightLost: e.target.value === "" ? "" : Number(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Side Effects</Label>
                    <Textarea
                      rows={2}
                      placeholder="e.g. Mild nausea, no vomiting..."
                      value={followup.sideEffects}
                      onChange={e => setFollowup(f => ({ ...f, sideEffects: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Follow-up Notes</Label>
                    <Textarea
                      rows={2}
                      placeholder="e.g. Patient tolerating well, ready for dose escalation..."
                      value={followup.notes}
                      onChange={e => setFollowup(f => ({ ...f, notes: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* STEP 2: Treatment Plan */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Pill className="h-5 w-5 text-primary" /> Select Medication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(["Mounjaro", "Wegovy", "Ozempic", "Rybelsus", "Other"] as MedicationType[]).map(med => (
                    <div
                      key={med}
                      onClick={() => updateTreatment("medication", med)}
                      className={`cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center justify-center gap-2 transition-all ${
                        treatment.medication === med
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${treatment.medication === med ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                        {treatment.medication === med && <Check className="h-2 w-2 text-primary-foreground" />}
                      </div>
                      <span className="text-xs font-bold">{med}</span>
                    </div>
                  ))}
                </div>

                {treatment.medication && treatment.medication !== "Other" && (
                  <div className="animate-fade-in">
                    <Label>Prescribed Dose ({treatment.medication})</Label>
                    <select
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={treatment.dose}
                      onChange={e => updateTreatment("dose", e.target.value)}
                    >
                      <option value="">Select Dose...</option>
                      {getDoseOptions(treatment.medication).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                {treatment.medication === "Other" && (
                  <div className="animate-fade-in">
                    <Label>Specify Treatment</Label>
                    <Input value={treatment.otherDetail} onChange={e => updateTreatment("otherDetail", e.target.value)} placeholder="Enter medication name..." className="mt-1" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Blood Test */}
            <Card>
              <CardContent className="p-4">
                <button
                  type="button"
                  onClick={() => updateTreatment("bloodTestRequired", !treatment.bloodTestRequired)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    treatment.bloodTestRequired ? "bg-primary/5 border-primary/30 text-primary" : "bg-background border-border text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={`p-2 rounded-lg ${treatment.bloodTestRequired ? "bg-primary/10" : "bg-muted"}`}>
                      <FlaskConical className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Weight Loss Blood Test Required</p>
                      <p className="text-[10px] opacity-70">Include Dardoc reference link in patient guide</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${treatment.bloodTestRequired ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                    {treatment.bloodTestRequired && <Check className="h-4 w-4 text-primary-foreground" />}
                  </div>
                </button>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-orange-600" /> Additional Treatment Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea rows={3} value={treatment.notes} onChange={e => updateTreatment("notes", e.target.value)} placeholder="e.g. He needs monthly followup..." />
                <p className="mt-2 text-[10px] text-muted-foreground">This note will be appended to the clinical suggestion.</p>
              </CardContent>
            </Card>

            {/* Clinical Suggestion */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Clinical Suggestion
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => {
                    const s = generateClinicalSuggestion(patient, treatment);
                    updateTreatment("doctorSuggestions", s);
                  }} disabled={!treatment.medication}>
                    <Sparkles className="h-3 w-3 mr-1" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea rows={6} value={treatment.doctorSuggestions} onChange={e => updateTreatment("doctorSuggestions", e.target.value)} className="font-mono text-xs" />
              </CardContent>
            </Card>

            {/* AI Patient Guide */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-accent" /> Patient Guide (AI)
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleGenerateGuide} disabled={!treatment.medication || isGeneratingGuide}>
                    {isGeneratingGuide ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    {isGeneratingGuide ? "Generating..." : "Generate AI Guide"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea rows={10} value={treatment.patientGuide} onChange={e => updateTreatment("patientGuide", e.target.value)} className="font-mono text-xs" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 3: Summary */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Clinical Record */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Clinical Record & Suggestions
                  </CardTitle>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleCopy(treatment.doctorSuggestions, "clinical")}
                  >
                    {copiedSection === "clinical" ? <ClipboardCheck className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedSection === "clinical" ? "Copied" : "Copy Record"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg border text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {treatment.doctorSuggestions || "No suggestions recorded."}
                </div>
              </CardContent>
            </Card>

            {/* Patient Guide */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-accent" /> Patient Care Guide
                  </CardTitle>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleCopy(treatment.patientGuide, "guide")}
                  >
                    {copiedSection === "guide" ? <ClipboardCheck className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedSection === "guide" ? "Copied" : "Copy Guide"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className="text-[10px]"><Activity className="h-3 w-3 mr-1" /> Weekly Injection</Badge>
                  <Badge variant="secondary" className="text-[10px]"><Utensils className="h-3 w-3 mr-1" /> High Protein Plan</Badge>
                  <Badge variant="secondary" className="text-[10px]"><Zap className="h-3 w-3 mr-1" /> TDEE Focused</Badge>
                  <Badge variant="secondary" className="text-[10px]"><ThermometerSnowflake className="h-3 w-3 mr-1" /> Refrigerated Storage</Badge>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border text-sm whitespace-pre-wrap leading-relaxed">
                  {treatment.patientGuide || "Patient guide not yet generated."}
                </div>
              </CardContent>
            </Card>

            {/* Confirm Banner */}
            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 p-4 rounded-lg flex items-start gap-3">
              <Check className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-orange-900 dark:text-orange-400 uppercase tracking-wider">Ready to Finalize?</p>
                <p className="text-[11px] text-orange-800 dark:text-orange-300 mt-1">
                  Confirming will save this record. You can copy sections above for your EMR or share the care guide with {patient.name}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 0) setFlowType(null);
              else setStep(s => s - 1);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !isIdentityValid}
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving || !isTreatmentComplete}>
              {saving ? "Saving..." : "Confirm & Save Encounter"}
              <Check className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
          </div>

          {/* Patient Summary Sidebar - visible throughout */}
          <aside className="w-full lg:w-72 shrink-0 space-y-4">
            <PatientSummary />
          </aside>
        </div>
      </main>
    </div>
  );
}
