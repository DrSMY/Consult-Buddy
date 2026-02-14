import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const action = body.action;

    // ---- SMART FILL: extract patient fields from raw text ----
    if (action === "smart-fill") {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Extract patient data from raw text. Return ONLY valid JSON with fields: name, mobileNumber, bookingTime, age, gender (Male/Female/Other), height (in cm), weight (in kg), chronicIllnesses, medications. Only include fields you can extract. Do not invent data." },
            { role: "user", content: body.raw_text },
          ],
          tools: [{
            type: "function",
            function: {
              name: "extract_patient",
              description: "Extract patient fields from text",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  mobileNumber: { type: "string" },
                  bookingTime: { type: "string" },
                  age: { type: "number" },
                  gender: { type: "string", enum: ["Male", "Female", "Other"] },
                  height: { type: "number", description: "Height in cm" },
                  weight: { type: "number", description: "Weight in kg" },
                  chronicIllnesses: { type: "string" },
                  medications: { type: "string" },
                },
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "extract_patient" } },
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");

      return new Response(JSON.stringify(JSON.parse(toolCall.function.arguments)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- GENERATE GLP-1 PATIENT GUIDE ----
    if (action === "generate-glp1-guide") {
      const { patient_data, treatment_data } = body;

      const prompt = `Generate a comprehensive patient care guide for a weight loss / GLP-1 patient with the following data:

Patient: ${patient_data.name}, Age ${patient_data.age}, ${patient_data.gender}
BMI: ${patient_data.bmi?.toFixed(1) || 'N/A'}
Medication: ${treatment_data.medication} ${treatment_data.dose || treatment_data.otherDetail || ''}
Weight: ${patient_data.weight} kg
Activity Level: ${patient_data.activityLevel}
Chronic Illnesses: ${patient_data.chronicIllnesses || 'None'}
Current Medications: ${patient_data.medications || 'None'}
Previous GLP-1 Use: ${patient_data.previousGlp1Use ? 'Yes' : 'No'}
Weight Loss Target: ${patient_data.weightLossCalories ? Math.round(patient_data.weightLossCalories) + ' kcal/day' : 'N/A'}
Blood Test Required: ${treatment_data.bloodTestRequired ? 'Yes' : 'No'}

Generate a patient-friendly guide covering:
1. Medication overview and how it works
2. Injection/administration instructions
3. Expected side effects and management
4. Dietary recommendations (protein targets: ${patient_data.weight ? Math.round(Number(patient_data.weight) * 1.2) : '?'}g - ${patient_data.weight ? Math.round(Number(patient_data.weight) * 1.5) : '?'}g/day)
5. Lifestyle recommendations
6. When to contact the doctor
7. Storage instructions
${treatment_data.bloodTestRequired ? '8. Blood test information with Dardoc link: https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test' : ''}

Use clear, warm, supportive language. Format with clear sections.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a clinical care guide writer for a weight loss clinic. Write clear, patient-friendly guides." },
            { role: "user", content: prompt },
          ],
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
      const guide = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ guide }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ORIGINAL PEPTIDE CONSULTATION ----
    const { intake_answers, peptide_protocols } = body;

    const systemPrompt = `You are a clinical peptide therapy consultation assistant for a medical clinic. You have deep knowledge of peptide protocols.

Given patient intake data and the clinic's peptide protocol database, you must:

1. Analyze the patient's health goals, medical history, and current conditions
2. Recommend specific peptides with dosages, frequencies, and administration routes from the provided protocol database
3. Flag any contraindications or safety concerns based on patient history
4. Suggest required blood tests before starting, split into MANDATORY (basic) and RECOMMENDED (advanced) categories
5. Recommend complementary supplements

IMPORTANT RULES:
- Only recommend peptides from the provided protocol database
- Always flag if the patient has conditions that contraindicate any peptide
- Be conservative with dosing recommendations for first-time patients
- Consider drug interactions with current medications
- Prioritize "Primary" use peptides over "Secondary" ones for the patient's goals
- Each peptide's key_blood_tests field contains MANDATORY and RECOMMENDED tests separated by "|". Use this to populate mandatory_blood_tests and recommended_blood_tests per peptide.
- mandatory_blood_tests are the basic tests always needed
- recommended_blood_tests are additional advanced tests for comprehensive monitoring

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
                        mandatory_blood_tests: {
                          type: "array",
                          items: { type: "string" },
                          description: "Basic/mandatory blood tests required for this peptide",
                        },
                        recommended_blood_tests: {
                          type: "array",
                          items: { type: "string" },
                          description: "Advanced/recommended blood tests for comprehensive monitoring",
                        },
                      },
                      required: ["name", "rationale", "dosage", "duration", "administration", "priority", "mandatory_blood_tests", "recommended_blood_tests"],
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
                    description: "Combined list of all mandatory blood tests across all recommended peptides",
                  },
                  recommended_blood_tests: {
                    type: "array",
                    items: { type: "string" },
                    description: "Combined list of all recommended/advanced blood tests across all recommended peptides",
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
                  "recommended_blood_tests",
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
