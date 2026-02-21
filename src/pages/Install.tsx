import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { Download, Share, MoreVertical, CheckCircle2, Smartphone, ArrowLeft } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-accent mx-auto" />
            <h2 className="text-xl font-semibold">PeptiDOC is Installed!</h2>
            <p className="text-sm text-muted-foreground">You can find it on your home screen.</p>
            <Button onClick={() => navigate("/dashboard")} className="mt-4">Open Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-lg px-4 py-8 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="text-center space-y-3">
          <Logo size="lg" />
          <h1 className="text-2xl font-bold">Install PeptiDOC</h1>
          <p className="text-muted-foreground text-sm">
            Add PeptiDOC to your home screen for instant access — works like a native app.
          </p>
        </div>

        {deferredPrompt && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 text-center space-y-4">
              <Smartphone className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm font-medium">Your browser supports direct install!</p>
              <Button onClick={handleInstall} className="gap-2 w-full">
                <Download className="h-4 w-4" /> Install PeptiDOC
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {isIOS ? <Share className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
              {isIOS ? "Install on iPhone / iPad" : "Install on Android"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isIOS ? (
              <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                <li>Tap the <strong className="text-foreground">Share</strong> button <Share className="h-3.5 w-3.5 inline" /> in Safari</li>
                <li>Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong></li>
                <li>Tap <strong className="text-foreground">"Add"</strong> to confirm</li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                <li>Tap the <strong className="text-foreground">menu</strong> button <MoreVertical className="h-3.5 w-3.5 inline" /> in your browser</li>
                <li>Tap <strong className="text-foreground">"Install app"</strong> or <strong className="text-foreground">"Add to Home Screen"</strong></li>
                <li>Tap <strong className="text-foreground">"Install"</strong> to confirm</li>
              </ol>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          No app store needed. The app works offline and loads instantly.
        </p>
      </div>
    </div>
  );
}
