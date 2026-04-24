import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, CalendarDays, CalendarRange, Calendar,
  FlaskConical, Scale, TrendingUp, Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
} from "@/components/ui/chart";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";

type Row = { created_at: string; program: string };
type ProgramFilter = "all" | "peptides" | "weight-loss";

const PROGRAM_LABEL: Record<string, string> = {
  peptides: "Peptides",
  "weight-loss": "Weight Loss",
};

export default function DashboardStats() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<ProgramFilter>("all");

  useEffect(() => {
    // Pull last 30 days for the trend chart
    const start = new Date();
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    supabase
      .from("consultations")
      .select("created_at, program")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: true })
      .then(({ data }) => setRows((data as Row[]) || []));
  }, []);

  const filteredRows = useMemo(
    () => (rows || []).filter((r) => filter === "all" || r.program === filter),
    [rows, filter],
  );

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let today = 0, week = 0, month = 0, prevMonth = 0;
    for (const r of filteredRows) {
      const d = new Date(r.created_at);
      if (d >= startOfMonth) month++;
      else if (d >= startOfPrevMonth) prevMonth++;
      if (d >= startOfWeek) week++;
      if (d >= startOfDay) today++;
    }
    const trend = prevMonth === 0 ? (month > 0 ? 100 : 0) : Math.round(((month - prevMonth) / prevMonth) * 100);
    return { today, week, month, trend };
  }, [filteredRows]);

  // 14-day trend
  const trendData = useMemo(() => {
    const days = 14;
    const localKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const buckets: { date: string; label: string; peptides: number; "weight-loss": number; total: number }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      buckets.push({
        date: localKey(d),
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        peptides: 0,
        "weight-loss": 0,
        total: 0,
      });
    }
    const map = new Map(buckets.map((b) => [b.date, b]));
    for (const r of rows || []) {
      const b = map.get(localKey(new Date(r.created_at)));
      if (!b) continue;
      if (r.program === "peptides") b.peptides++;
      else if (r.program === "weight-loss") b["weight-loss"]++;
      b.total++;
    }
    return buckets;
  }, [rows]);

  // Program distribution (for current month)
  const distribution = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    let pep = 0, wl = 0;
    for (const r of rows || []) {
      if (new Date(r.created_at) < startOfMonth) continue;
      if (r.program === "peptides") pep++;
      else if (r.program === "weight-loss") wl++;
    }
    return [
      { name: "Peptides", value: pep, key: "peptides" },
      { name: "Weight Loss", value: wl, key: "weight-loss" },
    ];
  }, [rows]);

  const hasDistribution = distribution.some((d) => d.value > 0);

  const PEPTIDE_COLOR = "hsl(152 60% 40%)"; // green
  const WL_COLOR = "hsl(43 74% 49%)"; // gold

  const chartConfig = {
    peptides: { label: "Peptides", color: PEPTIDE_COLOR },
    "weight-loss": { label: "Weight Loss", color: WL_COLOR },
    total: { label: "Total", color: PEPTIDE_COLOR },
  } as const;

  const cards = [
    { label: "Today", value: stats.today, icon: CalendarDays, hint: "Consultations created today" },
    { label: "This Week", value: stats.week, icon: CalendarRange, hint: "Since Monday" },
    { label: "This Month", value: stats.month, icon: Calendar, hint: `vs last month`, trend: stats.trend },
  ];

  const loading = rows === null;

  return (
    <section className="mb-10 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">Patient Statistics</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Live overview of consultations</p>
          </div>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as ProgramFilter)}>
          <TabsList className="h-9">
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

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Card
            key={c.label}
            className="relative overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
          >
            <div className="absolute inset-0 opacity-[0.04] gradient-primary pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {c.label}
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <c.icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              {loading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold tracking-tight">{c.value}</div>
                  {typeof c.trend === "number" && (
                    <span
                      className={`text-[11px] font-medium flex items-center gap-0.5 ${
                        c.trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                      }`}
                    >
                      <TrendingUp className={`h-3 w-3 ${c.trend < 0 ? "rotate-180" : ""}`} />
                      {c.trend > 0 ? "+" : ""}{c.trend}%
                    </span>
                  )}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">14-Day Trend</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Daily consultations by program
                </p>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillPeptides" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PEPTIDE_COLOR} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={PEPTIDE_COLOR} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillWL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={WL_COLOR} stopOpacity={0.45} />
                      <stop offset="95%" stopColor={WL_COLOR} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                    width={30}
                  />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {(filter === "all" || filter === "peptides") && (
                    <Area
                      type="monotone"
                      dataKey="peptides"
                      stackId="1"
                      stroke={PEPTIDE_COLOR}
                      strokeWidth={2}
                      fill="url(#fillPeptides)"
                    />
                  )}
                  {(filter === "all" || filter === "weight-loss") && (
                    <Area
                      type="monotone"
                      dataKey="weight-loss"
                      stackId="1"
                      stroke="hsl(var(--accent-foreground))"
                      strokeWidth={2}
                      fill="url(#fillWL)"
                    />
                  )}
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Program Mix</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">This month</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : !hasDistribution ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                No consultations yet this month
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    strokeWidth={2}
                  >
                    {distribution.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={
                          entry.key === "peptides"
                            ? PEPTIDE_COLOR
                            : WL_COLOR
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            {hasDistribution && !loading && (
              <div className="mt-2 space-y-1.5">
                {distribution.map((d) => {
                  const total = distribution.reduce((s, x) => s + x.value, 0) || 1;
                  const pct = Math.round((d.value / total) * 100);
                  return (
                    <div key={d.key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            background:
                              d.key === "peptides"
                                ? PEPTIDE_COLOR
                                : WL_COLOR,
                          }}
                        />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-medium">
                        {d.value} <span className="text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
