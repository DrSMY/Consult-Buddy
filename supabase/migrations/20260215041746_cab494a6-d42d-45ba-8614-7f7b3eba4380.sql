
-- Add approved column to profiles (default false for new signups)
ALTER TABLE public.profiles ADD COLUMN approved boolean NOT NULL DEFAULT false;

-- Auto-approve the admin email (dr.sami@dardoc.com)
UPDATE public.profiles 
SET approved = true 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dr.sami@dardoc.com');

-- Update the handle_new_user trigger to auto-approve the admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, approved)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN NEW.email = 'dr.sami@dardoc.com' THEN true ELSE false END
  );
  
  -- Default role: doctor
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'doctor');
  
  RETURN NEW;
END;
$$;

-- Allow admins to read all profiles (for user management)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update all profiles (for approval)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
