

## Fix Email Branding and Custom Confirmation Email

### Problem
1. The admin notification email shows **"DarDoc Platform"** as the sender -- should be **"DOCassist"**.
2. The confirmation email sent to new users uses the default system template instead of the custom DOCassist-branded one.

### Solution

#### 1. Fix admin notification sender name
Update `supabase/functions/notify-admin-signup/index.ts`:
- Change `from: 'DarDoc Platform <onboarding@resend.dev>'` to `from: 'DOCassist <onboarding@resend.dev>'`

#### 2. Send custom confirmation email via Resend
Create a new Edge Function `supabase/functions/send-confirmation-email/index.ts` that:
- Receives the user's name and email after signup
- Sends the branded DOCassist confirmation email using Resend (reusing the existing `RESEND_API_KEY`)
- Uses the same beautiful HTML template already in `supabase/templates/confirmation.html` (purple gradient header, confirm button, admin approval message)

#### 3. Update signup flow
Modify `src/pages/Auth.tsx` to:
- After successful signup, call `send-confirmation-email` Edge Function with the user's name and email
- This sends the branded DOCassist email alongside (or instead of) the default system email

### Technical Details

- Resend free tier: 100 emails/day -- more than sufficient
- The confirmation link in the custom email will still use the standard auth confirmation URL from the system email (users click either one)
- Both Edge Functions share the same `RESEND_API_KEY` secret (already configured)
- The custom email content matches the template: DOCassist branding, "Welcome aboard!" message, admin approval notice

