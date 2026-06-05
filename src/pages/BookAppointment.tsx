import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, CalendarPlus, Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(120),
  mobile_number: z.string().trim().min(6, "Please enter a valid mobile number").max(30),
  gender: z.enum(["Male", "Female"]).optional(),
  age: z.number().int().min(1).max(120),
  height_cm: z.number().min(50).max(260),
  weight_kg: z.number().min(20).max(400),
});

export default function BookAppointment() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    mobile_number: "",
    gender: "" as "" | "Male" | "Female",
    age: "",
    height_cm: "",
    weight_kg: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      full_name: form.full_name,
      mobile_number: form.mobile_number,
      gender: form.gender || undefined,
      age: Number(form.age),
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Please check your entries";
      toast({ title: "Check your details", description: first, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const d = parsed.data;
    const { error } = await supabase.from("appointments").insert([{
      full_name: d.full_name,
      mobile_number: d.mobile_number,
      gender: d.gender,
      age: d.age,
      height_cm: d.height_cm,
      weight_kg: d.weight_kg,
      status: "pending",
    }]);
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen gradient-surface flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle>Request Received</CardTitle>
            <CardDescription>Thank you. Our team will reach out shortly to confirm your appointment.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-surface py-8 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <CalendarPlus className="h-5 w-5 text-primary" />
              <CardTitle>Book an Appointment</CardTitle>
            </div>
            <CardDescription>Share a few details and we'll get in touch to confirm.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile number</Label>
                <Input id="mobile" type="tel" value={form.mobile_number} onChange={(e) => set("mobile_number", e.target.value)} required maxLength={30} placeholder="+971..." />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" min={1} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input id="height" type="number" min={50} max={260} value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input id="weight" type="number" min={20} max={400} value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Request Appointment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
