import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (profile && !profile.approved) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-surface px-4">
        <Card className="w-full max-w-md glass-card shadow-xl text-center">
          <CardHeader>
            <ShieldAlert className="h-12 w-12 mx-auto text-amber-500 mb-2" />
            <CardTitle className="text-lg">Account Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your account has been created but is awaiting admin approval. 
              You'll be able to access the platform once approved.
            </p>
            <Button variant="outline" onClick={signOut} className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
