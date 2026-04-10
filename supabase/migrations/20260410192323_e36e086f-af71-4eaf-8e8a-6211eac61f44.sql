
CREATE TABLE public.clinical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  peptide_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clinical documents"
  ON public.clinical_documents FOR SELECT TO authenticated
  USING (true);
