import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Scale, Sparkles, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";
import DashboardStats from "@/components/DashboardStats";
import IncompleteIntakesList from "@/components/IncompleteIntakesList";
import AppointmentsList from "@/components/AppointmentsList";
import QuickWhatsAppCard from "@/components/QuickWhatsAppCard";

const isClinician = (roles: string[]) => roles.includes("doctor") || roles.includes("nurse");

export default function Dashboard() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const clinician = isClinician(roles);
  const programs = [
    {
      id: "peptides",
      title: "Peptides Program",
      description: "Guided consultation for peptide therapy — intake, protocol matching, and document generation.",
      icon: FlaskConical,
      active: true,
    },
    {
      id: "weight-loss",
      title: "Weight Loss / GLP-1",
      description: "GLP-1 medication consultations for weight management programs.",
      icon: Scale,
      active: true,
    },
  ];

  return (
    <div className="min-h-screen gradient-surface">
      <AppHeader />

      <main className="container mx-auto px-4 py-4 sm:py-8 animate-fade-in">
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl sm:text-2xl font-bold">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Select a consultation program to begin.</p>
        </div>

        {clinician && <QuickWhatsAppCard />}

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 max-w-2xl mb-6 sm:mb-8">
          {programs.map((program) => {
            const blocked = !clinician && program.active;
            return (
            <Card
              key={program.id}
              className={`relative group transition-all duration-200 ${
                program.active && clinician
                  ? "hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40 cursor-pointer hover:-translate-y-0.5"
                  : "opacity-60 cursor-not-allowed"
              }`}
              onClick={() => {
                if (!program.active) return;
                if (!clinician) {
                  toast({ title: "Access Restricted", description: "As a non-clinician, you do not have access to this function.", variant: "destructive" });
                  return;
                }
                navigate(`/program/${program.id}`);
              }}
            >
              {!program.active && (
                <Badge className="absolute top-3 right-3 bg-muted text-muted-foreground text-[10px]">
                  Coming Soon
                </Badge>
              )}
              {blocked && (
                <Badge className="absolute top-3 right-3 bg-destructive/10 text-destructive text-[10px] gap-1">
                  <ShieldAlert className="h-3 w-3" /> Clinician Only
                </Badge>
              )}
              <CardHeader className="pb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary mb-3 group-hover:scale-105 transition-transform">
                  <program.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">{program.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{program.description}</CardDescription>
              </CardContent>
            </Card>
            );
          })}
        </div>

        {clinician && <AppointmentsList />}
        {clinician && <DashboardStats section="charts" />}
        {clinician && <DashboardStats section="kpis" />}
        {clinician && <IncompleteIntakesList />}
      </main>
    </div>
  );
}
