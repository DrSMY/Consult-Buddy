import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Search, ChevronDown, FlaskConical, Syringe, Pill,
  Activity, ShieldAlert, TestTubes, Combine, BookOpen, Loader2, Pencil, Plus, Save, X,
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

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [editProtocol, setEditProtocol] = useState<Protocol | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editCategories, setEditCategories] = useState("");
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);

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

  useEffect(() => { loadProtocols(); }, []);

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
        <Button size="sm" variant="outline" className="text-xs" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Protocol
        </Button>
      </AppHeader>

      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search peptides, categories, or benefits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

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
                            <div>
                              <CardTitle className="text-base">{p.name}</CardTitle>
                              {p.target_benefits && (
                                <p className="text-xs text-muted-foreground mt-1">{p.target_benefits}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
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
                          {p.how_it_works && (
                            <DetailSection icon={Activity} title="How It Works" content={p.how_it_works} />
                          )}
                          {p.best_use_for && (
                            <DetailSection icon={BookOpen} title="Best Use For" content={p.best_use_for} />
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {p.dosage_instructions && (
                              <InfoBlock label="Dosage" value={p.dosage_instructions} />
                            )}
                            {p.administration_route && (
                              <InfoBlock label="Administration" value={p.administration_route} />
                            )}
                            {p.strength_volume && (
                              <InfoBlock label="Strength/Volume" value={p.strength_volume} />
                            )}
                            {p.treatment_duration && (
                              <InfoBlock label="Duration" value={p.treatment_duration} />
                            )}
                          </div>
                          {p.contraindications && (
                            <DetailSection icon={ShieldAlert} title="Contraindications" content={p.contraindications} variant="warning" />
                          )}
                          {p.common_side_effects && (
                            <InfoBlock label="Common Side Effects" value={p.common_side_effects} />
                          )}
                          {p.key_blood_tests && (
                            <DetailSection icon={TestTubes} title="Key Blood Tests" content={p.key_blood_tests} />
                          )}
                          {p.possible_combinations && (
                            <DetailSection icon={Combine} title="Possible Combinations" content={p.possible_combinations} />
                          )}
                          {p.recommended_supplements && (
                            <InfoBlock label="Recommended Supplements" value={p.recommended_supplements} />
                          )}
                          {p.prescription_details && (
                            <InfoBlock label="Prescription Details" value={p.prescription_details} />
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
  variant?: "warning";
}) {
  return (
    <div
      className={`rounded-lg p-3 ${
        variant === "warning" ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-3.5 w-3.5 ${variant === "warning" ? "text-destructive" : "text-primary"}`} />
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
