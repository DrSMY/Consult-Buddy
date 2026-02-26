import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { generateGuideHTML, type PatientGuideData } from "@/utils/guideHtml";

export default function GuideViewer() {
  const { id } = useParams();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("patient_guides")
      .select("guide_data, expires_at")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError("This guide was not found or has expired.");
        } else if (new Date(data.expires_at) < new Date()) {
          setError("This guide link has expired. Please contact your clinic for an updated guide.");
        } else {
          const guideData = data.guide_data as unknown as PatientGuideData;
          setHtml(generateGuideHTML(guideData));
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#64748b" }}>
        Loading your care guide...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Guide Not Available</h1>
        <p style={{ color: "#64748b", textAlign: "center", maxWidth: 400 }}>{error}</p>
      </div>
    );
  }

  // Render the full-page HTML guide
  return (
    <iframe
      srcDoc={html!}
      style={{ width: "100%", height: "100vh", border: "none" }}
      title="Patient Care Guide"
      sandbox="allow-same-origin"
    />
  );
}
