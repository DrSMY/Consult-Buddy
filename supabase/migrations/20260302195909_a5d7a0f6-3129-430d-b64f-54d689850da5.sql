
CREATE POLICY "Admins can view all consultations"
ON public.consultations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
