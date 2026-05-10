import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, FileText, Loader2, Calendar, User, Pencil, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportWeightLossExcel, exportPeptideExcel } from "@/utils/excelExport";
import AppHeader from "@/components/AppHeader";

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
  const [editingRow, setEditingRow] = useState<ConsultationRow | null>(null);
  const [editForm, setEditForm] = useState({ patient_name: "", doctor_notes: "", next_steps: "", patient_guidelines: "", status: "" });
  const [saving, setSaving] = useState(false);

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
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return consultations.filter((c) => {
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      if (!q) return matchesStatus;

      const intake = (c.intake_answers || {}) as any;
      const bookingRef = String(intake.booking_ref ?? intake.bookingId ?? "").toLowerCase();
      const mobile = String(intake.mobile_number ?? intake.mobileNumber ?? "").toLowerCase();
      const mobileDigits = mobile.replace(/\D/g, "");

      const matchesSearch =
        c.patient_name.toLowerCase().includes(q) ||
        c.program.toLowerCase().includes(q) ||
        bookingRef.includes(q) ||
        mobile.includes(q) ||
        (digits.length > 0 && mobileDigits.includes(digits));

      return matchesSearch && matchesStatus;
    });
  }, [consultations, search, statusFilter]);

  const handleExport = (program: "weight-loss" | "peptides") => {
    const count = program === "weight-loss"
      ? exportWeightLossExcel(filtered)
      : exportPeptideExcel(filtered);
    if (count === 0) {
      toast({ title: `No ${program === "weight-loss" ? "weight loss" : "peptide"} consultations found`, variant: "destructive" });
    } else {
      toast({ title: `Exported ${count} ${program === "weight-loss" ? "weight loss" : "peptide"} records` });
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: consultations.length };
    consultations.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [consultations]);

  const openEdit = (c: ConsultationRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm({
      patient_name: c.patient_name || "",
      doctor_notes: c.doctor_notes || "",
      next_steps: c.next_steps || "",
      patient_guidelines: c.patient_guidelines || "",
      status: c.status,
    });
    setEditingRow(c);
  };

  const saveEdit = async () => {
    if (!editingRow) return;
    setSaving(true);
    const { error } = await supabase
      .from("consultations")
      .update({
        patient_name: editForm.patient_name,
        doctor_notes: editForm.doctor_notes,
        next_steps: editForm.next_steps,
        patient_guidelines: editForm.patient_guidelines,
        status: editForm.status,
      })
      .eq("id", editingRow.id);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save changes", variant: "destructive" });
    } else {
      toast({ title: "Updated successfully" });
      setEditingRow(null);
      loadConsultations();
    }
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
      <AppHeader title="Patient Files" subtitle={`${consultations.length} consultations`} showBack>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 px-2 sm:px-3 text-xs">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("weight-loss")}>Weight Loss Clients</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("peptides")}>Peptide Clients</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </AppHeader>

      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, booking ref or mobile..."
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
              <SelectItem value="incomplete">Incomplete ({statusCounts.incomplete || 0})</SelectItem>
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
                  onClick={() => {
                    if (c.status === "incomplete") {
                      const path = c.program === "weight-loss" ? "/program/weight-loss" : "/program/peptides";
                      navigate(`${path}?draft=${c.id}`);
                    } else if (c.program === "weight-loss") {
                      if (c.status === "completed") {
                        navigate(`/weight-loss/${c.id}`);
                      } else {
                        navigate(`/consultation/${c.id}`);
                      }
                    } else {
                      navigate(`/consultation/${c.id}`);
                    }
                  }}
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
                          className={`text-[10px] shrink-0 ${c.status === "incomplete" ? "border-amber-400/60 bg-amber-500/15 text-amber-700 dark:text-amber-300" : ""}`}
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
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => openEdit(c, e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Consultation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Patient Name</Label>
              <Input value={editForm.patient_name} onChange={(e) => setEditForm((f) => ({ ...f, patient_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="intake">Intake</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Doctor Notes</Label>
              <Textarea rows={3} value={editForm.doctor_notes} onChange={(e) => setEditForm((f) => ({ ...f, doctor_notes: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Next Steps</Label>
              <Textarea rows={3} value={editForm.next_steps} onChange={(e) => setEditForm((f) => ({ ...f, next_steps: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Patient Guidelines</Label>
              <Textarea rows={3} value={editForm.patient_guidelines} onChange={(e) => setEditForm((f) => ({ ...f, patient_guidelines: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
