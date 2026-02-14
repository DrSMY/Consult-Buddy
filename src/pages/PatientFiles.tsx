import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Download, FileText, Loader2, Calendar, User } from "lucide-react";
import * as XLSX from "xlsx";

interface ConsultationRow {
  id: string;
  patient_name: string;
  program: string;
  status: string;
  created_at: string;
  updated_at: string;
  ai_recommendations: any;
  doctor_notes: string | null;
  next_steps: string | null;
  patient_guidelines: string | null;
  intake_answers: any;
}

export default function PatientFiles() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load consultations", variant: "destructive" });
    } else {
      setConsultations(data || []);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return consultations.filter((c) => {
      const matchesSearch =
        !search ||
        c.patient_name.toLowerCase().includes(search.toLowerCase()) ||
        c.program.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [consultations, search, statusFilter]);

  const exportToExcel = () => {
    const rows = filtered.map((c) => {
      const recs = c.ai_recommendations as any;
      const peptides = recs?.recommended_peptides?.map((p: any) => p.name).join(", ") || "";
      const supplements = recs?.recommended_supplements?.map((s: any) => s.name).join(", ") || "";
      const labTests = recs?.required_blood_tests?.join(", ") || "";

      return {
        "Patient Name": c.patient_name,
        Program: c.program,
        Status: c.status,
        "Date Created": new Date(c.created_at).toLocaleDateString(),
        "Prescribed Peptides": peptides,
        Supplements: supplements,
        "Lab Tests": labTests,
        "Doctor Notes": c.doctor_notes || "",
        "Next Steps": c.next_steps || "",
        "Patient Guidelines": c.patient_guidelines || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patient Files");
    XLSX.writeFile(wb, `patient-files-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast({ title: `Exported ${rows.length} records` });
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: consultations.length };
    consultations.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [consultations]);

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
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Patient Files</h1>
            <p className="text-xs text-muted-foreground">{consultations.length} total consultations</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1 sm:gap-2 px-2 sm:px-3">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({statusCounts.all || 0})</SelectItem>
              <SelectItem value="intake">Intake ({statusCounts.intake || 0})</SelectItem>
              <SelectItem value="review">Review ({statusCounts.review || 0})</SelectItem>
              <SelectItem value="completed">Completed ({statusCounts.completed || 0})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No consultations found</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => {
              const recs = c.ai_recommendations as any;
              const peptideCount = recs?.recommended_peptides?.length || 0;

              return (
                <Card
                  key={c.id}
                  className="hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigate(`/consultation/${c.id}`)}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{c.patient_name || "Unnamed Patient"}</h3>
                        <Badge
                          variant={c.status === "completed" ? "default" : c.status === "review" ? "secondary" : "outline"}
                          className="text-[10px] shrink-0"
                        >
                          {c.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                        <span className="capitalize">{c.program}</span>
                        {peptideCount > 0 && <span>{peptideCount} peptide{peptideCount !== 1 ? "s" : ""}</span>}
                      </div>
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
