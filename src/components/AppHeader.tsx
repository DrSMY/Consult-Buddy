import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
import { LogOut, FolderOpen, BookOpen, ArrowLeft, Users } from "lucide-react";

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showNav?: boolean;
  children?: React.ReactNode;
}

export default function AppHeader({ title, subtitle, showBack = false, showNav = true, children }: Props) {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20">
      <div className="container mx-auto flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {showBack && (
            <Button variant="ghost" size="icon" className="shrink-0 -ml-1" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </button>
          {title && (
            <>
              <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
              <div className="min-w-0 hidden sm:block">
                <p className="text-sm font-medium truncate">{title}</p>
                {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {showNav && (
            <>
              <Button
                variant={isActive("/patient-files") ? "secondary" : "ghost"}
                size="sm"
                onClick={() => navigate("/patient-files")}
                className="gap-1.5 px-2 sm:px-3 text-xs"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Files</span>
              </Button>
              <Button
                variant={isActive("/knowledge-base") ? "secondary" : "ghost"}
                size="sm"
                onClick={() => navigate("/knowledge-base")}
                className="gap-1.5 px-2 sm:px-3 text-xs"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Knowledge</span>
              </Button>
              {roles.includes("admin") && (
                <Button
                  variant={isActive("/user-management") ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/user-management")}
                  className="gap-1.5 px-2 sm:px-3 text-xs"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Users</span>
                </Button>
              )}
            </>
          )}
          {children}
          <div className="h-5 w-px bg-border mx-0.5 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 px-2">
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">{profile?.full_name}</span>
            {roles[0] && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                {roles[0]}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
