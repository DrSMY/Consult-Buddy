
-- 1) Consultations: drop overly-permissive read, add owner-scoped read
DROP POLICY IF EXISTS "All authenticated can read consultations" ON public.consultations;
CREATE POLICY "Users can read own consultations"
  ON public.consultations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2) Appointments: restrict update/delete to admin or assigned clinician
DROP POLICY IF EXISTS "Authenticated can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated can delete appointments" ON public.appointments;

CREATE POLICY "Admins or assignees can update appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR assigned_to = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR assigned_to = auth.uid());

CREATE POLICY "Admins can delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) Profiles: prevent self-escalation of approved/rejected via a trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.approved IS DISTINCT FROM OLD.approved THEN
      NEW.approved := OLD.approved;
    END IF;
    IF NEW.rejected IS DISTINCT FROM OLD.rejected THEN
      NEW.rejected := OLD.rejected;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_self_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_self_escalation();

-- 4) Storage: dedupe INSERT policies and add owner-based UPDATE check
DROP POLICY IF EXISTS "Authenticated users can upload patient guide files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update patient guide files" ON storage.objects;

CREATE POLICY "Owners or admins can update patient guide files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'patient-guides'
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    bucket_id = 'patient-guides'
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );
