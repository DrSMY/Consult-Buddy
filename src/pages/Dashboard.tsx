import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, FlaskConical, Scale, LogOut, BookOpen, FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { profile, roles, signOut } = useAuth();
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold leading-tight truncate">Clinic Assistant</h1>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.full_name || "Welcome"}{" "}
                {roles[0] && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {roles[0]}
                  </Badge>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate("/patient-files")} className="gap-1 sm:gap-2 px-2 sm:px-3">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Patient Files</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/knowledge-base")} className="gap-1 sm:gap-2 px-2 sm:px-3">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Knowledge Base</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Select a Program</h2>
          <p className="text-muted-foreground mt-1">Choose a consultation program to begin a patient intake.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          {programs.map((program) => (
            <Card
              key={program.id}
              className={`relative transition-all ${
                program.active
                  ? "hover:shadow-md hover:border-primary/40 cursor-pointer"
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-2">
                  <program.icon className="h-5 w-5 text-primary" />
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
