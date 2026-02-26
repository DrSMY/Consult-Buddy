

## Convert Patient Guide Output to Styled HTML Card Layout

### Overview
Replace the plain-text patient guide with a beautifully formatted HTML document composed of styled cards. This applies to both **weight loss** (GLP-1) and **peptide** consultation flows. The HTML guide can be previewed in-app, copied, or sent via WhatsApp.

### New Component: `PatientGuideHTML`
Create `src/components/PatientGuideHTML.tsx` — a React component that renders the patient guide as a structured, styled HTML card layout.

**Card sections (common across both flows):**
1. **Header Card** — Clinic logo/branding, patient greeting with name and salutation
2. **Patient Summary Card** — Name, age, gender, height, weight, BMI
3. **Prescribed Medications Card** — Medication name, dose, administration, storage instructions
4. **Nutrition & Diet Card** — Protein targets, macro breakdown, hydration, calorie targets
5. **Side Effects Card** — Common side effects with management tips
6. **Red Flag Symptoms Card** — When to seek urgent care
7. **Lab Tests Card** — Required/recommended blood tests with links
8. **Follow-up Plan Card** — Next appointment, monitoring schedule
9. **Footer Card** — Doctor signature, clinic contact

The component accepts structured data props (patient info, treatment info, selected meds, labs) rather than raw text, so cards render consistently.

### New Utility: `generateGuideHTML`
Create `src/utils/guideHtml.ts` — a function that takes patient/treatment data and returns a self-contained HTML string (inline CSS, no external dependencies). This HTML string is what gets:
- Displayed in a preview modal/sheet
- Copied to clipboard as HTML
- Sent via WhatsApp (as plain text fallback, since WhatsApp doesn't support HTML)

### Changes to Existing Files

**`src/pages/WeightLossIntake.tsx`** (Step 3 summary & guide generation):
- Replace the plain-text guide textarea/display with the `PatientGuideHTML` component rendered in an iframe or dangerouslySetInnerHTML preview
- Add "Preview Guide" button that opens a sheet/dialog with the formatted HTML
- Keep "Copy as Text" for WhatsApp, add "Copy as HTML" for email/EMR
- The AI-generated guide text is still stored, but the HTML rendering uses structured data

**`src/pages/WeightLossConsultation.tsx`** (Completed consultation review):
- Replace the plain-text guide display with the `PatientGuideHTML` preview
- Same copy/share options

**`src/pages/Consultation.tsx`** (Peptide Patient Guidelines tab):
- Replace plain-text `buildActionPlan.patientGuide` display with the `PatientGuideHTML` component
- Uses `selectedPeptides`, `selectedSupplements`, `finalLabTests` data directly

**`supabase/functions/consultation/index.ts`**:
- No changes needed — the AI still generates text. The HTML formatting happens client-side from structured data.

### Technical Details
- The HTML guide uses inline CSS for portability (works in email clients, can be saved as standalone file)
- Color scheme matches the PeptiDOC teal branding (`#0891b2`, `#0e7490`)
- Cards use border-radius, subtle shadows, and the clinic color palette
- WhatsApp sharing continues to use plain text (WhatsApp strips HTML); the "Copy HTML" option is for email/EMR use
- The component is purely presentational — no state, no side effects
- For peptide flow: cards are dynamically shown/hidden based on what data exists (e.g., no "Side Effects" card if none apply)

