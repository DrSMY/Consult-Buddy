import { useState, useRef, useCallback } from "react";
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
import { Activity, ArrowLeft, ArrowRight, Mic, MicOff, Check } from "lucide-react";
import type { IntakeQuestion } from "@/data/intakeQuestions";

export default function PatientIntake() {
  const { programId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [patientName, setPatientName] = useState("");
  const [saving, setSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
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
    if (option === "No known medical conditions" || option === "No known allergies") {
      setAnswer(id, [option]);
      return;
    }
    const filtered = current.filter((v) => v !== "No known medical conditions" && v !== "No known allergies");
    setAnswer(id, filtered.includes(option) ? filtered.filter((v) => v !== option) : [...filtered, option]);
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

  const handleSubmit = async () => {
    if (!user || !patientName.trim()) {
      toast({ title: "Patient name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("consultations")
      .insert({
        user_id: user.id,
        patient_name: patientName,
        program: programId || "peptides",
        intake_answers: answers as any,
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
    return (
      <div key={q.id} className="space-y-2">
        <Label className="text-sm font-medium">{q.question}</Label>
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
        {q.type === "number" && (
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
        {q.type === "multiselect" && q.options && (
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
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Patient Intake</h1>
            <p className="text-xs text-muted-foreground">Peptides Program</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep + 1} of {sections.length}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {currentStep === 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Patient Name</Label>
              <div className="relative mt-1">
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
            <Button onClick={() => setCurrentStep((s) => s + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving || !patientName.trim()}>
              {saving ? "Saving..." : "Submit & Get Recommendations"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
