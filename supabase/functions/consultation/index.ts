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
            { role: "system", content: "Extract patient data from raw text. Return ONLY valid JSON with fields: name, mobileNumber, bookingId (booking reference number), bookingTime, age, gender (Male/Female/Other), height (in cm), weight (in kg), chronicIllnesses, medications, allergies. Only include fields you can extract. Do not invent data." },
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
      const { patient_data, treatment_data } = body;

      const glp1Meds = ["Mounjaro", "Wegovy", "Ozempic", "Rybelsus"];
      const isGlp1 = !!treatment_data.medication && glp1Meds.includes(treatment_data.medication);
      const isOral = treatment_data.medication === "Rybelsus";

      const medName = treatment_data.medication === "Other"
        ? (treatment_data.otherDetail || "Custom Program")
        : (treatment_data.medication || "Lifestyle Program");
      const dose = treatment_data.dose || "";

      const salutation = patient_data.gender === "Male" ? "Mr" : (patient_data.gender === "Female" ? "Ms" : "");

      let videoLink = "";
      if (treatment_data.medication === "Mounjaro") videoLink = "https://youtube.com/shorts/S0c4uOykHOs";
      else if (treatment_data.medication === "Wegovy") videoLink = "https://youtu.be/mWSu8hZZOAs?si=mad5y_oeapGbJYno";

      const weight = Number(patient_data.weight) || 0;
      const protMin = Math.round(weight * 1.2);
      const protMax = Math.round(weight * 1.5);

      let prompt = "";
      if (isGlp1) {
        const greeting = `Hi ${salutation} ${patient_data.name}, this is a guide for you to start your journey with us and take the medication as advised.`;

        const storageSection = isOral
          ? "::: STORAGE INSTRUCTIONS :::\nStore in a dry place at room temperature (below 30°C). Keep in original blister pack until used to protect from moisture."
          : "::: STORAGE INSTRUCTIONS :::\nRefrigeration (2-8°C), room temp limits (30°C for 21 days), do not freeze, protect from light.";

        const adminSection = isOral
          ? `::: HOW TO TAKE :::\nTake one tablet daily on an empty stomach. Swallow whole with a small sip of water (no more than 4oz/120ml). Wait at least 30 minutes before your first food, drink, or other oral medications.`
          : `::: HOW TO INJECT :::\nStep-by-step instructions for ${medName}. Rotate sites. ${videoLink ? `Include this video link: ${videoLink}` : ""}`;

        prompt = `Create a professional Patient-Centered Care Guide for ${patient_data.name} starting ${medName} ${dose}.
CRITICAL INSTRUCTION: Start exactly with: "${greeting}"

Follow this structure strictly:

::: INTRODUCTION :::
Purpose of guide, medication name (${medName} ${dose}), explanation of GLP-1/GIP receptor agonists (appetite reduction, delayed gastric emptying, metabolism), and the medical journey ahead.

::: PATIENT SUMMARY :::
Weight: ${patient_data.weight}kg, Height: ${patient_data.height}cm, BMI: ${patient_data.bmi?.toFixed?.(1) || "N/A"}.
Estimated Daily Calories for Weight Loss: ${patient_data.weightLossCalories ? Math.round(patient_data.weightLossCalories) : "---"} kcal/day.

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
${treatment_data.bloodTestLevel === "required" ? "REQUIRED: Complete Weight Loss Blood Test (https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test)" : treatment_data.bloodTestLevel === "recommended" ? "RECOMMENDED: Weight Loss Blood Test (https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test)" : ""}

Sign as:
Dr Sami M. Yesuf
SCOPE Certified Physician`;
      } else {
        const lifestyleGreeting = `Hi ${salutation} ${patient_data.name}, this is your personalized guide for a healthy lifestyle and sustainable weight management journey with us${treatment_data.medication === "Other" ? ` alongside your ${treatment_data.otherDetail} treatment` : ""}.`;

        prompt = `Create a professional Weight Loss & Lifestyle Guide for ${patient_data.name}.
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
Activity Level: ${patient_data.activityLevel}. Provide specific cardio and strength training recommendations based on their weight (${patient_data.weight}kg).

::: CONSISTENCY & MINDSET :::
Strategies for habit formation, tracking progress, and overcoming weight-loss plateaus.

::: HYDRATION & RECOVERY :::
Guidelines for water intake and the importance of sleep in metabolism.

::: FOLLOW-UP PLAN :::
Regular check-ins (monthly) to monitor progress.
${treatment_data.bloodTestLevel === "required" ? "Note: Please complete the required lab test: https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test" : treatment_data.bloodTestLevel === "recommended" ? "Note: We recommend completing the lab test: https://www.dardoc.com/dubai/lab-test/weight-loss-blood-test" : ""}

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
            { role: "system", content: "You are a clinical care guide writer for a weight loss clinic. Write clear, patient-friendly guides. Follow the structure exactly as given." },
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
