import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_PAYLOAD = 200 * 1024; // 200KB

function sanitizeString(str: unknown, maxLen: number): string {
  if (typeof str !== "string") return "";
  return str.slice(0, maxLen).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

function validateNumber(val: unknown, min: number, max: number): number | undefined {
  const n = Number(val);
  if (isNaN(n) || n < min || n > max) return undefined;
  return n;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Verify user is approved
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("approved")
      .eq("user_id", userId)
      .single();

    if (!profile?.approved) {
      return new Response(JSON.stringify({ error: "Account not approved" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Payload size check ---
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const action = sanitizeString(body.action, 50);

    // ---- SMART FILL: extract patient fields from raw text ----
    if (action === "smart-fill") {
      const rawText = sanitizeString(body.raw_text, 5000);
      if (!rawText) {
        return new Response(JSON.stringify({ error: "raw_text is required (max 5000 chars)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Extract patient data from raw text. Return ONLY valid JSON with fields: name, mobileNumber, bookingId (booking reference number), bookingTime, age, gender (Male/Female/Other), height (in cm), weight (in kg), chronicIllnesses, medications, allergies. Only include fields you can extract. Do not invent data." },
            { role: "user", content: rawText },
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
                  bookingId: { type: "string", description: "Booking reference number" },
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
      const { patient_data, treatment_data, is_followup, followup_data } = body;

      if (!patient_data || typeof patient_data !== "object" || !treatment_data || typeof treatment_data !== "object") {
        return new Response(JSON.stringify({ error: "patient_data and treatment_data are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Sanitize patient data
      const pName = sanitizeString(patient_data.name, 100) || "Patient";
      const pGender = (["Male", "Female", "Other"].includes(patient_data.gender) ? patient_data.gender : "Other") as string;
      const pWeight = validateNumber(patient_data.weight, 1, 500) || 0;
      const pHeight = validateNumber(patient_data.height, 1, 300) || 0;
      const pBmi = validateNumber(patient_data.bmi, 1, 100);
      const pWeightLossCalories = validateNumber(patient_data.weightLossCalories, 100, 10000);
      const pActivityLevel = sanitizeString(patient_data.activityLevel, 50);

      // Sanitize treatment data
      const tMedication = sanitizeString(treatment_data.medication, 100);
      const tOtherDetail = sanitizeString(treatment_data.otherDetail, 200);
      const tDose = sanitizeString(treatment_data.dose, 100);
      const tBloodTestLevel = sanitizeString(treatment_data.bloodTestLevel, 20);

      const glp1Meds = ["Mounjaro", "Wegovy", "Ozempic", "Rybelsus"];
      const isGlp1 = !!tMedication && glp1Meds.includes(tMedication);
      const isOral = tMedication === "Rybelsus";

      const medName = tMedication === "Other"
        ? (tOtherDetail || "Custom Program")
        : (tMedication || "Lifestyle Program");
      const dose = tDose;

      const salutation = pGender === "Male" ? "Mr" : (pGender === "Female" ? "Ms" : "");

      let videoLink = "";
      if (tMedication === "Mounjaro") videoLink = "https://youtube.com/shorts/S0c4uOykHOs";
      else if (tMedication === "Wegovy") videoLink = "https://youtu.be/mWSu8hZZOAs?si=mad5y_oeapGbJYno";

      const protMin = Math.round(pWeight * 1.2);
      const protMax = Math.round(pWeight * 1.5);

      let prompt = "";

      // FOLLOW-UP: short, focused guide
      if (is_followup) {
        const fPreviousDose = sanitizeString(followup_data?.previousDose, 100) || "previous dose";
        const fWeightLost = validateNumber(followup_data?.weightLost, 0, 500);
        const fSideEffects = sanitizeString(followup_data?.sideEffects, 500) || "none reported";

        const followupGreeting = `Hi ${salutation} ${pName}, here is your follow-up reminder for your continued ${medName} treatment.`;

        prompt = `Create a SHORT follow-up patient reminder for ${pName} continuing ${medName} ${dose}.
CRITICAL: This is a FOLLOW-UP visit, NOT a new patient. Keep it concise — no more than 4–5 short sections.
Start exactly with: "${followupGreeting}"

::: REFILL SUMMARY :::
Previous dose: ${fPreviousDose}. New prescribed dose: ${medName} ${dose}.
${fWeightLost ? `Weight lost so far: ${fWeightLost} kg.` : ""}
Side effects reported: ${fSideEffects}.

::: MEDICATION REMINDER :::
${isOral
  ? "Continue taking one tablet daily on an empty stomach. Swallow whole with a small sip of water. Wait 30 minutes before eating."
  : `Continue ${medName} ${dose} injection once weekly on the same day. Rotate injection sites.`}

::: IMPORTANT REMINDERS :::
- Stay hydrated (2-3 liters/day)
- Maintain high protein intake (${protMin}–${protMax}g/day)
- Report any new or worsening side effects immediately
- Do NOT skip doses; if missed, take as soon as possible within 5 days

::: FOLLOW-UP :::
Next review after 4 weeks. Contact the clinic if you experience severe nausea, vomiting, or abdominal pain.
${tBloodTestLevel === "required" ? "REQUIRED: Complete Weight Loss Blood Test (https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test)" : tBloodTestLevel === "recommended" ? "RECOMMENDED: Weight Loss Blood Test (https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test)" : ""}

Sign as:
Dr Sami M. Yesuf
SCOPE Certified Physician

IMPORTANT: Keep this guide SHORT and to the point. Do not repeat full new-patient education.`;
      } else if (isGlp1) {
        const greeting = `Hi ${salutation} ${pName}, this is a guide for you to start your journey with us and take the medication as advised.`;

        const storageSection = isOral
          ? "::: STORAGE INSTRUCTIONS :::\nStore in a dry place at room temperature (below 30°C). Keep in original blister pack until used to protect from moisture."
          : "::: STORAGE INSTRUCTIONS :::\nRefrigeration (2-8°C), room temp limits (30°C for 21 days), do not freeze, protect from light.";

        const adminSection = isOral
          ? `::: HOW TO TAKE :::\nTake one tablet daily on an empty stomach. Swallow whole with a small sip of water (no more than 4oz/120ml). Wait at least 30 minutes before your first food, drink, or other oral medications.`
          : `::: HOW TO INJECT :::\nStep-by-step instructions for ${medName}. Rotate sites. ${videoLink ? `Include this video link: ${videoLink}` : ""}`;

        prompt = `Create a professional Patient-Centered Care Guide for ${pName} starting ${medName} ${dose}.
CRITICAL INSTRUCTION: Start exactly with: "${greeting}"

Follow this structure strictly:

::: INTRODUCTION :::
Purpose of guide, medication name (${medName} ${dose}), explanation of GLP-1/GIP receptor agonists (appetite reduction, delayed gastric emptying, metabolism), and the medical journey ahead.

::: PATIENT SUMMARY :::
Weight: ${pWeight}kg, Height: ${pHeight}cm, BMI: ${pBmi?.toFixed?.(1) || "N/A"}.
Estimated Daily Calories for Weight Loss: ${pWeightLossCalories ? Math.round(pWeightLossCalories) : "---"} kcal/day.

${storageSection}

${adminSection}

::: NUTRITION & DIET STRUCTURE :::
Protein Target: ${protMin}–${protMax} g/day.
Hydration: 2–3 liters/day.
Macronutrient distribution:
• Protein: 40–50%
• Fiber-rich whole foods: 40–50%
• Carbohydrates: <20% (low-GI grains)

::: COMMON SIDE EFFECTS & MANAGEMENT :::
Nausea, constipation, diarrhea, heartburn with home management tips.

::: RED-FLAG SYMPTOMS :::
Severe abdominal pain, persistent vomiting, dehydration. Advise when to seek urgent care.

::: FOLLOW-UP PLAN :::
Mandatory review after 4th dose. Assess tolerance and response.
${tBloodTestLevel === "required" ? "REQUIRED: Complete Weight Loss Blood Test (https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test)" : tBloodTestLevel === "recommended" ? "RECOMMENDED: Weight Loss Blood Test (https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test)" : ""}

Sign as:
Dr Sami M. Yesuf
SCOPE Certified Physician`;
      } else {
        const lifestyleGreeting = `Hi ${salutation} ${pName}, this is your personalized guide for a healthy lifestyle and sustainable weight management journey with us${tMedication === "Other" ? ` alongside your ${tOtherDetail} treatment` : ""}.`;

        prompt = `Create a professional Weight Loss & Lifestyle Guide for ${pName}.
CRITICAL INSTRUCTION: Start with: "${lifestyleGreeting}"

Focus strictly on lifestyle modifications:

::: NUTRITION & DIETARY ADVICE :::
Provide a comprehensive high protein nutrition plan.
Target Protein: ${protMin}–${protMax} g/day.
Macro Breakdown:
• Protein: 40-50%
• Fiber-rich whole foods: 40-50%
• Carbohydrates: <20% (Whole grains, low-GI).

::: PHYSICAL ACTIVITY PLAN :::
Activity Level: ${pActivityLevel}. Provide specific cardio and strength training recommendations based on their weight (${pWeight}kg).

::: CONSISTENCY & MINDSET :::
Strategies for habit formation, tracking progress, and overcoming weight-loss plateaus.

::: HYDRATION & RECOVERY :::
Guidelines for water intake and the importance of sleep in metabolism.

::: FOLLOW-UP PLAN :::
Regular check-ins (monthly) to monitor progress.
${tBloodTestLevel === "required" ? "Note: Please complete the required lab test: https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test" : tBloodTestLevel === "recommended" ? "Note: We recommend completing the lab test: https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test" : ""}

Sign as:
Dr Sami M. Yesuf
SCOPE Certified Physician`;
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a clinical care guide writer for a weight loss clinic. Write clear, patient-friendly guides.\n\n" +
                "OUTPUT FORMAT — STRICT:\n" +
                "• Output PLAIN TEXT ONLY. Never output HTML, never output Markdown code fences, never output <html>, <body>, <div>, <script>, <style>, <link>, class= attributes, or any tags.\n" +
                "• Do NOT wrap the output in ``` blocks of any kind.\n" +
                "• Use ONLY the section delimiter format `::: SECTION TITLE :::` on its own line, followed by the section body as plain prose and bullet lines starting with `-` or `•`.\n" +
                "• Do NOT add Tailwind classes, CSS, JavaScript, or any code. The downstream renderer builds the HTML — your job is the text content only.\n" +
                "• Follow the section structure given by the user exactly.",
            },
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

    if (!intake_answers || typeof intake_answers !== "object") {
      return new Response(JSON.stringify({ error: "intake_answers is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a clinical peptide therapy consultation assistant for a medical clinic. You have deep knowledge of peptide protocols.

Given patient intake data and the clinic's peptide protocol database, you must:

1. Analyze the patient's health goals, medical history, and current conditions
2. Recommend specific peptides with dosages, frequencies, and administration routes from the provided protocol database
3. Flag any contraindications or safety concerns based on patient history
4. Suggest required blood tests before starting, split into MANDATORY (basic) and RECOMMENDED (advanced) categories
5. Recommend complementary supplements

IMPORTANT RULES:
- Only recommend peptides from the provided protocol database
- CRITICAL: List ALL applicable peptides across ALL of the patient's selected health goals. If a patient has 3 goals and each goal maps to 3 peptides, you MUST list all 9 peptides (or more). Do NOT limit to a small number — include every relevant peptide from the database for each goal.
- Always flag if the patient has conditions that contraindicate any peptide
- Be conservative with dosing recommendations for first-time patients
- Consider drug interactions with current medications
- Prioritize "Primary" use peptides over "Secondary" ones for the patient's goals, but still include Secondary peptides in the list

CRITICAL LAB TEST RULES:
- Each peptide's key_blood_tests field uses "MANDATORY:" and "RECOMMENDED:" labels separated by "|".
- For each peptide, mandatory_blood_tests MUST contain ONLY the tests listed under "MANDATORY:" in that peptide's key_blood_tests field. These are the basic panel tests.
- For each peptide, recommended_blood_tests MUST contain ONLY the tests listed under "RECOMMENDED:" in that peptide's key_blood_tests field. These are the advanced/comprehensive panel tests.
- Do NOT put recommended tests into mandatory_blood_tests. Do NOT put mandatory tests into recommended_blood_tests.
- If a peptide only has "RECOMMENDED:" tests (no MANDATORY), then mandatory_blood_tests should be an empty array for that peptide.
- The top-level required_blood_tests should be the union of all mandatory_blood_tests across selected peptides.
- The top-level recommended_blood_tests should be the union of all recommended_blood_tests across selected peptides.

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
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
