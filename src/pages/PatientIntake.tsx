import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { intakeQuestions, getVisibleQuestions, intakeSections } from "@/data/intakeQuestions";
import { ArrowLeft, ArrowRight, Mic, MicOff, Check, Ruler, Weight as WeightIcon, Wand2, RefreshCw, MessageCircle, UserPlus, History, Search, AlertTriangle, Loader2, Pill, StickyNote } from "lucide-react";
import { openWhatsApp } from "@/utils/whatsapp";
import type { IntakeQuestion } from "@/data/intakeQuestions";
import AppHeader from "@/components/AppHeader";
import LivePeptideSuggestions from "@/components/LivePeptideSuggestions";
import PatientSummaryCard from "@/components/PatientSummaryCard";
import ProgramPrescriptionStats from "@/components/ProgramPrescriptionStats";
import { CalendarDays, Clock } from "lucide-react";

// Mandatory question IDs that must be answered
const MANDATORY_QUESTIONS = new Set(["gender", "age", "height", "weight", "health_goals"]);

const isClinician = (roles: string[]) => roles.includes("doctor") || roles.includes("nurse");

export default function PatientIntake() {
  const { programId } = useParams();
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && roles.length > 0 && !isClinician(roles)) {
      toast({ title: "Access Restricted", description: "As a non-clinician, you do not have access to this function.", variant: "destructive" });
      navigate("/dashboard", { replace: true });
    }
  }, [roles, loading]);

  const [flowType, setFlowType] = useState<"new" | "followup" | null>(null);
  const [previousConsultations, setPreviousConsultations] = useState<any[]>([]);
  const [followupSearch, setFollowupSearch] = useState("");
  const [loadingFollowups, setLoadingFollowups] = useState(false);
  const [selectedPrevConsultation, setSelectedPrevConsultation] = useState<any>(null);
  const [followupNotes, setFollowupNotes] = useState("");
  const [followupSideEffects, setFollowupSideEffects] = useState("");

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [gateAnswers, setGateAnswers] = useState<Record<string, "yes" | "no" | null>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [patientName, setPatientName] = useState("");
  const [saving, setSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [smartInput, setSmartInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Load previous peptide consultations for follow-up
  useEffect(() => {
    if (flowType !== "followup" || !user) return;
    setLoadingFollowups(true);
    supabase
      .from("consultations")
      .select("*")
      .eq("program", programId || "peptides")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPreviousConsultations(data || []);
        setLoadingFollowups(false);
      });
  }, [flowType, user, programId]);

  const filteredPrevConsultations = previousConsultations.filter(c =>
    !followupSearch || c.patient_name?.toLowerCase().includes(followupSearch.toLowerCase())
  );

  const handleSelectPreviousPatient = (consultation: any) => {
    setSelectedPrevConsultation(consultation);
    const intake = (consultation.intake_answers as Record<string, any>) || {};
    setPatientName(consultation.patient_name || "");
    const prefilled: Record<string, string | string[]> = {};
    const prefilledOther: Record<string, string> = {};
    const prefilledNotes: Record<string, string> = {};
    const prefilledGates: Record<string, "yes" | "no" | null> = {};
    for (const [k, v] of Object.entries(intake)) {
      if (["flowType", "followupData", "previousConsultationId", "previousProtocol"].includes(k)) continue;
      if (k.endsWith("_other")) prefilledOther[k.replace(/_other$/, "")] = String(v ?? "");
      else if (k.endsWith("_notes")) prefilledNotes[k.replace(/_notes$/, "")] = String(v ?? "");
      else prefilled[k] = v as any;
    }
    for (const k of Object.keys(prefilled)) {
      if (Array.isArray(prefilled[k]) && (prefilled[k] as string[]).length > 0) prefilledGates[k] = "yes";
    }
    setAnswers(prefilled);
    setOtherText(prefilledOther);
    setNotes(prefilledNotes);
    setGateAnswers(prefilledGates);
    setCurrentStep(0);
  };

  const visibleQuestions = getVisibleQuestions(answers);
  const sections = [...new Set(visibleQuestions.map((q) => q.section))];
  const currentSection = sections[currentStep] || sections[0];
  const sectionQuestions = visibleQuestions.filter((q) => q.section === currentSection);
  const progress = ((currentStep + 1) / Math.max(sections.length, 1)) * 100;

  const setAnswer = (id: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const toggleMultiSelect = (id: string, option: string) => {
    const current = (answers[id] as string[]) || [];
    setAnswer(id, current.includes(option) ? current.filter((v) => v !== option) : [...current, option]);
  };

  const handleGateChange = (id: string, value: "yes" | "no") => {
    setGateAnswers((prev) => ({ ...prev, [id]: value }));
    if (value === "no") {
      setAnswer(id, []);
      setOtherText((prev) => ({ ...prev, [id]: "" }));
      setNotes((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const isQuestionAnswered = (q: IntakeQuestion): boolean => {
    const val = answers[q.id];
    if (q.type === "multiselect") {
      if (q.hasGate) return gateAnswers[q.id] != null;
      return Array.isArray(val) && val.length > 0;
    }
    return val != null && String(val).trim() !== "";
  };

  const isMissing = (q: IntakeQuestion): boolean => {
    return MANDATORY_QUESTIONS.has(q.id) && !isQuestionAnswered(q);
  };

  const getMissingSectionQuestions = () => {
    return sectionQuestions.filter(isMissing);
  };

  const handleNext = () => {
    const missing = getMissingSectionQuestions();
    // Also check patient name on step 0
    if (currentStep === 0 && !patientName.trim()) {
      setShowValidation(true);
      toast({ title: "Required fields missing", description: "Please fill in all highlighted fields.", variant: "destructive" });
      return;
    }
    if (missing.length > 0) {
      setShowValidation(true);
      toast({ title: "Required fields missing", description: `Please answer: ${missing.map(q => q.question).join(", ")}`, variant: "destructive" });
      return;
    }
    setShowValidation(false);
    setCurrentStep((s) => s + 1);
  };

  const startSpeechToText = (fieldId: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Speech not supported", description: "Your browser doesn't support speech recognition.", variant: "destructive" });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setAnswer(fieldId, transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setActiveField(null);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setActiveField(null);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setActiveField(fieldId);
  };

  const stopSpeechToText = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setActiveField(null);
  };

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
        if (data.name) setPatientName(data.name);
        setAnswers(prev => ({
          ...prev,
          ...(data.age && { age: String(data.age) }),
          ...(data.gender && { gender: data.gender }),
          ...(data.height && { height: String(data.height) }),
          ...(data.weight && { weight: String(data.weight) }),
          ...(data.mobileNumber && { mobile_number: data.mobileNumber }),
          ...(data.chronicIllnesses && { health_conditions: Array.isArray(data.chronicIllnesses) ? data.chronicIllnesses : [data.chronicIllnesses] }),
          ...(data.allergies && { allergies: Array.isArray(data.allergies) ? data.allergies : [data.allergies] }),
        }));
        if (data.chronicIllnesses && (Array.isArray(data.chronicIllnesses) ? data.chronicIllnesses.length > 0 : true)) {
          setGateAnswers(prev => ({ ...prev, health_conditions: "yes" }));
        }
        if (data.allergies && (Array.isArray(data.allergies) ? data.allergies.length > 0 : true)) {
          setGateAnswers(prev => ({ ...prev, allergies: "yes" }));
        }
        setSmartInput("");
        toast({ title: "Smart Fill complete", description: "Fields populated from your input." });
      }
    } catch {
      toast({ title: "Smart Fill failed", description: "Could not parse the input.", variant: "destructive" });
    }
    setIsParsing(false);
  };

  const handleSubmit = async () => {
    if (!user || !patientName.trim()) {
      toast({ title: "Patient name required", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Merge gate answers, other text, and notes into the final answers
    const finalAnswers: Record<string, any> = { ...answers };
    for (const [id, gate] of Object.entries(gateAnswers)) {
      if (gate === "no") finalAnswers[id] = [];
    }
    for (const [id, text] of Object.entries(otherText)) {
      if (text.trim()) finalAnswers[`${id}_other`] = text.trim();
    }
    for (const [id, note] of Object.entries(notes)) {
      if (note.trim()) finalAnswers[`${id}_notes`] = note.trim();
    }

    // Persist follow-up metadata so the consultation page can render previous context
    if (flowType === "followup" && selectedPrevConsultation?.id) {
      const prevIntake = (selectedPrevConsultation.intake_answers as Record<string, any>) || {};
      const prevRecs = (selectedPrevConsultation.ai_recommendations as Record<string, any>) || {};
      finalAnswers.flowType = "followup";
      finalAnswers.previousConsultationId = selectedPrevConsultation.id;
      finalAnswers.previousProtocol = {
        peptides: Array.isArray(prevRecs?.recommended_peptides)
          ? prevRecs.recommended_peptides.map((p: any) => ({
              name: p.name, dosage: p.dosage, frequency: p.frequency, duration: p.duration,
            }))
          : [],
        previousHealthGoals: prevIntake.health_goals || [],
        previousDate: selectedPrevConsultation.created_at,
      };
      finalAnswers.followupData = {
        sideEffects: followupSideEffects.trim(),
        notes: followupNotes.trim(),
      };
    } else {
      finalAnswers.flowType = "new";
    }

    const { data, error } = await supabase
      .from("consultations")
      .insert({
        user_id: user.id,
        patient_name: patientName,
        program: programId || "peptides",
        intake_answers: finalAnswers as any,
        status: "review",
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      navigate(`/consultation/${data.id}`);
    }
    setSaving(false);
  };

  const renderQuestion = (q: IntakeQuestion) => {
    const value = answers[q.id];
    const gate = gateAnswers[q.id];
    const showOptions = !q.hasGate || gate === "yes";
    const missing = showValidation && isMissing(q);

    return (
      <div key={q.id} className={`space-y-3 ${missing ? "rounded-lg border-2 border-destructive/50 bg-destructive/5 p-3 -mx-1" : ""}`}>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{q.question}</Label>
          {MANDATORY_QUESTIONS.has(q.id) && <span className="text-destructive text-xs font-bold">*</span>}
          {missing && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>
          )}
        </div>

        {/* Yes/No gate for applicable questions */}
        {q.hasGate && (
          <div className="flex gap-2">
            <Badge
              variant={gate === "no" ? "default" : "outline"}
              className={`cursor-pointer px-4 py-1.5 text-sm transition-all ${gate === "no" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
              onClick={() => handleGateChange(q.id, "no")}
            >
              No
            </Badge>
            <Badge
              variant={gate === "yes" ? "default" : "outline"}
              className={`cursor-pointer px-4 py-1.5 text-sm transition-all ${gate === "yes" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
              onClick={() => handleGateChange(q.id, "yes")}
            >
              Yes
            </Badge>
          </div>
        )}

        {/* Text input */}
        {q.type === "text" && (
          <div className="relative">
            <Textarea
              value={(value as string) || ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder="Type or use mic..."
              className="pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`absolute right-1 top-1 ${isRecording && activeField === q.id ? "text-destructive" : "text-muted-foreground"}`}
              onClick={() => (isRecording && activeField === q.id ? stopSpeechToText() : startSpeechToText(q.id))}
            >
              {isRecording && activeField === q.id ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {/* Number input */}
        {q.type === "number" && q.id === "height" && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex bg-secondary rounded-md p-0.5 text-[10px] font-bold">
                <button type="button" onClick={() => setHeightUnit("cm")} className={`px-2 py-0.5 rounded transition-all ${heightUnit === "cm" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}>CM</button>
                <button type="button" onClick={() => setHeightUnit("ft")} className={`px-2 py-0.5 rounded transition-all ${heightUnit === "ft" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}>FT</button>
              </div>
            </div>
            {heightUnit === "cm" ? (
              <div className="flex items-center gap-2">
                <Input type="number" value={(value as string) || ""} onChange={(e) => setAnswer(q.id, e.target.value)} className="w-32" />
                <span className="text-sm text-muted-foreground">cm</span>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Input type="number" className="w-20" value={value ? Math.floor(Number(value) / 30.48) : ""} onChange={(e) => {
                    const ft = Number(e.target.value);
                    const currIn = value ? Math.round((Number(value) / 2.54) % 12) : 0;
                    setAnswer(q.id, String(Math.round((ft * 12 + currIn) * 2.54)));
                  }} />
                  <span className="absolute right-2 top-2.5 text-muted-foreground text-xs font-bold">ft</span>
                </div>
                <div className="relative">
                  <Input type="number" className="w-20" value={value ? Math.round((Number(value) / 2.54) % 12) : ""} onChange={(e) => {
                    const inches = Number(e.target.value);
                    const currFt = value ? Math.floor(Number(value) / 30.48) : 0;
                    setAnswer(q.id, String(Math.round((currFt * 12 + inches) * 2.54)));
                  }} />
                  <span className="absolute right-2 top-2.5 text-muted-foreground text-xs font-bold">in</span>
                </div>
              </div>
            )}
          </div>
        )}

        {q.type === "number" && q.id === "weight" && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex bg-secondary rounded-md p-0.5 text-[10px] font-bold">
                <button type="button" onClick={() => setWeightUnit("kg")} className={`px-2 py-0.5 rounded transition-all ${weightUnit === "kg" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}>KG</button>
                <button type="button" onClick={() => setWeightUnit("lbs")} className={`px-2 py-0.5 rounded transition-all ${weightUnit === "lbs" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}>LBS</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-32"
                value={!value ? "" : weightUnit === "kg" ? value : (Number(value) * 2.20462).toFixed(1)}
                onChange={(e) => {
                  if (e.target.value === "") setAnswer(q.id, "");
                  else {
                    const num = Number(e.target.value);
                    setAnswer(q.id, String(weightUnit === "kg" ? num : Math.round(num / 2.20462)));
                  }
                }}
              />
              <span className="text-sm text-muted-foreground">{weightUnit}</span>
            </div>
          </div>
        )}

        {q.type === "number" && q.id !== "height" && q.id !== "weight" && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={(value as string) || ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              className="w-32"
            />
            {q.unit && <span className="text-sm text-muted-foreground">{q.unit}</span>}
          </div>
        )}

        {/* Select */}
        {q.type === "select" && q.options && (
          <div className="flex flex-wrap gap-2">
            {q.options.map((opt) => (
              <Badge
                key={opt}
                variant={value === opt ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${value === opt ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                onClick={() => setAnswer(q.id, opt)}
              >
                {opt}
              </Badge>
            ))}
          </div>
        )}

        {/* Multiselect with gate support */}
        {q.type === "multiselect" && q.options && showOptions && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const selected = ((value as string[]) || []).includes(opt);
                return (
                  <Badge
                    key={opt}
                    variant={selected ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${selected ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                    onClick={() => toggleMultiSelect(q.id, opt)}
                  >
                    {selected && <Check className="h-3 w-3 mr-1" />}
                    {opt}
                  </Badge>
                );
              })}
            </div>

            {/* Other free-text option */}
            {q.hasOther && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Other (please specify)</Label>
                <Input
                  value={otherText[q.id] || ""}
                  onChange={(e) => setOtherText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Specify other..."
                  className="text-sm"
                />
              </div>
            )}

            {/* Notes section */}
            {q.hasNotes && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Additional notes</Label>
                <Textarea
                  value={notes[q.id] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Add any relevant details..."
                  className="text-sm min-h-[60px]"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ---- ENCOUNTER SELECTOR ----
  if (flowType === null) {
    return (
      <div className="min-h-screen gradient-surface">
        <AppHeader title="Peptide Therapy" subtitle="Select encounter type" showBack />
        <main className="container mx-auto max-w-3xl px-4 py-12 animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Select Encounter Type</h2>
            <p className="text-muted-foreground mt-2">Choose how to proceed with this patient.</p>
          </div>
          <ProgramPrescriptionStats program="peptides" />
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
                    Full intake: demographics, medical history, and AI peptide analysis.
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
                    Review previous protocol, log side-effects, refresh goals, and re-prescribe.
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
        <AppHeader title="Peptide Follow-up" subtitle="Select previous patient" showBack />
        <main className="container mx-auto max-w-3xl px-4 py-8 animate-fade-in">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Follow-up Visit</h2>
            <p className="text-muted-foreground mt-1">Select a previous peptide patient to continue their journey.</p>
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
          <Button variant="outline" className="w-full mb-4" onClick={() => setFlowType("new")}>
            <UserPlus className="h-4 w-4 mr-1" /> Switch to New Patient instead
          </Button>
          {loadingFollowups ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredPrevConsultations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No previous peptide patients found</p>
                <p className="text-sm mt-1">Start a new patient encounter instead.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredPrevConsultations.map(c => {
                const recs = (c.ai_recommendations as Record<string, any>) || {};
                const peptides = Array.isArray(recs.recommended_peptides) ? recs.recommended_peptides : [];
                const goals = Array.isArray(c.intake_answers?.health_goals) ? c.intake_answers.health_goals : [];
                return (
                  <Card
                    key={c.id}
                    className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
                    onClick={() => handleSelectPreviousPatient(c)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{c.patient_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()} • {peptides.length} peptide(s) prescribed
                          </p>
                          {peptides.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {peptides.slice(0, 3).map((p: any, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[10px]">
                                  <Pill className="h-2.5 w-2.5 mr-1" />{p.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {goals.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
                              Goals: {goals.join(", ")}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-surface">
      <AppHeader
        title={flowType === "followup" ? "Peptide Follow-up" : "Patient Intake"}
        subtitle={flowType === "followup" && selectedPrevConsultation?.patient_name ? `Follow-up · ${selectedPrevConsultation.patient_name}` : "Peptides Program"}
        showBack
      />

      <main className="container mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep + 1} of {sections.length}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Smart Fill */}
        {currentStep === 0 && (
          <Card className="mb-4 border-primary/30 bg-gradient-to-r from-primary/10 to-accent/5 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-primary">✨ AI Smart Fill</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ahmed Ali, 35y Male, 180cm, 95kg, diabetic..."
                  value={smartInput}
                  onChange={e => setSmartInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSmartFill()}
                />
                <Button onClick={handleSmartFill} disabled={isParsing || !smartInput} size="sm">
                  {isParsing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  <span className="ml-1">{isParsing ? "Parsing..." : "Fill"}</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">Paste or type patient info — name, age, gender, height, weight, conditions — and we'll fill the form.</p>
            </CardContent>
          </Card>
        )}

        {/* Missed Appointment WhatsApp */}
        {currentStep === 0 && (
          <Card className="mb-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
            <CardContent className="p-4 flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Missed Appointment?</p>
                <p className="text-[10px] text-muted-foreground">Send a WhatsApp message to reschedule</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
                onClick={() => {
                  const phone = (answers["mobile_number"] as string) || "";
                  const name = patientName || "Patient";
                  const now = new Date();
                  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const msg = `Dear ${name},\n\nWe attempted to contact you at your scheduled appointment time (${time}) today for your Peptide therapy consultation, but were unable to reach you.\n\nPlease reply with your preferred time and availability for a call back (today or tomorrow), and we will arrange it.\n\nKind regards,\n\nDr Sami M. Yesuf\nScope Certified Physician`;
                  openWhatsApp(phone, msg);
                }}
                disabled={!(answers["mobile_number"] as string)}
                title={!(answers["mobile_number"] as string) ? "Enter mobile number first" : "Send missed appointment message"}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" /> Send
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Follow-up Tracking — visible on step 0 in follow-up mode */}
        {currentStep === 0 && flowType === "followup" && selectedPrevConsultation && (
          <Card className="mb-4 border-violet-200 dark:border-violet-800/40 bg-violet-50/40 dark:bg-violet-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Previous Visit
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {new Date(selectedPrevConsultation.created_at).toLocaleDateString()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const recs = (selectedPrevConsultation.ai_recommendations as Record<string, any>) || {};
                const peptides = Array.isArray(recs.recommended_peptides) ? recs.recommended_peptides : [];
                if (peptides.length === 0) {
                  return <p className="text-xs text-muted-foreground italic">No prescribed protocol recorded on previous visit.</p>;
                }
                return (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">Previous Protocol</Label>
                    <div className="space-y-1.5">
                      {peptides.map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-background/70 rounded-md border px-2.5 py-1.5">
                          <Pill className="h-3 w-3 text-violet-600 dark:text-violet-400 shrink-0" />
                          <span className="font-semibold">{p.name}</span>
                          {p.dosage && <span className="text-muted-foreground">· {p.dosage}</span>}
                          {p.frequency && <span className="text-muted-foreground">· {p.frequency}</span>}
                          {p.duration && <span className="text-muted-foreground">· {p.duration}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 gap-3 pt-1">
                <div>
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Side Effects Reported
                  </Label>
                  <Textarea
                    value={followupSideEffects}
                    onChange={e => setFollowupSideEffects(e.target.value)}
                    placeholder="e.g. mild nausea first 3 days, then resolved..."
                    className="mt-1 min-h-[60px] text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold flex items-center gap-1">
                    <StickyNote className="h-3 w-3" /> Follow-up Notes
                  </Label>
                  <Textarea
                    value={followupNotes}
                    onChange={e => setFollowupNotes(e.target.value)}
                    placeholder="Patient response, adherence, lifestyle changes, lab updates..."
                    className="mt-1 min-h-[60px] text-sm"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1 border-t">
                Update primary health goals below if priorities have shifted, then continue to refresh medication & dose recommendations.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Show Primary Health Objectives at the beginning (step 0) */}
        {currentStep === 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
             <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label>Patient Name <span className="text-destructive font-bold">*</span></Label>
                  {showValidation && !patientName.trim() && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>
                  )}
                </div>
                <div className={`relative mt-1 ${showValidation && !patientName.trim() ? "rounded-md ring-2 ring-destructive/50" : ""}`}>
                  <Input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient's full name"
                    className="pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`absolute right-1 top-0.5 ${isRecording && activeField === "patientName" ? "text-destructive" : "text-muted-foreground"}`}
                    onClick={() => (isRecording && activeField === "patientName" ? stopSpeechToText() : startSpeechToText("patientName"))}
                  >
                    {isRecording && activeField === "patientName" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Booking Ref</Label>
                  <Input
                    value={(answers["booking_ref"] as string) || ""}
                    onChange={(e) => setAnswer("booking_ref", e.target.value)}
                    placeholder="#12345"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Appointment Time</Label>
                  <Input
                    type="time"
                    value={(answers["booking_time"] as string) || ""}
                    onChange={(e) => setAnswer("booking_time", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Mobile Number</Label>
                <Input
                  type="tel"
                  value={(answers["mobile_number"] as string) || ""}
                  onChange={(e) => setAnswer("mobile_number", e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="mt-1"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Include country code for WhatsApp delivery</p>
              </div>

              {/* Health Goals on first page */}
              <div className={`space-y-3 ${showValidation && (!(answers["health_goals"] as string[])?.length) ? "rounded-lg border-2 border-destructive/50 bg-destructive/5 p-3 -mx-1" : ""}`}>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">What are your main health goals? (Select all that apply)</Label>
                  <span className="text-destructive text-xs font-bold">*</span>
                  {showValidation && (!(answers["health_goals"] as string[])?.length) && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Healthy aging & longevity", "Build muscle & recover better", "Heal injuries & reduce pain", "Improve metabolism & reduce belly fat", "Improve sleep & reset body clock", "Cognitive function & mood enhancement", "Sexual health", "Immune function & inflammation", "Gut health", "Skin & hair"].map((opt) => {
                    const selected = ((answers["health_goals"] as string[]) || []).includes(opt);
                    return (
                      <Badge
                        key={opt}
                        variant={selected ? "default" : "outline"}
                        className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${selected ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                        onClick={() => toggleMultiSelect("health_goals", opt)}
                      >
                        {selected && <Check className="h-3 w-3 mr-1" />}
                        {opt}
                      </Badge>
                    );
                  })}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Other (please specify)</Label>
                  <Input
                    value={otherText["health_goals"] || ""}
                    onChange={(e) => setOtherText((prev) => ({ ...prev, health_goals: e.target.value }))}
                    placeholder="Specify other..."
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Additional notes</Label>
                  <Textarea
                    value={notes["health_goals"] || ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, health_goals: e.target.value }))}
                    placeholder="Add any relevant details..."
                    className="text-sm min-h-[60px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{currentSection}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {sectionQuestions.map(renderQuestion)}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {currentStep < sections.length - 1 ? (
            <Button onClick={handleNext}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving || !patientName.trim()}>
              {saving ? "Saving..." : "Submit & Get Recommendations"}
            </Button>
          )}
        </div>
        </div>

        {/* Sidebar: Patient Summary + Live Peptide Suggestions */}
        <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-6 lg:self-start space-y-4">
          {(patientName || answers["age"] || answers["height"] || answers["weight"] || answers["gender"]) && (
            <PatientSummaryCard
              patientName={patientName || "New Patient"}
              intake={{
                ...answers,
                health_goals: answers["health_goals"] || [],
              }}
            />
          )}
          <LivePeptideSuggestions healthGoals={(answers["health_goals"] as string[]) || []} />
        </aside>
      </div>
      </main>
    </div>
  );
}
