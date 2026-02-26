
-- Table to store shareable patient guides
CREATE TABLE public.patient_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  patient_name TEXT NOT NULL,
  program TEXT NOT NULL DEFAULT 'general',
  guide_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_guides ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone with the link can view, if not expired)
CREATE POLICY "Anyone can view non-expired guides"
  ON public.patient_guides
  FOR SELECT
  USING (expires_at > now());

-- Authenticated users can create guides
CREATE POLICY "Authenticated users can create guides"
  ON public.patient_guides
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owners can delete their guides
CREATE POLICY "Owners can delete their guides"
  ON public.patient_guides
  FOR DELETE
  USING (auth.uid() = user_id);
