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
import { ArrowLeft, ArrowRight, Mic, MicOff, Check, Ruler, Weight as WeightIcon, Wand2, RefreshCw, MessageCircle } from "lucide-react";
import { openWhatsApp } from "@/utils/whatsapp";
import type { IntakeQuestion } from "@/data/intakeQuestions";
import AppHeader from "@/components/AppHeader";
import LivePeptideSuggestions from "@/components/LivePeptideSuggestions";

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

  return (
    <div className="min-h-screen gradient-surface">
      <AppHeader title="Patient Intake" subtitle="Peptides Program" showBack />

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
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Smart Fill</span>
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
                  const msg = `Dear ${name},\n\nWe attempted to contact you at your scheduled appointment time (${time}) today for your Weight Loss Program — GLP-1 medication consultation, but were unable to reach you.\n\nPlease reply with your preferred time and availability for a call back (today or tomorrow), and we will arrange it.\n\nKind regards,\n\nDr Sami M. Yesuf\nScope Certified Physician`;
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

        {/* Live Peptide Suggestions Sidebar */}
        <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-6 lg:self-start">
          <LivePeptideSuggestions healthGoals={(answers["health_goals"] as string[]) || []} />
        </aside>
      </div>
      </main>
    </div>
  );
}
