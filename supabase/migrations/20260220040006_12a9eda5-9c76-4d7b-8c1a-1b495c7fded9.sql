
-- Drop existing restrictive policy on consultations
DROP POLICY IF EXISTS "Users can manage own consultations" ON public.consultations;

-- All authenticated users can read all consultations
CREATE POLICY "All authenticated can read consultations"
ON public.consultations FOR SELECT TO authenticated
USING (true);

-- Only owner can insert
CREATE POLICY "Users can insert own consultations"
ON public.consultations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only owner can update
CREATE POLICY "Users can update own consultations"
ON public.consultations FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Only owner can delete
CREATE POLICY "Users can delete own consultations"
ON public.consultations FOR DELETE TO authenticated
USING (auth.uid() = user_id);
