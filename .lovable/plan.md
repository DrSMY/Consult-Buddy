

# Enhance Weight Loss / GLP-1 with Original DocSlim Logic

## What Improves

The uploaded `gemini.ts` reveals several details the current implementation is missing. This plan upgrades the AI guide generation and adds the follow-up flow.

## 1. Richer AI Patient Guide Prompt (Edge Function)

The current `generate-glp1-guide` prompt is generic. The original `gemini.ts` has:

- **Oral vs Injectable differentiation**: Rybelsus gets distinct "HOW TO TAKE" and "STORAGE" sections (swallow whole, empty stomach, 30-min wait) vs injection instructions for others.
- **Medication-specific video links**: Mounjaro and Wegovy each have YouTube tutorial links embedded in the guide.
- **Structured sections**: Introduction, Patient Summary, Storage, Administration, Nutrition (with 40-50% protein / 40-50% fiber / less than 20% carb macro split), Side Effects, Red Flags, Follow-up Plan.
- **Lifestyle-only path**: When medication is "Other", the guide shifts to a pure lifestyle/nutrition plan without injection content.
- **Doctor signature**: Each guide ends with a specific sign-off.

**File**: `supabase/functions/consultation/index.ts` -- rewrite the `generate-glp1-guide` section to match the original prompt structure.

## 2. Follow-up Flow (from `FollowupForm.tsx`)

The `types.ts` reveals a `FollowupData` interface with:
- Previous dose and next dose
- Side effects tracking
- Weight lost since last visit
- Follow-up notes

Currently, clicking "Patient Follow-up" on the selection screen just goes to the same new-patient form. This plan adds a proper follow-up form with:
- Search/select existing weight-loss patient from database
- Quick dose adjustment (previous dose shown, select next dose)
- Side effects and weight change tracking
- Saves as a linked follow-up consultation

**File**: `src/pages/WeightLossIntake.tsx` -- add a follow-up step after selecting "Patient Follow-up".

## 3. CSV Export Capability (from `csv.ts`)

The original app can export patient treatment data as CSV. This will be added as a utility and wired to the Patient Files page for weight-loss consultations.

**File**: Create `src/utils/csvExport.ts` with adapted export logic.

## Technical Details

### Edge Function Changes (`supabase/functions/consultation/index.ts`)

Replace the `generate-glp1-guide` prompt with two paths:

```text
IF medication is Mounjaro/Wegovy/Ozempic/Rybelsus (GLP-1):
  - Detect oral (Rybelsus) vs injectable
  - Include medication-specific storage instructions
  - Include oral vs injection administration guide
  - Embed video links (Mounjaro, Wegovy)
  - Structured: Intro > Summary > Storage > Admin > Nutrition > Side Effects > Red Flags > Follow-up
  - Macro split: Protein 40-50%, Fiber 40-50%, Carbs <20%
  
ELSE (Other/Lifestyle):
  - Lifestyle-only guide: nutrition plan, activity plan, mindset, hydration
  - No injection/storage sections
```

### WeightLossIntake Follow-up Flow

When user selects "Patient Follow-up":
1. Fetch previous weight-loss consultations for this doctor
2. Show searchable patient list
3. On select, pre-fill identity from previous consultation
4. Show follow-up form: previous dose, next dose selector, side effects, weight change
5. Save as new consultation with `followupData` in `intake_answers`

### File Summary

| Action | File |
|--------|------|
| Edit | `supabase/functions/consultation/index.ts` (richer GLP-1 guide prompts) |
| Edit | `src/pages/WeightLossIntake.tsx` (follow-up flow) |
| Create | `src/utils/csvExport.ts` (CSV export for weight-loss data) |
| Edit | `src/data/glp1Config.ts` (add FollowupData interface) |

