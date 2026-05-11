
-- 1) patient_guides: remove public read, restrict to owners + admins
DROP POLICY IF EXISTS "Anyone can view non-expired guides" ON public.patient_guides;

CREATE POLICY "Owners can view their guides"
  ON public.patient_guides FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all guides"
  ON public.patient_guides FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) peptide_protocols: restrict writes to admins
DROP POLICY IF EXISTS "Authenticated users can insert protocols" ON public.peptide_protocols;
DROP POLICY IF EXISTS "Authenticated users can update protocols" ON public.peptide_protocols;
DROP POLICY IF EXISTS "Authenticated users can delete protocols" ON public.peptide_protocols;

CREATE POLICY "Admins can insert protocols"
  ON public.peptide_protocols FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update protocols"
  ON public.peptide_protocols FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete protocols"
  ON public.peptide_protocols FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) clinical_documents: restrict writes to admins (read remains for authenticated)
DROP POLICY IF EXISTS "Authenticated users can insert clinical documents" ON public.clinical_documents;
DROP POLICY IF EXISTS "Authenticated users can update clinical documents" ON public.clinical_documents;
DROP POLICY IF EXISTS "Authenticated users can delete clinical documents" ON public.clinical_documents;

CREATE POLICY "Admins can insert clinical documents"
  ON public.clinical_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update clinical documents"
  ON public.clinical_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete clinical documents"
  ON public.clinical_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) Storage: patient-guides bucket — add scoped INSERT/UPDATE/DELETE policies
CREATE POLICY "Authenticated users can upload patient guide files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-guides');

CREATE POLICY "Authenticated users can update patient guide files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'patient-guides')
  WITH CHECK (bucket_id = 'patient-guides');

CREATE POLICY "Admins can delete patient guide files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'patient-guides' AND public.has_role(auth.uid(), 'admin'));

-- 5) Lock down SECURITY DEFINER functions: revoke from anon/public, keep
--    EXECUTE only where needed.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
