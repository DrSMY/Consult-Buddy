import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { CheckCircle2, KeyRound } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check URL hash for type=recovery (fallback)
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Failed to reset password", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      await supabase.auth.signOut();
    }
  };

  if (!isRecovery && !success) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-surface px-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          <Card className="glass-card shadow-xl shadow-primary/5">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <KeyRound className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                This page is used to set a new password after clicking a recovery link. If you need to reset your password, go to the login page and click "Forgot password?".
              </p>
              <Button onClick={() => navigate("/auth")} variant="outline">Back to Login</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-surface px-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          <Card className="glass-card shadow-xl shadow-primary/5">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <CheckCircle2 className="h-14 w-14 text-accent mx-auto" />
              <h2 className="text-xl font-semibold">Password Updated!</h2>
              <p className="text-sm text-muted-foreground">Your password has been reset. You can now sign in with your new password.</p>
              <Button onClick={() => navigate("/auth")} className="gradient-primary">Sign In</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center gradient-surface px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>
        <Card className="glass-card shadow-xl shadow-primary/5">
          <CardHeader className="text-center space-y-1 pb-4">
            <CardTitle className="text-xl">Set New Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
