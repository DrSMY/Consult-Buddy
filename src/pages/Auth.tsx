import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

type View = "login" | "signup" | "forgot";

// Only accept same-origin relative paths for `next`, otherwise fall back to /dashboard.
function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default function Auth() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setResetSent(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (view === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("approved, rejected")
          .eq("user_id", data.user.id)
          .single();

        if (profile?.rejected) {
          await supabase.auth.signOut();
          toast({
            title: "Account Rejected",
            description: "Your account has been reviewed and was not approved. Please contact the admin for more information.",
            variant: "destructive",
          });
        } else if (!profile?.approved) {
          await supabase.auth.signOut();
          toast({
            title: "Pending Approval",
            description: "Your account is awaiting admin approval. You'll be notified once you're approved — hang tight!",
          });
        } else {
          navigate(nextPath);
        }
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone },
          emailRedirectTo: `${window.location.origin}${nextPath}`,
        },
      });
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        supabase.functions.invoke('send-confirmation-email', {
          body: { name: fullName, email },
        }).catch(console.error);
        supabase.functions.invoke('notify-admin-signup', {
          body: { name: fullName, email, phone },
        }).catch(console.error);
        toast({
          title: "You're almost in! 🎉",
          description: "Our admin will review and approve your account shortly — hang tight, good things are coming!",
        });
      }
    }
    setLoading(false);
  };

  // Forgot password view
  if (view === "forgot") {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-surface px-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          <Card className="glass-card shadow-xl shadow-primary/5">
            <CardHeader className="text-center space-y-1 pb-4">
              <CardTitle className="text-xl">
                {resetSent ? "Check your email" : "Reset Password"}
              </CardTitle>
              <CardDescription>
                {resetSent
                  ? "We've sent a password reset link to your email."
                  : "Enter your email and we'll send you a reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetSent ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Didn't get the email? Check your spam folder or try again.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => { setResetSent(false); setView("login"); }}
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@clinic.com"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              )}
              {!resetSent && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="text-primary hover:underline font-medium"
                  >
                    Back to Sign In
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isLogin = view === "login";

  return (
    <div className="flex min-h-screen items-center justify-center gradient-surface px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>
        <Card className="glass-card shadow-xl shadow-primary/5">
          <CardHeader className="text-center space-y-1 pb-4">
            <CardTitle className="text-xl">
              {isLogin ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {isLogin ? "Sign in to your consultation platform" : "Join your clinic team"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                    required
                  />
                </div>
              )}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+971 50 123 4567"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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
              <Button type="submit" className="w-full gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setView(isLogin ? "signup" : "login")}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
