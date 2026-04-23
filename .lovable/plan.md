
## Add Patient Summary Card Below Peptide List (Peptide Consultation)

### Goal
Mirror the Weight Loss layout by also showing the **Patient Summary** (age, gender, height, weight, BMI, activity) inline in the **main column**, right below the Recommended Peptides card — not only in the sticky right sidebar. This way the data stays visible on mobile/narrow screens and when the sidebar scrolls out of view.

### Changes
**File**: `src/pages/Consultation.tsx`

1. Extract the existing patient-summary calculation (currently inside the `<aside>` sidebar IIFE around lines 1735–1808) into a small reusable `PatientSummaryCard` component (or a local render function) so the same data renders in two places without duplication.

2. Render that card in the main column **immediately after the Recommended Peptides / wizard section** (after the peptide list block around line 1013 and again after the read-only confirmed list around line 1243). It will appear in both:
   - **Edit / wizard mode** — below the Recommended Peptides card
   - **Confirmed mode** — below the locked peptide list

3. Card content (matching Weight Loss style):
   - Age, Gender, Height (cm), Weight (kg) in a 2x2 grid of muted tiles
   - Color-coded BMI pill (blue/green/amber/red by category)
   - Activity level + body shape badges
   - Health goals chips (already in intake)

4. The existing right sidebar summary stays unchanged on desktop (`lg:` and up). The new inline card is visible on all breakpoints. On large screens the user sees both, which is consistent with how the WeightLoss page surfaces patient data prominently.

### No DB / backend changes
All values come from `consultation.intake_answers` already loaded.
