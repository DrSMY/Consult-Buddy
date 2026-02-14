
-- Peptide protocols table
CREATE TABLE public.peptide_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  strength_volume TEXT,
  dosage_instructions TEXT,
  administration_route TEXT,
  prescription_details TEXT,
  treatment_duration TEXT,
  target_benefits TEXT,
  best_use_for TEXT,
  how_it_works TEXT,
  possible_combinations TEXT,
  recommended_supplements TEXT,
  key_blood_tests TEXT,
  common_side_effects TEXT,
  contraindications TEXT DEFAULT '',
  categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.peptide_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read protocols"
  ON public.peptide_protocols FOR SELECT
  TO authenticated USING (true);

-- Program matrix (which peptide maps to which goal)
CREATE TABLE public.peptide_program_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_protocol_id UUID REFERENCES public.peptide_protocols(id) ON DELETE CASCADE NOT NULL,
  health_goal TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Primary', 'Secondary'))
);

ALTER TABLE public.peptide_program_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read matrix"
  ON public.peptide_program_matrix FOR SELECT
  TO authenticated USING (true);

-- Consultations table
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_name TEXT NOT NULL DEFAULT '',
  program TEXT NOT NULL DEFAULT 'peptides',
  status TEXT NOT NULL DEFAULT 'intake' CHECK (status IN ('intake', 'review', 'completed')),
  intake_answers JSONB NOT NULL DEFAULT '{}',
  ai_recommendations JSONB DEFAULT NULL,
  doctor_notes TEXT DEFAULT '',
  next_steps TEXT DEFAULT '',
  patient_guidelines TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own consultations"
  ON public.consultations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
