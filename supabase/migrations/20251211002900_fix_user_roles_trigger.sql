-- Update handle_new_user function to also create user_roles entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'reseller',
    'pending'
  );
  
  -- Create user_roles entry
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'reseller')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new;
END;
$$;
