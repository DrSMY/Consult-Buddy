import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { intake_answers, peptide_protocols } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a clinical peptide therapy consultation assistant for a medical clinic. You have deep knowledge of peptide protocols.

Given patient intake data and the clinic's peptide protocol database, you must:

1. Analyze the patient's health goals, medical history, and current conditions
2. Recommend specific peptides with dosages, frequencies, and administration routes from the provided protocol database
3. Flag any contraindications or safety concerns based on patient history
4. Suggest required blood tests before starting
5. Recommend complementary supplements

IMPORTANT RULES:
- Only recommend peptides from the provided protocol database
- Always flag if the patient has conditions that contraindicate any peptide
- Be conservative with dosing recommendations for first-time patients
- Consider drug interactions with current medications
- Prioritize "Primary" use peptides over "Secondary" ones for the patient's goals

You MUST respond using the provided tool function.`;

    const userPrompt = `## Patient Intake Data
${JSON.stringify(intake_answers, null, 2)}

## Available Peptide Protocols
${JSON.stringify(peptide_protocols, null, 2)}

Based on this patient's intake data and the available peptide protocols, provide your clinical recommendations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_consultation",
              description: "Provide peptide therapy consultation results",
              parameters: {
                type: "object",
                properties: {
                  recommended_peptides: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        rationale: { type: "string" },
                        dosage: { type: "string" },
                        duration: { type: "string" },
                        administration: { type: "string" },
                        priority: { type: "string", enum: ["Primary", "Secondary"] },
                        required_blood_tests: {
                          type: "array",
                          items: { type: "string" },
                          description: "Blood tests specifically required for this peptide",
                        },
                      },
                      required: ["name", "rationale", "dosage", "duration", "administration", "priority", "required_blood_tests"],
                    },
                  },
                  safety_flags: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        concern: { type: "string" },
                        severity: { type: "string", enum: ["low", "moderate", "high"] },
                        recommendation: { type: "string" },
                      },
                      required: ["concern", "severity", "recommendation"],
                    },
                  },
                  required_blood_tests: {
                    type: "array",
                    items: { type: "string" },
                  },
                  recommended_supplements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        dosage: { type: "string" },
                        reason: { type: "string" },
                      },
                      required: ["name", "dosage", "reason"],
                    },
                  },
                  doctor_note: { type: "string" },
                  next_steps: { type: "string" },
                  patient_guidelines: { type: "string" },
                  clinical_summary: { type: "string" },
                },
                required: [
                  "recommended_peptides",
                  "safety_flags",
                  "required_blood_tests",
                  "recommended_supplements",
                  "doctor_note",
                  "next_steps",
                  "patient_guidelines",
                  "clinical_summary",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_consultation" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const consultation = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(consultation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("consultation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
