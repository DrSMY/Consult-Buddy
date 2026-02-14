import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Scale, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

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
      active: false,
    },
  ];

  return (
    <div className="min-h-screen gradient-surface">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h2>
          </div>
          <p className="text-muted-foreground">Select a consultation program to begin.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          {programs.map((program) => (
            <Card
              key={program.id}
              className={`relative group transition-all duration-200 ${
                program.active
                  ? "hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40 cursor-pointer hover:-translate-y-0.5"
                  : "opacity-50 cursor-not-allowed"
              }`}
              onClick={() => program.active && navigate(`/program/${program.id}`)}
            >
              {!program.active && (
                <Badge className="absolute top-3 right-3 bg-muted text-muted-foreground text-[10px]">
                  Coming Soon
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
          ))}
        </div>
      </main>
    </div>
  );
}
