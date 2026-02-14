import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Activity, ArrowLeft, AlertTriangle, CheckCircle, FileText, ClipboardList, User, Copy, Loader2 } from "lucide-react";

interface Recommendation {
  recommended_peptides: Array<{
    name: string;
    rationale: string;
    dosage: string;
    duration: string;
    administration: string;
    priority: string;
  }>;
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
      setRecommendations(data.ai_recommendations as unknown as Recommendation);
    } else {
      runAIAnalysis(data);
    }
    setLoading(false);
  };

  const runAIAnalysis = async (consultData: any) => {
    setAnalyzing(true);
    try {
      // Fetch peptide protocols
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

      // Save to consultation
      await supabase
        .from("consultations")
        .update({
          ai_recommendations: rec as any,
          doctor_notes: rec.doctor_note,
          next_steps: rec.next_steps,
          patient_guidelines: rec.patient_guidelines,
          status: "completed",
        })
        .eq("id", consultData.id);

    } catch (e: any) {
      toast({ title: "AI Analysis Failed", description: e.message, variant: "destructive" });
    }
    setAnalyzing(false);
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
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{consultation?.patient_name}</h1>
            <p className="text-xs text-muted-foreground">Peptide Consultation</p>
          </div>
          <Badge variant={consultation?.status === "completed" ? "default" : "secondary"}>
            {consultation?.status}
          </Badge>
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="doctor-note">Doctor Note</TabsTrigger>
              <TabsTrigger value="next-steps">Next Steps</TabsTrigger>
              <TabsTrigger value="guidelines">Patient Guide</TabsTrigger>
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

              {/* Recommended Peptides */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" /> Recommended Peptides
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recommendations.recommended_peptides.map((p, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{p.name}</h4>
                        <Badge variant={p.priority === "Primary" ? "default" : "secondary"}>
                          {p.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{p.rationale}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="font-medium">Dosage:</span> {p.dosage}</div>
                        <div><span className="font-medium">Duration:</span> {p.duration}</div>
                        <div><span className="font-medium">Route:</span> {p.administration}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Blood Tests */}
              {recommendations.required_blood_tests.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Required Blood Tests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.required_blood_tests.map((t, i) => (
                        <Badge key={i} variant="outline">{t}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Supplements */}
              {recommendations.recommended_supplements.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Recommended Supplements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recommendations.recommended_supplements.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="font-medium min-w-[120px]">{s.name}</span>
                          <span className="text-muted-foreground">{s.dosage} — {s.reason}</span>
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
      </main>
    </div>
  );
}
