## Root cause
Postgres rejects every draft save with:
`new row for relation "consultations" violates check constraint "consultations_status_check"`

The `consultations.status` column has a CHECK constraint that only allows the original values (e.g. `intake`, `review`, `completed`). The Save Draft / autosave flow tries to insert `status = 'incomplete'`, which is not in the allowed list, so the insert fails and the UI shows "Save failed".

## Fix
Run a migration that drops the existing check constraint and re-adds it including `'incomplete'`:

```sql
ALTER TABLE public.consultations DROP CONSTRAINT IF EXISTS consultations_status_check;
ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_status_check
  CHECK (status IN ('intake','review','completed','incomplete'));
```

That single change makes both the explicit Save Draft button and the existing debounced autosave succeed, and lets the Patient Files "Incomplete" filter actually populate.

## Out of scope
- No code changes — the client logic is already correct.
- No RLS changes — the existing `auth.uid() = user_id` policy continues to apply.
