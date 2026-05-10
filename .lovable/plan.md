## Goal
Persist every patient that enters intake (peptides or weight-loss) the moment **name + mobile number** are captured, so any abandoned/missed-appointment session can be resumed later. Surface these as **Incomplete** on the dashboard.

## Behavior

**Trigger to register**
- As soon as `patient_name` AND `mobile_number` are both filled in either intake (peptides or weight-loss), create a consultation row with `status = "incomplete"`.
- Auto-save (debounced ~1.5s) on subsequent edits — patches the same row's `intake_answers` and `patient_name`.
- On final submit, the same row is updated to `status = "review"` (peptides) or `"completed"` (weight-loss). No duplicate row is created.

**Resume**
- New "Resume Incomplete" entry on each program's intake selection screen (next to New / Follow-up).
- Lists incomplete patients for that program filtered by name/mobile, newest first.
- Selecting one rehydrates all answers and continues from the last step. Saving continues to update the same row.

**Dashboard**
- New stat card: **Incomplete** (count of `status = "incomplete"` consultations).
- New section **"Incomplete Intakes"** listing each incomplete patient (name, mobile, program, last updated) with a **Resume** button that deep-links back into the right intake (`/intake/peptides?resume=<id>` / `/intake/weight-loss?resume=<id>`).
- Existing "Today / Total / Completed" stats exclude incomplete rows so numbers stay clean.

## Technical notes

- No DB schema change required — `status` is already a free-text column. Just introduce the literal `"incomplete"`.
- Add a small helper `useAutosaveConsultation(consultationId, payload)` (or inline effect) in both intake pages:
  - If no id yet AND name+mobile present → `insert` with `status:"incomplete"` and store returned id in state + URL (`?draft=<id>`) so a refresh keeps the same row.
  - If id present → `update` `intake_answers`, `patient_name` (debounced).
- Final `handleSubmit` becomes an `update` (not insert) when a draft id exists.
- When loading with `?resume=<id>` or `?draft=<id>`, fetch the row, set state, and skip flow-type selection (jump to the form). For peptides, also restore `currentStep` if we persist it inside `intake_answers.__draftStep`.
- Dashboard:
  - Add `incomplete` count to `DashboardStats`.
  - New `IncompleteIntakesList` component fetching `consultations` where `status = "incomplete"` ordered by `updated_at desc`, with Resume link and a small "delete draft" action.
- Mobile number lives in different shapes: peptides → `intake_answers.mobile_number`; weight-loss → `intake_answers.patient.mobileNumber`. Helper `getMobile(consultation)` normalizes for the dashboard list.

## Files to touch

- `src/pages/PatientIntake.tsx` — autosave + resume support, switch submit to update.
- `src/pages/WeightLossIntake.tsx` — same.
- `src/pages/Dashboard.tsx` — render Incomplete section + resume links.
- `src/components/DashboardStats.tsx` — add Incomplete tile, exclude from completed counts.
- `src/components/IncompleteIntakesList.tsx` — new component.
- (Optional) tiny helper `src/utils/consultationDraft.ts` for autosave + mobile/name extraction.

## Out of scope
- No changes to AI generation, exports, or consultation page itself (it already handles partial data).
- No new RLS / migration; existing policies cover insert/update/select for the owner.