import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, User, Copy, ClipboardCheck, ArrowLeft, Activity, Utensils, Zap, ThermometerSnowflake,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";

export default function WeightLossConsultation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen gradient-surface">
      <AppHeader title="Weight Loss Consultation" subtitle={consultation.patient_name} showBack />

      <main className="container mx-auto max-w-3xl px-4 py-6 animate-fade-in space-y-6">
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

        {/* Patient Guide */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-accent" /> Patient Care Guide
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleCopy(patientGuide, "guide")}>
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
              {patientGuide || "Patient guide not yet generated."}
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>
      </main>
    </div>
  );
}
