

## 1. Add Doctor Notes Card Below Allergy History (Step 1 - Clinical)

Add a new "Doctor Notes" card in Step 1 (clinical step), positioned right after the Allergy History section (after line 749) and before the GLP-1 History section. This will use a new `doctorNotes` state variable and save to the `doctor_notes` column on submit.

- Add `doctorNotes` state: `useState("")`
- Add a card with a stethoscope icon, a Textarea labeled "Doctor Notes", placeholder "Add any clinical notes for this encounter..."
- When loading follow-up data, pre-fill `doctorNotes` if the previous consultation had `doctor_notes`
- Update `handleSubmit` to include `doctor_notes: doctorNotes` in the insert call

## 2. Change Blood Test Toggle to Required vs Recommended

Replace the single `bloodTestRequired` boolean toggle in Step 2 with a 3-option selector:

- **None** (default) -- no blood test
- **Recommended** -- blood test is recommended but not mandatory
- **Required** -- blood test is required/mandatory

This changes `bloodTestRequired` from a boolean to a string field (`"none" | "recommended" | "required"`).

### Changes needed:

**`src/data/glp1Config.ts`:**
- Update `TreatmentPlan` interface: change `bloodTestRequired: boolean` to `bloodTestLevel: "none" | "recommended" | "required"`
- Update `createEmptyTreatment`: set `bloodTestLevel: "none"`
- Update `generateClinicalSuggestion`: use appropriate wording based on level ("Blood test required" vs "Blood test recommended")

**`src/pages/WeightLossIntake.tsx`:**
- Replace the single toggle button with 3 selectable options (None / Recommended / Required) styled similarly to the medication selector
- Update all references from `bloodTestRequired` to `bloodTestLevel`

**`supabase/functions/consultation/index.ts`:**
- Update the guide generation prompt: use "REQUIRED" vs "RECOMMENDED" wording for the blood test section based on the `bloodTestLevel` value
- Adjust conditional logic from `treatment_data.bloodTestRequired` to check `treatment_data.bloodTestLevel`

**`src/pages/WeightLossConsultation.tsx`:**
- Update any display of blood test status to show the correct level
- Display saved `doctor_notes` from the consultation record

### Technical Details

Files to modify:
- `src/data/glp1Config.ts` -- type + factory + suggestion generator
- `src/pages/WeightLossIntake.tsx` -- doctor notes card, blood test selector, handleSubmit
- `supabase/functions/consultation/index.ts` -- guide generation prompt wording
- `src/pages/WeightLossConsultation.tsx` -- display doctor notes and blood test level

