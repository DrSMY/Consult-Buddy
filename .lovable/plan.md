# Weight-Loss Guide — Branded HTML Redesign

## Goal

Replace the current single-column weight-loss guide HTML with a magazine-style branded layout that matches the reference you shared (Tailwind CDN + Inter, gradient teal header, hero greeting card, two-column section grid, food-photo nutrition section, color-coded side-effects/red-flags, signature card, "Save Personal Guide" button, footer).

The peptide guide will keep its current rendering — only the **weight-loss** path changes.

## What changes

### 1. New utility: `src/utils/weightLossGuideHtml.ts`

A dedicated HTML builder for `program === "weight_loss"`. It will:

- Use Tailwind CDN + Google Fonts (Inter) — same approach as your reference, so the output renders identically in any browser and "Print → Save as PDF" works cleanly.
- Embed brand assets via the same Supabase public URLs already uploaded by `shareGuide.ts` (logo + signature passed in as params).
- Map the parsed `::: SECTION :::` blocks from the AI-generated guide into the reference layout's named sections:
  - `INTRODUCTION` → left column intro card with bullet list
  - `PATIENT SUMMARY` → right teal stat card (Weight / Height / BMI / Caloric target)
  - `STORAGE INSTRUCTIONS` → emoji icon list card (left, row 2)
  - `HOW TO INJECT` / `HOW TO TAKE YOUR MEDICATION` → numbered step grid (right, row 2)
  - `NUTRITION & DIET PLAN` → full-width card with food background image + macro pills + 3 macro rows
  - `COMMON SIDE EFFECTS` → amber bordered card (left)
  - `RED-FLAG SYMPTOMS` → red bordered card with ⚠ icons (right)
  - `FOLLOW-UP PLAN` → teal CTA card with milestone badge
  - Signature block (signature image + name + DarDoc Healthcare Services + SCOPE Certified Physician)
  - Footer "DarDoc Weight Loss Program • <year>"
- Sections that don't match a known title fall back to a clean default card so any extra AI sections still render.
- Patient Summary auto-pulls from the consultation row (weight kg, height cm, BMI + class, daily calorie target) so it always shows even if the AI didn't include those numbers in the guide text.
- "Save Personal Guide" button uses `window.print()` (hidden via `@media print { .no-print { display: none; } }` exactly like your reference).

### 2. Wire it in `src/utils/printGuide.ts`

`buildGuideHtml(text, name, program)` becomes a thin router:

```ts
if (program === "weight_loss") return buildWeightLossGuideHtml(...);
return buildPeptideGuideHtml(...);   // = current implementation, renamed
```

No changes to the peptide path.

### 3. Pass patient summary data through

`shareGuide.ts → generateAndShareGuide(...)` gets one extra optional arg: `patientSummary?: { weightKg, heightCm, bmi, bmiClass, calorieTarget }`. `WeightLossConsultation.tsx` already has these values computed for the sticky sidebar — we pass them in when calling `generateAndShareGuide`. If absent, the summary card is omitted gracefully.

### 4. PDF stays in sync

`pdfGuide.ts` already renders from the same HTML string, so the downloadable PDF automatically picks up the new design. No separate work needed.

### 5. Landing page unchanged

The WhatsApp landing page (`landingPage.ts`) keeps its current glassmorphism design — it already matches your brand and offers View Online + Download PDF.

## Layout sketch

```text
┌────────────────────────────────────────────────────┐
│  TEAL GRADIENT HEADER  [logo]  Clinical Weight Mgmt│
│  Hi <Name>, your personalized roadmap…             │
└────────────────────────────────────────────────────┘
┌──────────────── Introduction ───┬─ Patient Summary┐
│  Wegovy 0.25 mg, GLP-1…         │  Weight 103 kg  │
│  • Targets appetite             │  Height 175 cm  │
│  • Slows gastric emptying       │  BMI   33.6     │
│  • …                            │  Cal   2125 kcal│
└─────────────────────────────────┴─────────────────┘
┌──── Storage Instructions ───────┬── How to Inject ┐
│ ❄ 2–8 °C   🏠 ≤30 °C …          │  1 Prepare 2 …  │
└─────────────────────────────────┴─────────────────┘
┌─────── NUTRITION & DIET (food photo bg) ──────────┐
│  Protein 124–155 g · Water 2–3 L · Carbs <20%     │
│  • Protein 40–50%  • Fiber 40–50%  • Low-GI carbs │
└────────────────────────────────────────────────────┘
┌── Side Effects (amber) ─────────┬─ Red Flags (red)┐
└─────────────────────────────────┴─────────────────┘
┌── Follow-Up Plan ───────────────┬── Milestone Wk 4┐
└─────────────────────────────────┴─────────────────┘
┌── Signature: [img] Dr Sami M. Yesuf · DarDoc … ───┐
└────────────────────────────────────────────────────┘
        Footer · DarDoc Weight Loss Program · 2026
```

## Files

- **New**: `src/utils/weightLossGuideHtml.ts`
- **Edited**: `src/utils/printGuide.ts` (router + extracted peptide builder)
- **Edited**: `src/utils/shareGuide.ts` (forward optional patient-summary)
- **Edited**: `src/pages/WeightLossConsultation.tsx` (pass patient summary into the share dialog → shareGuide)
- **Edited**: `src/components/ShareGuideDialog.tsx` (accept and forward optional summary prop)

## Out of scope

- Peptide guide visual design (unchanged).
- Landing page redesign (already matches brand).
- Removing PDF generation — kept so patients still get an offline file.

Approve to implement.