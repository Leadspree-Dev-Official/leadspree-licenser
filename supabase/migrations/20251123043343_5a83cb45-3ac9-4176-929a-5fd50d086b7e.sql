-- Insert default admin user (password will be set during first login)
-- Note: You'll need to create this admin account via the signup form first, then update its role
-- This creates a function to help with that

CREATE OR REPLACE FUNCTION public.make_user_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET role = 'admin', status = 'active'
  WHERE email = user_email;
END;
$$;