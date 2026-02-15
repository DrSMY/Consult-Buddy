
-- Allow authenticated users to update peptide protocols
CREATE POLICY "Authenticated users can update protocols"
ON public.peptide_protocols
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert new protocols
CREATE POLICY "Authenticated users can insert protocols"
ON public.peptide_protocols
FOR INSERT
TO authenticated
WITH CHECK (true);
