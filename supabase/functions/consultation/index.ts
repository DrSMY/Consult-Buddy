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

/**
 * Defensive cleanup: if the AI returned an HTML document or fenced code block
 * instead of the expected `::: SECTION :::` plain-text format, salvage what
 * we can so the downstream renderer doesn't display raw markup to clinicians.
 */
function sanitizeGuideOutput(raw: string): string {
  if (!raw) return raw;
  let text = raw.trim();

  // Strip leading/trailing markdown code fences (```html ... ``` or ``` ... ```)
  text = text.replace(/^```[a-zA-Z]*\s*\n?/, "").replace(/\n?```\s*$/, "").trim();

  // If the model returned HTML, strip tags, scripts, and styles to recover plain text.
  const looksLikeHtml = /<\s*(html|body|div|script|style|head|meta|link|h[1-6]|p|ul|li|span)\b/i.test(text);
  if (looksLikeHtml) {
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<head[\s\S]*?<\/head>/gi, "")
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      // Convert headings/list items to bullet lines so the renderer keeps structure
      .replace(/<\s*(h[1-6])[^>]*>([\s\S]*?)<\/\s*\1\s*>/gi, "\n$2\n")
      .replace(/<\s*li[^>]*>([\s\S]*?)<\/\s*li\s*>/gi, "- $1\n")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\s*\/\s*p\s*>/gi, "\n\n")
      // Drop all remaining tags
      .replace(/<[^>]+>/g, "")
      // Decode common entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return text;
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
            { role: "system", content: `Extract patient data from raw text. Return ONLY valid JSON with fields: name, mobileNumber, bookingId (booking reference number), bookingTime, dateOfBirth (ISO YYYY-MM-DD if a DOB is present in any format like DD/MM/YYYY, MM/DD/YYYY, or written), age (integer years), gender (Male/Female/Other), height (in cm), weight (in kg), chronicIllnesses, medications, allergies. If a date of birth is present, ALWAYS return dateOfBirth in YYYY-MM-DD format and compute age as the integer number of completed years between dateOfBirth and today (${new Date().toISOString().slice(0,10)}); do NOT just copy a year. Assume DD/MM/YYYY for ambiguous numeric dates. Only include fields you can extract. Do not invent data.` },
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
                  dateOfBirth: { type: "string", description: "ISO YYYY-MM-DD" },
                  age: { type: "number", description: "Integer years; if dateOfBirth is provided, must equal completed years from DOB to today" },
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

      const parsed = JSON.parse(toolCall.function.arguments);
      // Authoritative age computation from DOB to avoid model arithmetic mistakes
      if (parsed.dateOfBirth) {
        const dob = new Date(parsed.dateOfBirth);
        if (!isNaN(dob.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
          if (age >= 0 && age < 130) parsed.age = age;
        }
      }

      return new Response(JSON.stringify(parsed), {
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

      const glp1Meds = ["Mounjaro", "Wegovy", "Wegovy Pill", "Ozempic", "Rybelsus"];
      const isGlp1 = !!tMedication && glp1Meds.includes(tMedication);
      const isOral = tMedication === "Rybelsus" || tMedication === "Wegovy Pill";
      const isWegovyPill = tMedication === "Wegovy Pill";

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
DarDoc Healthcare
SCOPE Certified Physician

IMPORTANT: Keep this guide SHORT and to the point. Do not repeat full new-patient education.`;
      } else if (isGlp1) {
        const greeting = `Hello ${salutation} ${pName},\n\nWelcome to your weight loss journey with us. Please read the guide below carefully and follow the medication instructions as advised.`;

        const medFrequencyLine = isOral
          ? "• Daily oral tablet\n• Take once daily on an empty stomach, at the same time each day"
          : "• Weekly subcutaneous injection\n• Take once weekly on the same day each week";

        const storageSection = isOral
          ? `::: 🧊 STORAGE INSTRUCTIONS :::
• Store ${medName} tablets in a dry place at room temperature (below 30°C)
• Keep tablets in their original blister pack until use to protect from moisture
• Do not store in the bathroom or other humid areas
• Keep out of reach of children`
          : `::: 🧊 STORAGE INSTRUCTIONS :::
• Store ${medName} pens in the refrigerator between 2°C–8°C
• Pens may remain at room temperature (up to 30°C) for up to 21 days if necessary
• Do not freeze the medication
• Keep the pen in its original carton to protect it from light`;

        const adminSection = isOral
          ? `::: 💊 HOW TO TAKE YOUR MEDICATION :::
Take one tablet daily on an empty stomach

Swallow whole with a small sip of water (no more than 4oz / 120ml)

Do not split, crush, or chew the tablet

Wait at least 30 minutes before any food, drink, or other oral medication

Take at the same time each day for best results`
          : `::: 💉 HOW TO INJECT :::
Wash your hands thoroughly

Clean the injection site (abdomen, thigh, or upper arm) using an alcohol swab

Remove the pen cap

Press the pen firmly against the skin until injection begins

Hold firmly until the yellow indicator stops moving and the second click is heard

Rotate injection sites weekly to minimize irritation
${videoLink ? `\n🎥 Injection Video Guide:\n${videoLink}` : ""}`;

        // Med-specific mechanism — differentiates Wegovy/Ozempic/Rybelsus (GLP-1 only)
        // from Mounjaro (dual GLP-1 + GIP receptor agonist).
        let mechanismIntro = "";
        let mechanismBullets = "";
        if (tMedication === "Mounjaro") {
          mechanismIntro = `${medName} (tirzepatide) is a dual GIP and GLP-1 receptor agonist — the first medication of its kind. It activates two gut hormone pathways at the same time, which is why it often produces stronger appetite control and greater weight loss than GLP-1-only medications.`;
          mechanismBullets = `• GLP-1 action: reduces appetite, slows stomach emptying, and improves satiety
• GIP action: enhances insulin sensitivity, supports fat metabolism, and may further reduce food cravings
• Combined effect: more effective blood sugar control and sustained weight loss
• Supports long-term metabolic health when paired with lifestyle changes`;
        } else if (tMedication === "Wegovy") {
          mechanismIntro = `${medName} (semaglutide) is a once-weekly GLP-1 receptor agonist specifically approved for chronic weight management. It mimics a natural gut hormone (GLP-1) that regulates appetite and food intake.`;
          mechanismBullets = `• Reducing appetite and cravings
• Increasing feelings of fullness
• Slowing stomach emptying
• Supporting metabolic health and sustainable weight loss`;
        } else if (tMedication === "Ozempic") {
          mechanismIntro = `${medName} (semaglutide) is a once-weekly GLP-1 receptor agonist. It mimics the natural GLP-1 hormone to regulate blood sugar and appetite, supporting steady weight loss alongside lifestyle changes.`;
          mechanismBullets = `• Reducing appetite and cravings
• Increasing feelings of fullness
• Slowing stomach emptying
• Improving blood sugar control and metabolic health`;
        } else if (tMedication === "Rybelsus") {
          mechanismIntro = `${medName} (oral semaglutide) is the only GLP-1 receptor agonist available as a daily tablet. It works through the same GLP-1 pathway as injectable semaglutide, but is taken by mouth on an empty stomach for proper absorption.`;
          mechanismBullets = `• Reducing appetite and cravings
• Increasing feelings of fullness
• Slowing stomach emptying
• Supporting blood sugar control and gradual weight loss`;
        } else if (tMedication === "Wegovy Pill") {
          mechanismIntro = `${medName} (oral semaglutide for weight management) is a daily GLP-1 receptor agonist tablet. It works through the same GLP-1 pathway as injectable Wegovy, but is taken by mouth on an empty stomach for proper absorption. Doses are escalated gradually to reach the 25 mg maintenance dose.`;
          mechanismBullets = `• Reducing appetite and cravings
• Increasing feelings of fullness
• Slowing stomach emptying
• Supporting sustained weight loss when combined with lifestyle changes`;
        } else {
          mechanismIntro = `${medName} is a GLP-1 receptor agonist that mimics a natural gut hormone to regulate appetite and metabolism.`;
          mechanismBullets = `• Reducing appetite and cravings
• Increasing feelings of fullness
• Slowing stomach emptying
• Supporting metabolic health and sustainable weight loss`;
        }

        const howItWorksSection = `::: 💉 HOW ${medName.toUpperCase()} WORKS :::
${mechanismIntro}

It works by:

${mechanismBullets}

This treatment works best when combined with proper nutrition, hydration, and lifestyle adjustments.`;

        const followUpLab = tBloodTestLevel === "required"
          ? `🧪 Required Baseline Test:\n\nWeight Loss Blood Test\n\nhttps://www.dardoc.com/dubai/lab-test/weight-loss-blood-test`
          : tBloodTestLevel === "recommended"
          ? `🧪 Recommended Baseline Test:\n\nWeight Loss Blood Test\n\nhttps://www.dardoc.com/dubai/lab-test/weight-loss-blood-test`
          : "";

        prompt = `Create a Weight Loss Patient Guide for ${pName} starting ${medName} ${dose}.
CRITICAL: Output EXACTLY the structure below. Do not add or remove sections. Do not rephrase headings — keep emojis in the section titles exactly as written. Use the section delimiters \`::: TITLE :::\` exactly as shown. Preserve emojis and bullet symbols (• and ✔) exactly. Do not invent new content beyond what is asked. Do NOT change the mechanism-of-action wording in the HOW ${medName.toUpperCase()} WORKS section — output it verbatim.

Start exactly with this greeting (verbatim, including the blank line):
${greeting}

Then output the following sections in this exact order:

::: 📌 MEDICATION PRESCRIBED :::
${medName} ${dose}

${medFrequencyLine}

::: 📋 YOUR SUMMARY :::
• Weight: ${pWeight} kg
• Height: ${pHeight} cm
• BMI: ${pBmi?.toFixed?.(1) || "N/A"}
• Daily Calorie Target for Weight Loss: ${pWeightLossCalories ? Math.round(pWeightLossCalories) : "---"} kcal/day

Maintaining this calorie target is important for achieving the best results while on the starting dose.

${howItWorksSection}

${storageSection}

${adminSection}
${isWegovyPill ? `
::: 📈 DOSE ESCALATION & REFILL SCHEDULE :::
${medName} is taken daily and the dose is increased gradually every 30 days as tolerated. Your current starting dose is ${dose}.

Standard escalation plan:
• Month 1: 1.5 mg once daily
• Month 2: 4 mg once daily
• Month 3: 9 mg once daily
• Month 4 onwards: 25 mg once daily (maintenance dose)

What to expect:
• Appetite suppression and early satiety usually begin in the first 1–2 weeks
• Most weight loss occurs gradually over 3–6 months as the dose is escalated
• Mild nausea, reduced appetite, or constipation are most common in the first week of each new dose level and usually settle within a few days

When to refill:
• Order your next pack 5–7 days before you finish your current supply to avoid any treatment gap
• Refill monthly — each pack contains a 30-day supply
• Do NOT skip the escalation step unless advised by your doctor; moving up too quickly increases side effects
• If you experience significant side effects, stay on the current dose for an additional month before escalating

` : ""}

::: 🥗 NUTRITION & DIET STRUCTURE :::
To preserve muscle mass and optimize fat loss:

• Protein Target: ${protMin}–${protMax} g/day
• Hydration: 2–3 liters water daily
• Protein Intake: 40–50% of meals
• Fiber-Rich Foods: 40–50% of meals
• Carbohydrates: Keep below 20% and focus on low-GI sources

Recommended foods include:

✔ Lean meats
✔ Fish
✔ Eggs
✔ Tofu & legumes
✔ Leafy greens & vegetables
✔ Quinoa / steel-cut oats

::: ✨ GLP-1 SUCCESS TIPS & REMINDERS :::
🌱 Losing even 5% of your body weight can significantly help reduce the risk of:

• Type 2 diabetes
• High blood pressure
• Fatty liver disease
• Sleep apnea
• Heart disease and stroke
• Joint and back pain

💡 GLP-1 medications are not a quick fix — they are tools to help you build sustainable long-term habits.

The longer you stay consistent with:

• Proper nutrition
• Protein intake
• Hydration
• Physical activity
• Sleep and lifestyle correction

…the more likely you are to achieve healthy, long-lasting weight loss and maintain your progress.

🏃 Focus on progress, not perfection.

Small consistent improvements every week create major long-term health changes.

💪 Preserve muscle while losing fat.

Aim for:

• Adequate protein intake
• Regular walking
• Strength or resistance training 2–3 times weekly

💧 Hydration is important.

Many side effects improve simply by:

• Drinking enough water
• Increasing fiber intake
• Avoiding overeating and greasy foods

📉 Weight loss is not always perfectly linear.

Some weeks may be slower than others — consistency matters more than rapid short-term changes.

::: ⚠ COMMON SIDE EFFECTS & MANAGEMENT :::
• Nausea: Eat smaller meals and avoid greasy or spicy foods
• Constipation: Increase fiber, water intake, and walking
• Diarrhea: Stay hydrated and consume bland foods
• Heartburn: Avoid late meals and reduce caffeine intake

::: 🚨 SEEK URGENT MEDICAL ATTENTION IF YOU EXPERIENCE :::
• Severe or persistent abdominal pain
• Persistent vomiting preventing fluid intake
• Severe dehydration, dizziness, or dark urine

::: 📅 FOLLOW-UP PLAN :::
A mandatory medical review is required after your 4th dose to assess:

• Medication tolerance
• Weight loss progress
• Side effects
• Possible dose escalation
${followUpLab ? `\n${followUpLab}` : ""}

End the guide with this signature on its own lines (no section delimiter):

Dr Sami M. Yesuf
DarDoc Healthcare
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
DarDoc Healthcare
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
      let guide = data.choices?.[0]?.message?.content || "";

      // Defensive sanitizer: if the model returned HTML or code fences, extract the plain-text guide.
      guide = sanitizeGuideOutput(guide);

      return new Response(JSON.stringify({ guide }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- SUGGEST NEXT STEPS (lab tests, supplements, notes) for CHOSEN peptides ----
    if (action === "suggest-next-steps") {
      const {
        patient_name,
        intake_answers,
        chosen_peptides,
        current_lab_tests,
        current_supplements,
        lab_tier,
      } = body;

      if (!Array.isArray(chosen_peptides) || chosen_peptides.length === 0) {
        return new Response(JSON.stringify({ error: "chosen_peptides is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const safeName = sanitizeString(patient_name, 100) || "Patient";

      const suggestSystem = `You are a clinical peptide therapy consultation assistant. The physician has chosen the peptides and configured doses. Now suggest the most appropriate NEXT STEPS for this specific patient and prescription:

1. suggested_lab_tests — additional lab tests beyond the current panel that you would recommend for safety monitoring or efficacy tracking, given the chosen peptides + patient history. Return only test NAMES (e.g. "Vitamin D", "Ferritin", "HbA1c"). Do NOT repeat tests already in current_lab_tests.
2. suggested_supplements — additional supplements (beyond current_supplements) that would synergize with this regimen or address gaps in the patient's intake. Each item: { name, dosage, reason }. Do NOT repeat names already present in current_supplements.
3. lab_notes — short clinical instructions for the lab order (fasting requirements, timing, repeat schedule, special collection notes).
4. clinical_notes — concise (3–6 sentences) physician-facing notes summarizing why these next steps matter for THIS patient with THIS regimen.

Be conservative, evidence-based, and patient-specific. If nothing additional is needed for a category, return an empty array / empty string.`;

      const suggestUser = `## Patient Name
${safeName}

## Patient Intake Data
${JSON.stringify(intake_answers ?? {}, null, 2)}

## CHOSEN Peptides (with finalized dose/frequency/route)
${JSON.stringify(chosen_peptides, null, 2)}

## Current Lab Tests (${sanitizeString(lab_tier, 20) || "basic"} tier, already in panel)
${JSON.stringify(current_lab_tests ?? [], null, 2)}

## Current Supplements (already selected)
${JSON.stringify(current_supplements ?? [], null, 2)}

Suggest additional lab tests, additional supplements, lab order notes, and clinical notes tailored to this patient and prescribed regimen.`;

      const sResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: suggestSystem },
            { role: "user", content: suggestUser },
          ],
          tools: [{
            type: "function",
            function: {
              name: "suggest_next_steps",
              description: "Return suggested additional lab tests, supplements, and clinical notes.",
              parameters: {
                type: "object",
                properties: {
                  suggested_lab_tests: { type: "array", items: { type: "string" } },
                  suggested_supplements: {
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
                  lab_notes: { type: "string" },
                  clinical_notes: { type: "string" },
                },
                required: ["suggested_lab_tests", "suggested_supplements", "lab_notes", "clinical_notes"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "suggest_next_steps" } },
        }),
      });

      if (!sResp.ok) {
        if (sResp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (sResp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await sResp.text();
        console.error("AI gateway error (suggest-next-steps):", sResp.status, t);
        throw new Error("AI gateway error");
      }

      const sdata = await sResp.json();
      const stool = sdata.choices?.[0]?.message?.tool_calls?.[0];
      if (!stool) throw new Error("No tool call in suggest-next-steps response");
      const sparsed = JSON.parse(stool.function.arguments);
      sparsed.lab_notes = sanitizeGuideOutput(sparsed.lab_notes || "");
      sparsed.clinical_notes = sanitizeGuideOutput(sparsed.clinical_notes || "");

      return new Response(JSON.stringify(sparsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- FINALIZE PEPTIDE PLAN (regenerate narrative based on CHOSEN peptides) ----
    if (action === "finalize-peptide-plan") {
      const {
        patient_name,
        intake_answers,
        chosen_peptides,
        chosen_supplements,
        final_lab_tests,
        lab_tier,
        lab_notes,
      } = body;

      if (!Array.isArray(chosen_peptides) || chosen_peptides.length === 0) {
        return new Response(JSON.stringify({ error: "chosen_peptides is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const safeName = sanitizeString(patient_name, 100) || "Patient";

      const finalizeSystem = `You are a clinical peptide therapy consultation assistant. The physician has FINALIZED the prescription. Your job is to generate the final clinical narrative and patient-facing guide based ONLY on the peptides the physician actually chose (with their finalized doses, frequencies, vial sizes, supply days, and routes). Do NOT mention peptides that were merely suggested earlier and not chosen. Do NOT recommend additional peptides.

Write three pieces of content for this finalized plan:
1. clinical_summary — concise (4–8 sentences) physician-facing rationale: why these specific chosen peptides fit this patient's goals & history, expected synergies, and key monitoring points.
2. doctor_note — internal narrative clinical notes (8–15 sentences) covering: presenting goals, relevant history/contraindications considered, prescribed regimen rationale (cite each chosen peptide by name with its actual prescribed dose/frequency), supplement rationale, lab plan rationale, and follow-up plan.
3. patient_guidelines — warm, plain-language patient-facing guide. Address the patient by name. Cover: a brief intro, what each prescribed peptide does for them (using their actual prescribed dose/frequency in plain language), what to expect in the first weeks, lifestyle reminders, supplement reminders, lab test reminders, red-flag symptoms, and follow-up. Use clear short paragraphs and bullet lines starting with "- ". Plain text only — no HTML, no markdown fences. Sign as "Dr Sami M. Yesuf, DarDoc Healthcare, SCOPE Certified Physician".

Also produce next_steps (short bulleted action list for the patient).`;

      const finalizeUser = `## Patient Name
${safeName}

## Patient Intake Data
${JSON.stringify(intake_answers ?? {}, null, 2)}

## CHOSEN Peptides (final prescription — ONLY discuss these)
${JSON.stringify(chosen_peptides, null, 2)}

## Chosen Supplements
${JSON.stringify(chosen_supplements ?? [], null, 2)}

## Final Lab Tests (${sanitizeString(lab_tier, 20) || "basic"} tier)
${JSON.stringify(final_lab_tests ?? [], null, 2)}
${lab_notes ? `\nLab notes: ${sanitizeString(lab_notes, 1000)}` : ""}

Generate the finalized clinical_summary, doctor_note, next_steps, and patient_guidelines based STRICTLY on the chosen peptides above.`;

      const finalizeResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: finalizeSystem },
            { role: "user", content: finalizeUser },
          ],
          tools: [{
            type: "function",
            function: {
              name: "finalize_plan",
              description: "Return the finalized clinical narrative based on the chosen peptides.",
              parameters: {
                type: "object",
                properties: {
                  clinical_summary: { type: "string" },
                  doctor_note: { type: "string" },
                  next_steps: { type: "string" },
                  patient_guidelines: { type: "string" },
                },
                required: ["clinical_summary", "doctor_note", "next_steps", "patient_guidelines"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "finalize_plan" } },
        }),
      });

      if (!finalizeResp.ok) {
        if (finalizeResp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (finalizeResp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await finalizeResp.text();
        console.error("AI gateway error (finalize):", finalizeResp.status, t);
        throw new Error("AI gateway error");
      }

      const fdata = await finalizeResp.json();
      const ftool = fdata.choices?.[0]?.message?.tool_calls?.[0];
      if (!ftool) throw new Error("No tool call in finalize response");
      const parsed = JSON.parse(ftool.function.arguments);
      // Defensive: scrub any HTML/markdown the model might sneak in.
      parsed.clinical_summary = sanitizeGuideOutput(parsed.clinical_summary || "");
      parsed.doctor_note = sanitizeGuideOutput(parsed.doctor_note || "");
      parsed.next_steps = sanitizeGuideOutput(parsed.next_steps || "");
      parsed.patient_guidelines = sanitizeGuideOutput(parsed.patient_guidelines || "");

      return new Response(JSON.stringify(parsed), {
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
