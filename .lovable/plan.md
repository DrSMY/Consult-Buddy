## Enable Editing Consultations (Medications & Details)

### Problem
- **Weight Loss consultations**: Completely read-only after completion — no way to edit medication, dose, or treatment details
- **Peptide consultations**: The "Edit" button already unlocks peptide selection, but you can only toggle from the original AI-recommended list — no way to **add new peptides** that weren't recommended

### Changes

#### 1. Weight Loss Consultation — Add Edit Medication Dialog (`WeightLossConsultation.tsx`)
- Add an **"Edit" button** in the header (like peptide consultations have)
- When clicked, open a dialog with editable fields:
  - Medication (Mounjaro/Wegovy/Ozempic/Rybelsus/Other)
  - Dose (dynamic based on medication)
  - Blood test level (none/recommended/required)
  - Doctor notes (textarea)
  - Treatment notes
- On save: update `intake_answers.treatment` and `ai_recommendations` in the database, regenerate the clinical suggestion text
- The clinical record and side panel will reflect the updated medication

#### 2. Peptide Consultation — Add "Add Medication" capability (`Consultation.tsx`)
- When in edit mode (unlocked), show an **"Add Medication"** button below the peptide list
- Opens a dialog/form where the doctor can manually add a peptide:
  - Name (text input or search from protocols DB)
  - Dosage, Duration, Administration route (text inputs)
  - Priority (Primary/Supportive)
- The manually added peptide joins the `recommended_peptides` array and can be selected like AI-recommended ones
- On confirm, it gets saved alongside the other selections

### No database changes needed
All data is stored in the existing `ai_recommendations` and `intake_answers` JSONB columns.
