
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('patient-guides', 'patient-guides', true, 5242880, ARRAY['text/html'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload patient guides"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'patient-guides');

CREATE POLICY "Anyone can read patient guides"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'patient-guides');
