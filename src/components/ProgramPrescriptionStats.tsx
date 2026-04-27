import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill, TrendingUp, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";

type Range = "30d" | "90d" | "all";
type Program = "peptides" | "weight-loss";

interface Props {
  program: Program;
}

interface Row {
  ai_recommendations: any;
  created_at: string;
}

const RANGE_DAYS: Record<Range, number | null> = {
  "30d": 30,
  "90d": 90,
  all: null,
};

// Pleasant teal-leaning palette consistent with the app theme
const COLORS = [
  "hsl(174 60% 42%)",
  "hsl(152 55% 45%)",
  "hsl(199 70% 50%)",
  "hsl(43 80% 55%)",
  "hsl(280 50% 55%)",
  "hsl(14 75% 58%)",
  "hsl(220 60% 55%)",
  "hsl(120 40% 50%)",
];

export default function ProgramPrescriptionStats({ program }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [range, setRange] = useState<Range>("90d");
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setRows(null);
    supabase
      .from("consultations")
      .select("ai_recommendations, created_at")
      .eq("program", program)
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        if (active) setRows((data as Row[]) || []);
      });
    return () => {
      active = false;
    };
  }, [program]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const days = RANGE_DAYS[range];
    if (days == null) return rows;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return rows.filter((r) => new Date(r.created_at) >= cutoff);
  }, [rows, range]);

  // Aggregate prescribed med/peptide counts
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    let totalPrescriptions = 0;
    let consultationsWithRx = 0;

    for (const r of filtered) {
      const recs = r.ai_recommendations || {};
      const names: string[] = [];

      if (program === "peptides") {
        const peps = Array.isArray(recs.recommended_peptides)
          ? recs.recommended_peptides
          : [];
        for (const p of peps) {
          const name = (p?.name || "").toString().trim();
          if (name) names.push(name);
        }
      } else {
        // weight-loss
        const med = (recs.medication || "").toString().trim();
        if (med && med !== "Other") names.push(med);
        else if (med === "Other") names.push("Other");
      }

      if (names.length > 0) consultationsWithRx++;
      for (const n of names) {
        counts.set(n, (counts.get(n) || 0) + 1);
        totalPrescriptions++;
      }
    }

    const sliceN = isMobile ? 5 : 8;
    const sorted = Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, sliceN);

    return {
      chart: sorted,
      totalPrescriptions,
      consultationsWithRx,
      uniqueMeds: counts.size,
    };
  }, [filtered, program, isMobile]);

  const loading = rows === null;
  const isEmpty = !loading && data.chart.length === 0;

  const title =
    program === "peptides"
      ? "Top Prescribed Peptides"
      : "Top Prescribed GLP-1 Medications";
  const subtitle =
    program === "peptides"
      ? "Frequency of peptides finalized in consultations"
      : "Frequency of weight-loss medications finalized in consultations";

  const chartConfig = { value: { label: "Prescriptions" } } as const;

  const topItem = data.chart[0];
  const chartHeight = isMobile ? 30 + data.chart.length * 32 : 260;

  return (
    <Card className="mb-4 sm:mb-8 border-primary/20">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg gradient-primary">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xs sm:text-sm font-semibold truncate">{title}</CardTitle>
              <p className="hidden sm:block text-[11px] text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </p>
            </div>
          </div>
          <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
            <TabsList className="h-7 sm:h-8">
              <TabsTrigger value="30d" className="text-[10px] sm:text-[11px] px-2 sm:px-2.5">
                30d
              </TabsTrigger>
              <TabsTrigger value="90d" className="text-[10px] sm:text-[11px] px-2 sm:px-2.5">
                90d
              </TabsTrigger>
              <TabsTrigger value="all" className="text-[10px] sm:text-[11px] px-2 sm:px-2.5">
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <KpiTile
            icon={<Pill className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            label="Rx"
            fullLabel="Prescriptions"
            value={data.totalPrescriptions}
            loading={loading}
          />
          <KpiTile
            icon={<TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            label="w/ Rx"
            fullLabel="Consults w/ Rx"
            value={data.consultationsWithRx}
            loading={loading}
          />
          <KpiTile
            icon={<BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            label={program === "peptides" ? "Peptides" : "Meds"}
            fullLabel={program === "peptides" ? "Unique Peptides" : "Unique Meds"}
            value={data.uniqueMeds}
            loading={loading}
          />
        </div>

        {/* Mobile: top item preview + collapsible chart. Desktop: always show chart */}
        {isMobile ? (
          loading ? (
            <Skeleton className="h-12 w-full" />
          ) : isEmpty ? (
            <div className="h-16 flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md">
              No prescriptions in this period yet.
            </div>
          ) : (
            <Collapsible open={open} onOpenChange={setOpen}>
              {!open && topItem && (
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Top {program === "peptides" ? "peptide" : "med"}
                    </div>
                    <div className="text-sm font-semibold truncate">{topItem.name}</div>
                  </div>
                  <div className="text-base font-bold text-primary tabular-nums shrink-0 ml-2">
                    {topItem.value}
                  </div>
                </div>
              )}
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 mt-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {open ? (
                    <>Hide chart <ChevronUp className="h-3.5 w-3.5 ml-1" /></>
                  ) : (
                    <>Show full chart <ChevronDown className="h-3.5 w-3.5 ml-1" /></>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ChartContainer config={chartConfig} style={{ height: chartHeight }} className="w-full">
                  <BarChart
                    data={data.chart}
                    layout="vertical"
                    margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={90} />
                    <ChartTooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {data.chart.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                      <LabelList dataKey="value" position="right" className="fill-foreground" style={{ fontSize: 10, fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CollapsibleContent>
            </Collapsible>
          )
        ) : loading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : isEmpty ? (
          <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md">
            No prescriptions recorded in this period yet.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <BarChart
              data={data.chart}
              layout="vertical"
              margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={110} />
              <ChartTooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.chart.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
                <LabelList dataKey="value" position="right" className="fill-foreground" style={{ fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function KpiTile({
  icon,
  label,
  fullLabel,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  fullLabel?: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card/60 px-2 sm:px-3 py-2 sm:py-2.5 min-w-0">
      <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] uppercase tracking-wide text-muted-foreground font-medium truncate">
        <span className="text-primary shrink-0">{icon}</span>
        <span className="sm:hidden truncate">{label}</span>
        <span className="hidden sm:inline truncate">{fullLabel || label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-5 sm:h-6 w-10 sm:w-12 mt-1" />
      ) : (
        <div className="text-base sm:text-xl font-bold tracking-tight mt-0.5 tabular-nums">{value}</div>
      )}
    </div>
  );
}
