## Goal
Make incomplete drafts first-class records in **Patient Files** (they already appear on the Dashboard via the Incomplete Intakes list). Today, drafts are loaded into Patient Files but have no filter chip, no clear visual marker, and clicking one routes to a read-only consultation view instead of resuming the intake.

## Changes — `src/pages/PatientFiles.tsx`
1. **Add an "Incomplete" option to the status filter dropdown** with a live count, between "Intake" and "Completed".
2. **Style the row badge** so `incomplete` shows in amber (matching the Dashboard's Incomplete Intakes card) instead of the generic outline badge — clinicians instantly see drafts.
3. **Click-to-resume** — when the row's status is `incomplete`, navigate to the relevant intake with `?draft=<id>` so the clinician picks up where they left off:
   - `weight-loss` → `/program/weight-loss?draft=<id>`
   - `peptides` (and any other) → `/program/peptides?draft=<id>`
4. **Edit dialog** — add `Incomplete` as a selectable status in the edit form so an admin can flip a record back/forth if needed.
5. **Search behaviour** is unchanged: incomplete drafts are already searchable by name, mobile, and booking ref because they share the same `intake_answers` shape.

## Out of scope
- No database changes. `status = "incomplete"` already exists and is written by the Save Draft flow.
- No changes to the Dashboard's Incomplete Intakes card — it already shows the same rows.
- No changes to exports (Excel exports stay scoped to completed encounters).
- Patient unification (cross-program grouping) stays as today.

## Files touched
- `src/pages/PatientFiles.tsx` — filter option, badge color, resume routing, edit-dialog status option.
