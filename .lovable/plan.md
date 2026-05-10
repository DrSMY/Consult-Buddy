## Goal
Treat patients as cross-program. A person who has done Peptides can later start Weight Loss (and vice versa) without being re-created. Identity = normalized mobile number, with a name-match confirmation step when names differ.

No database schema change. We derive each "patient" by grouping existing `consultations` rows on normalized mobile, so all current data benefits immediately.

## Where it shows up
1. **Encounter selector** (the screen with "New Patient" / "Follow-up" cards on each program — `PatientIntake.tsx` and `WeightLossIntake.tsx`) gets a third card: **Existing Patient**.
2. **Existing Patient picker** — searchable list of every distinct patient across both programs (name, mobile, last visit, program badges showing which programs they've used).
3. **Identity confirmation** — if the picked patient's stored name doesn't fuzzy-match what the clinician types, show a small confirm dialog: "Same person as Jane Doe (last seen Weight Loss, 12 Apr)?" with Yes / No.
4. **Auto-detect banner in New Patient flow** — as the clinician types name + mobile, if a normalized-mobile match exists in any program, show a teal banner: "This number belongs to {Name} ({programs}). Use existing patient?" One click switches to the prefilled flow.
5. **Prefill on start** — demographics + medical history are copied from the patient's most recent consultation (any program):
   - name, age/DOB, gender, height, weight, mobile, booking ref
   - allergies, chronic illnesses, current medications, family history, lifestyle answers
   - Treatment plan, AI recommendations, doctor notes, and program-specific clinical fields are **not** prefilled — the new encounter starts fresh.
6. **Cross-program history strip** — at the top of the new consultation, show prior visits across programs as compact chips (date · program · status) linking to those past consultations, so the clinician sees the full timeline.

## Identity rules
- **Key**: normalized mobile = digits only, last 10 (handles +971 / 0 prefixes).
- **Name match**: case-insensitive, whitespace-collapsed; if Levenshtein-similar (≥ 0.8) treat as same; otherwise prompt confirm.
- **Cross-program**: a patient is the union of all consultations sharing the normalized mobile, regardless of `program`.
- Incomplete drafts count as the same patient (so a half-finished Peptides intake won't duplicate when they later book Weight Loss).

## Behaviour by entry path

| Entry | What happens |
|---|---|
| New Patient (mobile not seen before) | Unchanged. |
| New Patient (mobile already exists) | Banner offers to switch to Existing Patient flow with prefill. |
| Existing Patient card | Picker → confirm identity → new consultation row created in the chosen program, prefilled with demographics/history. |
| Follow-up | Unchanged — still scoped to the same program (a Weight Loss follow-up shouldn't pull from a Peptides visit). |

## Files to touch
- `src/utils/patientIdentity.ts` *(new)* — `normalizeMobile`, `nameSimilarity`, `groupConsultationsByPatient`, `findPatientByMobile`, `buildPrefillFromHistory`.
- `src/components/ExistingPatientPicker.tsx` *(new)* — searchable list with program badges and last-visit info.
- `src/components/CrossProgramHistoryStrip.tsx` *(new)* — chip row of prior visits, used inside `Consultation.tsx` and `WeightLossConsultation.tsx`.
- `src/pages/PatientIntake.tsx` — add Existing Patient card; add auto-detect banner on name+mobile entry; honor prefill payload.
- `src/pages/WeightLossIntake.tsx` — same three additions, mapped to the weight-loss intake shape (`patient.mobileNumber`, `patient.name`, etc.).
- `src/pages/Consultation.tsx` & `src/pages/WeightLossConsultation.tsx` — render `CrossProgramHistoryStrip` near the header.
- `src/pages/PatientFiles.tsx` — optional grouping toggle: "Group by patient" so the same person across programs collapses to one row with expandable visits.

## Out of scope
- No new tables, no migration, no FK changes.
- No edits to AI engine, exports, or follow-up logic beyond prefill.
- Merging two existing patients with different mobiles is not handled (rare; can be added later).

## Risks
- A clinician could type the wrong mobile in the first program, creating a duplicate that won't auto-merge later. Mitigation: the auto-detect banner reduces this; manual merge can be a future step.
- Prefilled medical history can become stale. Mitigation: every prefilled clinical field stays editable; the cross-program history chip set always shows source dates.
