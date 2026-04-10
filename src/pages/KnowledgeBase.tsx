import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search, ChevronDown, FlaskConical, Syringe, Pill,
  Activity, ShieldAlert, TestTubes, Combine, BookOpen, Loader2, Pencil, Plus, Save, X,
  Stethoscope, User, FileText, Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

interface Protocol {
  id: string;
  name: string;
  categories: string[] | null;
  how_it_works: string | null;
  target_benefits: string | null;
  best_use_for: string | null;
  dosage_instructions: string | null;
  administration_route: string | null;
  strength_volume: string | null;
  treatment_duration: string | null;
  contraindications: string | null;
  common_side_effects: string | null;
  key_blood_tests: string | null;
  recommended_supplements: string | null;
  possible_combinations: string | null;
  prescription_details: string | null;
}

interface ClinicalDoc {
  id: string;
  title: string;
  document_type: string;
  peptide_name: string | null;
  content: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  "Gut Health": Pill,
  "Heal Injuries & Reduce Pain": Syringe,
  "Build Muscle & Recover Better": Activity,
  "Healthy Aging & Longevity": BookOpen,
};

const EDITABLE_FIELDS: { key: keyof Protocol; label: string; multiline?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "how_it_works", label: "How It Works", multiline: true },
  { key: "target_benefits", label: "Target Benefits", multiline: true },
  { key: "best_use_for", label: "Best Use For", multiline: true },
  { key: "dosage_instructions", label: "Dosage Instructions" },
  { key: "administration_route", label: "Administration Route" },
  { key: "strength_volume", label: "Strength/Volume" },
  { key: "treatment_duration", label: "Treatment Duration" },
  { key: "contraindications", label: "Contraindications", multiline: true },
  { key: "common_side_effects", label: "Common Side Effects", multiline: true },
  { key: "key_blood_tests", label: "Key Blood Tests", multiline: true },
  { key: "recommended_supplements", label: "Recommended Supplements", multiline: true },
  { key: "possible_combinations", label: "Possible Combinations", multiline: true },
  { key: "prescription_details", label: "Prescription Details", multiline: true },
];

type ViewMode = "normal" | "doctor";

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [clinicalDocs, setClinicalDocs] = useState<ClinicalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [editProtocol, setEditProtocol] = useState<Protocol | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editCategories, setEditCategories] = useState("");
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  // Clinical document editing
  const [editDoc, setEditDoc] = useState<ClinicalDoc | null>(null);
  const [editDocForm, setEditDocForm] = useState({ title: "", content: "", peptide_name: "", document_type: "" });
  const [isNewDoc, setIsNewDoc] = useState(false);

  const loadProtocols = () => {
    supabase
      .from("peptide_protocols")
      .select("*")
      .order("name")
      .then(({ data }) => {
        setProtocols((data as Protocol[]) || []);
        setLoading(false);
      });
  };

  const loadClinicalDocs = () => {
    supabase
      .from("clinical_documents")
      .select("*")
      .order("title")
      .then(({ data }) => {
        setClinicalDocs((data as ClinicalDoc[]) || []);
      });
  };

  useEffect(() => {
    loadProtocols();
    loadClinicalDocs();
  }, []);

  // Map quickstart guides by peptide_name for doctor view
  const quickstartByPeptide = useMemo(() => {
    const map = new Map<string, ClinicalDoc>();
    clinicalDocs
      .filter((d) => d.document_type === "patient_quickstart_guide" && d.peptide_name)
      .forEach((d) => map.set(d.peptide_name!, d));
    return map;
  }, [clinicalDocs]);

  const glp1Protocol = useMemo(
    () => clinicalDocs.find((d) => d.document_type === "glp1_protocol"),
    [clinicalDocs]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return protocols;
    const q = search.toLowerCase();
    return protocols.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categories?.some((c) => c.toLowerCase().includes(q)) ||
        p.target_benefits?.toLowerCase().includes(q) ||
        p.best_use_for?.toLowerCase().includes(q)
    );
  }, [protocols, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Protocol[]>();
    filtered.forEach((p) => {
      const cats = p.categories?.length ? p.categories : ["Uncategorized"];
      cats.forEach((cat) => {
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push(p);
      });
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openEdit = (protocol: Protocol) => {
    setIsNew(false);
    setEditProtocol(protocol);
    const form: Record<string, string> = {};
    EDITABLE_FIELDS.forEach(({ key }) => {
      form[key] = (protocol[key] as string) || "";
    });
    setEditCategories(protocol.categories?.join(", ") || "");
    setEditForm(form);
  };

  const openNew = () => {
    setIsNew(true);
    const form: Record<string, string> = {};
    EDITABLE_FIELDS.forEach(({ key }) => { form[key] = ""; });
    setEditCategories("");
    setEditForm(form);
    setEditProtocol({} as Protocol);
  };

  const handleSave = async () => {
    if (!editForm.name?.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const categories = editCategories.split(",").map((c) => c.trim()).filter(Boolean);
    const payload: any = { categories };
    EDITABLE_FIELDS.forEach(({ key }) => {
      payload[key] = editForm[key]?.trim() || null;
    });
    payload.name = editForm.name.trim();

    if (isNew) {
      const { error } = await supabase.from("peptide_protocols").insert(payload);
      if (error) {
        toast({ title: "Failed to add protocol", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Protocol added successfully" });
      }
    } else {
      const { error } = await supabase.from("peptide_protocols").update(payload).eq("id", editProtocol!.id);
      if (error) {
        toast({ title: "Failed to update protocol", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Protocol updated successfully" });
      }
    }
    setSaving(false);
    setEditProtocol(null);
    loadProtocols();
  };

  const openEditDoc = (doc: ClinicalDoc) => {
    setIsNewDoc(false);
    setEditDoc(doc);
    setEditDocForm({ title: doc.title, content: doc.content, peptide_name: doc.peptide_name || "", document_type: doc.document_type });
  };

  const openNewDoc = () => {
    setIsNewDoc(true);
    setEditDoc({} as ClinicalDoc);
    setEditDocForm({ title: "", content: "", peptide_name: "", document_type: "patient_quickstart_guide" });
  };

  const handleSaveDoc = async () => {
    if (!editDocForm.title.trim() || !editDocForm.content.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: editDocForm.title.trim(),
      content: editDocForm.content.trim(),
      peptide_name: editDocForm.peptide_name.trim() || null,
      document_type: editDocForm.document_type.trim(),
    };
    if (isNewDoc) {
      const { error } = await supabase.from("clinical_documents").insert(payload);
      if (error) toast({ title: "Failed to add document", description: error.message, variant: "destructive" });
      else toast({ title: "Document added successfully" });
    } else {
      const { error } = await supabase.from("clinical_documents").update(payload).eq("id", editDoc!.id);
      if (error) toast({ title: "Failed to update document", description: error.message, variant: "destructive" });
      else toast({ title: "Document updated successfully" });
    }
    setSaving(false);
    setEditDoc(null);
    loadClinicalDocs();
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
      <AppHeader title="Knowledge Base" subtitle={`${protocols.length} protocols`} showBack>
        <Button size="sm" variant="outline" className="text-xs" onClick={openNewDoc}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Document
        </Button>
        <Button size="sm" variant="outline" className="text-xs" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Protocol
        </Button>
      </AppHeader>

      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* View Mode Toggle + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search peptides, categories, or benefits..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
            <button
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "normal"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted/50 text-muted-foreground"
              }`}
              onClick={() => setViewMode("normal")}
            >
              <Eye className="h-3.5 w-3.5" /> Normal
            </button>
            <button
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "doctor"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted/50 text-muted-foreground"
              }`}
              onClick={() => setViewMode("doctor")}
            >
              <Stethoscope className="h-3.5 w-3.5" /> Doctor
            </button>
          </div>
        </div>

        {/* GLP-1 Clinical Protocol — Doctor view only */}
        {viewMode === "doctor" && glp1Protocol && !search.trim() && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> GLP-1 Clinical Protocol
                  </CardTitle>
                  <CardDescription>Comprehensive prescribing guidelines for GLP-1 receptor agonists</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDoc(glp1Protocol)}>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap leading-relaxed">
                {glp1Protocol.content}
              </div>
            </CardContent>
          </Card>
        )}

        {grouped.map(([category, items]) => {
          const Icon = CATEGORY_ICONS[category] || FlaskConical;
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">{category}</h2>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>

              <div className="space-y-2">
                {items.map((p) => (
                  <Collapsible key={p.id + category} open={openIds.has(p.id)} onOpenChange={() => toggle(p.id)}>
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{p.name}</CardTitle>
                                {viewMode === "doctor" && quickstartByPeptide.has(p.name) && (
                                  <Badge variant="outline" className="text-[9px] border-primary/30 text-primary shrink-0">
                                    Quick-Start
                                  </Badge>
                                )}
                              </div>
                              {viewMode === "normal" && p.target_benefits && (
                                <p className="text-xs text-muted-foreground mt-1">{p.target_benefits}</p>
                              )}
                              {viewMode === "doctor" && p.best_use_for && (
                                <p className="text-xs text-muted-foreground mt-1">{p.best_use_for}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <ChevronDown
                                className={`h-4 w-4 text-muted-foreground transition-transform ${
                                  openIds.has(p.id) ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4 text-sm">
                          {viewMode === "normal" ? (
                            /* === NORMAL VIEW === */
                            <>
                              {p.how_it_works && (
                                <DetailSection icon={Activity} title="How It Works" content={p.how_it_works} />
                              )}
                              {p.best_use_for && (
                                <DetailSection icon={BookOpen} title="Best Use For" content={p.best_use_for} />
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {p.dosage_instructions && <InfoBlock label="Dosage" value={p.dosage_instructions} />}
                                {p.administration_route && <InfoBlock label="Administration" value={p.administration_route} />}
                                {p.strength_volume && <InfoBlock label="Strength/Volume" value={p.strength_volume} />}
                                {p.treatment_duration && <InfoBlock label="Duration" value={p.treatment_duration} />}
                              </div>
                              {p.contraindications && (
                                <DetailSection icon={ShieldAlert} title="Contraindications" content={p.contraindications} variant="warning" />
                              )}
                            </>
                          ) : (
                            /* === DOCTOR VIEW — Full Clinical Detail === */
                            <>
                              {p.how_it_works && (
                                <DetailSection icon={Activity} title="Mechanism of Action" content={p.how_it_works} />
                              )}
                              {p.target_benefits && (
                                <DetailSection icon={Activity} title="Target Benefits" content={p.target_benefits} variant="success" />
                              )}
                              {p.best_use_for && (
                                <DetailSection icon={BookOpen} title="Clinical Indications" content={p.best_use_for} />
                              )}

                              {/* Prescribing Details Grid */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                  <span className="h-px flex-1 bg-border" />
                                  Prescribing Information
                                  <span className="h-px flex-1 bg-border" />
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {p.dosage_instructions && <PrescribingCard label="Dosage" value={p.dosage_instructions} />}
                                  {p.administration_route && <PrescribingCard label="Route" value={p.administration_route} />}
                                  {p.strength_volume && <PrescribingCard label="Strength/Volume" value={p.strength_volume} />}
                                  {p.treatment_duration && <PrescribingCard label="Duration" value={p.treatment_duration} />}
                                </div>
                              </div>

                              {p.prescription_details && (
                                <DetailSection icon={FileText} title="Prescription Details" content={p.prescription_details} />
                              )}

                              {p.contraindications && (
                                <DetailSection icon={ShieldAlert} title="Contraindications" content={p.contraindications} variant="warning" />
                              )}
                              {p.common_side_effects && (
                                <DetailSection icon={ShieldAlert} title="Side Effects" content={p.common_side_effects} variant="muted" />
                              )}
                              {p.key_blood_tests && (
                                <DetailSection icon={TestTubes} title="Required Blood Tests" content={p.key_blood_tests} />
                              )}
                              {p.possible_combinations && (
                                <DetailSection icon={Combine} title="Possible Combinations" content={p.possible_combinations} />
                              )}
                              {p.recommended_supplements && (
                                <DetailSection icon={Pill} title="Recommended Supplements" content={p.recommended_supplements} />
                              )}

                              {/* Patient Quick-Start Guide — from clinical_documents */}
                              {(() => {
                                // Check for exact match first, then partial match
                                const exactDoc = quickstartByPeptide.get(p.name);
                                const partialDoc = !exactDoc
                                  ? Array.from(quickstartByPeptide.entries()).find(([key]) =>
                                      p.name.toLowerCase().includes(key.split(" (")[0].toLowerCase()) ||
                                      key.toLowerCase().includes(p.name.toLowerCase())
                                    )?.[1]
                                  : null;
                                const doc = exactDoc || partialDoc;

                                if (!doc) return null;
                                return (
                                  <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                                        <User className="h-4 w-4" /> Patient Quick-Start Guide
                                      </h4>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDoc(doc)}>
                                        <Pencil className="h-3 w-3 text-muted-foreground" />
                                      </Button>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                                      {doc.content}
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </div>
          );
        })}

        {grouped.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No peptides match your search.</p>
          </div>
        )}
      </main>

      {/* Edit / Add Dialog */}
      <Dialog open={!!editProtocol} onOpenChange={(open) => !open && setEditProtocol(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add New Protocol" : `Edit: ${editForm.name}`}</DialogTitle>
            <DialogDescription>
              {isNew ? "Fill in the details for the new protocol." : "Update any field and save."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Categories (comma-separated)</Label>
              <Input
                value={editCategories}
                onChange={(e) => setEditCategories(e.target.value)}
                placeholder="e.g. Gut Health, Longevity"
              />
            </div>
            {EDITABLE_FIELDS.map(({ key, label, multiline }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-medium">{label}</Label>
                {multiline ? (
                  <Textarea
                    value={editForm[key] || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="min-h-[80px] text-sm"
                  />
                ) : (
                  <Input
                    value={editForm[key] || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditProtocol(null)} disabled={saving}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              {isNew ? "Add Protocol" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  content,
  variant,
}: {
  icon: any;
  title: string;
  content: string;
  variant?: "warning" | "success" | "muted";
}) {
  const bg =
    variant === "warning"
      ? "bg-destructive/10 border border-destructive/20"
      : variant === "success"
      ? "bg-accent/10 border border-accent/20"
      : variant === "muted"
      ? "bg-muted/30 border border-border"
      : "bg-muted/50";
  const iconColor =
    variant === "warning"
      ? "text-destructive"
      : variant === "success"
      ? "text-accent"
      : "text-primary";

  return (
    <div className={`rounded-lg p-3 ${bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        <span className="font-medium text-xs uppercase tracking-wide">{title}</span>
      </div>
      <p className="text-sm whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function PrescribingCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <p className="text-sm mt-0.5 font-medium">{value}</p>
    </div>
  );
}
