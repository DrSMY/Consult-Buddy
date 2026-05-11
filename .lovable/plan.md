## Goal

Turn the uploaded "Weight Management & GLP-1 Therapy Protocol" into a clickable **Medication Reference** for the Weight Loss program — mirroring how peptides work today (clickable name → detail drawer with mechanism, dosing, side effects, etc.).

Scope is limited to the 4 medications you specified: **Wegovy, Mounjaro, Foundayo, Rybelsus**. (Ozempic and Oral Wegovy from the PDF will be skipped.)

## What I'll build

### 1. New database table `weight_loss_medications`

Mirrors `peptide_protocols` so the UI pattern is identical. Seeded from the PDF.

Columns (per medication):
- `name`, `category` (Injectable / Oral)
- `mechanism_of_action`
- `indications_uae`
- `administration` (route, frequency)
- `available_doses`
- `how_it_works_patient` (plain-English explanation)
- `how_to_use` (step-by-step)
- `missed_dose` instructions
- `storage_handling`
- `what_to_expect` (week-by-week timeline)
- `common_side_effects`
- `contraindications`
- `scientific_information` (clinician-facing)
- `key_advantages` (Foundayo)

RLS: read for authenticated users; write restricted to admin (same pattern as peptide_protocols).

The migration also seeds all 4 records using the exact text from your PDF (Sections 2.1, 2.2, 2.3, 2.5).

### 2. New component `MedicationDetailSheet`

Visual twin of `PeptideDetailSheet`:
- Slide-in drawer with colored sections (teal / amber / emerald / rose / violet / sky)
- "💡 Talking Points for Patients" card at top (mechanism in one line, timeline, top side effects)
- Prescribing Info grid (Doses · Route · Frequency · Storage)
- Dedicated Contraindications card (red, prominent)
- "What to Expect" timeline card
- Scientific Information collapsed at bottom for clinician deep-dive

### 3. Wire into Weight Loss Consultation

In `src/pages/WeightLossConsultation.tsx`:
- The medication name shown in the **Recommended Plan summary** becomes clickable (with a small ℹ️ icon) → opens `MedicationDetailSheet`
- Inside the **Edit Medication dialog**, each option in the Select gets an info icon next to it that opens the sheet without changing selection — so the doctor can compare before picking

### 4. (Optional) Knowledge Base entry

Add a "Weight Loss Medications" section in `KnowledgeBase.tsx` listing the 4 meds as cards, each opening the same sheet. Tell me if you want this included now or later.

## Out of scope (will not change)

- Peptide protocols, AI engine, dose-calc logic, intake flow
- No change to clinical suggestion text generation
- Ozempic / Oral Wegovy not added (per your instruction)

## Open question

The PDF also contains rich content beyond medication profiles (titration tables, monitoring, nutrition, meal plans). Should I:
- **(a)** Only build the medication reference now (this plan), or
- **(b)** Also seed selected protocol sections (titration schedules, contraindications matrix, monitoring checklist) into the Knowledge Base?

I'll proceed with **(a)** unless you say otherwise.