import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, FlaskConical, Scale, Phone, Copy, Trash2, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AppointmentWhatsAppDialog from "./AppointmentWhatsAppDialog";

interface Appointment {
  id: string;
  full_name: string;
  mobile_number: string;
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  status: string;
  assigned_program: string | null;
  created_at: string;
}

export default function AppointmentsList() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Appointment[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const assign = (apt: Appointment, program: "peptides" | "weight-loss") => {
    const params = new URLSearchParams({
      appointment_id: apt.id,
      name: apt.full_name,
      mobile: apt.mobile_number,
      ...(apt.gender ? { gender: apt.gender } : {}),
      ...(apt.age ? { age: String(apt.age) } : {}),
      ...(apt.height_cm ? { height: String(apt.height_cm) } : {}),
      ...(apt.weight_kg ? { weight: String(apt.weight_kg) } : {}),
    });
    navigate(`/program/${program}?${params.toString()}`);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/book`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: url });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5 text-primary" />
            Pending Appointments
            {items.length > 0 && <Badge variant="secondary">{items.length}</Badge>}
          </CardTitle>
          <CardDescription>Patient-submitted requests. Assign each to a program to continue intake.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={copyLink}>
          <Copy className="h-4 w-4 mr-2" /> Copy booking link
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending appointments. Share the booking link with patients to get started.</p>
        ) : (
          <div className="space-y-2">
            {items.map((a) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.full_name}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{a.mobile_number}</span>
                    {a.gender && <span>{a.gender}</span>}
                    {a.age && <span>{a.age}y</span>}
                    {a.height_cm && <span>{a.height_cm}cm</span>}
                    {a.weight_kg && <span>{a.weight_kg}kg</span>}
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => assign(a, "peptides")}>
                    <FlaskConical className="h-4 w-4 mr-1" /> Peptides
                  </Button>
                  <Button size="sm" onClick={() => assign(a, "weight-loss")}>
                    <Scale className="h-4 w-4 mr-1" /> Weight Loss
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(a.id)} aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
