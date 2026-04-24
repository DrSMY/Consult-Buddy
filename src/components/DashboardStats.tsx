import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CalendarDays, CalendarRange, Calendar, FlaskConical, Scale } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Row = { created_at: string; program: string };
type ProgramFilter = "all" | "peptides" | "weight-loss";

export default function DashboardStats() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<ProgramFilter>("all");

  useEffect(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    supabase
      .from("consultations")
      .select("created_at, program")
      .gte("created_at", startOfMonth.toISOString())
      .then(({ data }) => setRows((data as Row[]) || []));
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(); // 0 Sun
    const diff = (day === 0 ? 6 : day - 1); // week starts Mon
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const filtered = (rows || []).filter((r) => filter === "all" || r.program === filter);
    let today = 0, week = 0, month = 0;
    for (const r of filtered) {
      const d = new Date(r.created_at);
      if (d >= startOfMonth) month++;
      if (d >= startOfWeek) week++;
      if (d >= startOfDay) today++;
    }
    return { today, week, month };
  }, [rows, filter]);

  const cards = [
    { label: "Today", value: stats.today, icon: CalendarDays },
    { label: "This Week", value: stats.week, icon: CalendarRange },
    { label: "This Month", value: stats.month, icon: Calendar },
  ];

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Patient Statistics</h3>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as ProgramFilter)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
            <TabsTrigger value="peptides" className="text-xs px-3 gap-1">
              <FlaskConical className="h-3 w-3" /> Peptides
            </TabsTrigger>
            <TabsTrigger value="weight-loss" className="text-xs px-3 gap-1">
              <Scale className="h-3 w-3" /> Weight Loss
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="transition-all hover:shadow-md hover:border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {rows === null ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{c.value}</div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                {filter === "all" ? "All programs" : filter === "peptides" ? "Peptide consultations" : "Weight Loss consultations"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
