

## 1. Teal + Gold Color Highlights

Update `src/index.css` to add a gold/amber accent into the gradient and key highlight areas:

- Change `--accent` from green-teal (168) to warm gold (42-45 hue range, e.g. `42 78% 50%`) in both light and dark modes
- This affects the `gradient-primary` utility (teal-to-gold gradient), accent badges, and DNA helix strokes in the logo
- The primary color stays teal -- gold becomes the accent/highlight complement
- Update `gradient-primary` to blend teal primary into gold accent for a teal-with-gold-hint effect

**Light mode accent**: `42 78% 50%` (warm gold)
**Dark mode accent**: `42 70% 55%` (slightly lighter gold for dark backgrounds)

## 2. Admin Team Role -- Read-Only Access

The existing `app_role` enum already has `"admin"`. Currently admins have full access. The plan restricts admin users to read-only operations (Patient Files, Knowledge Base, export/download) and blocks them from starting consultations.

### Changes needed:

**`src/pages/Dashboard.tsx`**:
- Import `useAuth` roles
- Check if user has a clinician role (`doctor` or `nurse`)
- If not a clinician (i.e. admin-only), show the program cards as disabled with the message: "As a non-clinician, you do not have access to this function."
- Use a toast or inline alert when an admin clicks a program card

**`src/components/AppHeader.tsx`**:
- No changes needed -- Files, Knowledge Base, and Install links are already visible to all users
- User Management is already admin-only gated

**`src/pages/PatientIntake.tsx` and `src/pages/WeightLossIntake.tsx`**:
- Add a role check at the top of each page; if the user is not a clinician (`doctor` or `nurse`), redirect them back to `/dashboard` with a toast notification

**No database changes needed** -- the existing `app_role` enum and `user_roles` table already support this. The `handle_new_user` function currently assigns `doctor` role by default to all new signups. The admin will need to manually assign roles via User Management.

### User Management Enhancement

**`src/pages/UserManagement.tsx`**:
- Add a role selector (dropdown or toggle) next to each user so admins can assign users as `doctor`, `nurse`, or `admin`
- This lets the admin decide who is a clinician vs admin team member

### Files to modify:
- `src/index.css` -- gold accent colors
- `src/pages/Dashboard.tsx` -- block non-clinicians from programs
- `src/pages/PatientIntake.tsx` -- redirect non-clinicians
- `src/pages/WeightLossIntake.tsx` -- redirect non-clinicians
- `src/pages/UserManagement.tsx` -- add role assignment UI

### Technical Notes

- A helper function `isClinician(roles)` will check if `roles` includes `"doctor"` or `"nurse"`
- The `AuthContext` already exposes `roles` so no context changes needed
- RLS policies on `user_roles` already allow admins to manage roles, so the role assignment will work with existing permissions

