-- Allow authenticated users to insert clinical documents
CREATE POLICY "Authenticated users can insert clinical documents"
ON public.clinical_documents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update clinical documents
CREATE POLICY "Authenticated users can update clinical documents"
ON public.clinical_documents
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete clinical documents
CREATE POLICY "Authenticated users can delete clinical documents"
ON public.clinical_documents
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to delete peptide protocols
CREATE POLICY "Authenticated users can delete protocols"
ON public.peptide_protocols
FOR DELETE
TO authenticated
USING (true);