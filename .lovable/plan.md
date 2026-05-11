## Goal

Move the 4 medication reference quick-access buttons (Wegovy, Mounjaro, Foundayo, Rybelsus) from the page header into a dedicated card in the side panel of every Weight Loss Consultation, placed directly **below the Patient Summary card**.

## Changes (`src/pages/WeightLossConsultation.tsx` only)

1. **Remove** the 4 medication buttons from `AppHeader` (lines 328–340), keeping only the existing **Edit** button there.

2. **Add a new "Medication Reference" Card** in the side `<aside>`, inserted between the Patient Summary card (closes at line 609) and the Talking Points loop (line 612).

   Card contents:
   - Header: `Pill` icon + "Medication Reference" label, same uppercase muted-foreground styling as Patient Summary.
   - Body: 2-column grid of 4 buttons (Wegovy, Mounjaro, Foundayo, Rybelsus). Each is an outline button with an `Info` icon + name, and clicking it calls `setRefMed(name)` to open the existing `MedicationDetailSheet`.
   - The currently selected `medName` (if it matches one of the 4) gets a subtle `border-primary` highlight so the doctor immediately sees which medication is active.
   - Small helper line: "Tap any medication to view DarDoc protocol."

3. No other logic, state, dialog, or data changes. The existing `setRefMed` state, `REFERENCE_MEDS` set, and `<MedicationDetailSheet>` already mounted at the bottom of the page handle the rest.

## Out of scope

- No DB changes, no edits to `MedicationDetailSheet`, no changes to the Edit Medication dialog (it keeps its own info link).
- No changes to peptide consultations.
