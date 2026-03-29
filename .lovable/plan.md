

## Add Smart Fill to Peptide Patient Intake

### What changes

**Single file: `src/pages/PatientIntake.tsx`**

1. **Add state variables**: `smartInput` (string) and `isParsing` (boolean)
2. **Add imports**: `Wand2`, `RefreshCw` from lucide-react
3. **Add `handleSmartFill` function** that calls the existing `smart-fill` edge function action and maps extracted fields:
   - `name` → `patientName`
   - `age` → `answers.age`
   - `gender` → `answers.gender`
   - `height` → `answers.height`
   - `weight` → `answers.weight`
   - `chronicIllnesses` → parsed into `answers.health_conditions` multiselect
   - `allergies` → parsed into `answers.allergies` multiselect
4. **Add Smart Fill card UI** at the top of step 0 (before the "Patient Information" card), identical styling to the weight loss version — an input field with a "Fill" button and helper text

### No backend changes needed
The existing `consultation` edge function already handles the `smart-fill` action with all the required field extraction.

