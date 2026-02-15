
ALTER TABLE public.profiles ADD COLUMN phone text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN rejected boolean NOT NULL DEFAULT false;
