-- Create enums for user roles and account status
CREATE TYPE user_role AS ENUM ('admin', 'reseller');
CREATE TYPE account_status AS ENUM ('pending', 'active', 'paused', 'terminated');

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  role user_role DEFAULT 'reseller' NOT NULL,
  status account_status DEFAULT 'pending' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create software table
CREATE TABLE public.software (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text NOT NULL,
  version text NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create reseller allocations table
CREATE TABLE public.reseller_allocations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  software_id uuid REFERENCES public.software(id) ON DELETE CASCADE NOT NULL,
  license_limit integer DEFAULT 0 NOT NULL,
  licenses_used integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(reseller_id, software_id)
);

-- Create licenses table
CREATE TABLE public.licenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key text NOT NULL UNIQUE,
  software_id uuid REFERENCES public.software(id) ON DELETE CASCADE NOT NULL,
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text NOT NULL,
  buyer_city text,
  buyer_country text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create API keys table
CREATE TABLE public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key_string text NOT NULL UNIQUE,
  label text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at timestamp with time zone
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.software ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
      AND role = 'admin'
      AND status = 'active'
  );
$$;

-- Create function to check if user is active reseller
CREATE OR REPLACE FUNCTION public.is_active_reseller(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
      AND role = 'reseller'
      AND status = 'active'
  );
$$;

-- Profiles RLS policies
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Software RLS policies
CREATE POLICY "Admins can manage software"
  ON public.software FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Active resellers can view software"
  ON public.software FOR SELECT
  USING (public.is_active_reseller(auth.uid()) OR public.is_admin(auth.uid()));

-- Reseller allocations RLS policies
CREATE POLICY "Admins can manage allocations"
  ON public.reseller_allocations FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Resellers can view their allocations"
  ON public.reseller_allocations FOR SELECT
  USING (auth.uid() = reseller_id AND public.is_active_reseller(auth.uid()));

-- Licenses RLS policies
CREATE POLICY "Admins can view all licenses"
  ON public.licenses FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Resellers can view their licenses"
  ON public.licenses FOR SELECT
  USING (auth.uid() = created_by AND public.is_active_reseller(auth.uid()));

CREATE POLICY "Active resellers can create licenses"
  ON public.licenses FOR INSERT
  WITH CHECK (auth.uid() = created_by AND public.is_active_reseller(auth.uid()));

CREATE POLICY "Admins can manage licenses"
  ON public.licenses FOR ALL
  USING (public.is_admin(auth.uid()));

-- API keys RLS policies
CREATE POLICY "Admins can manage API keys"
  ON public.api_keys FOR ALL
  USING (public.is_admin(auth.uid()));

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'reseller',
    'pending'
  );
  RETURN new;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_software_updated_at
  BEFORE UPDATE ON public.software
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_allocations_updated_at
  BEFORE UPDATE ON public.reseller_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();