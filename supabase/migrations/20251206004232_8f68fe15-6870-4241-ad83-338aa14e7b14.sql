-- Remove currency column from licenses
ALTER TABLE public.licenses DROP COLUMN IF EXISTS currency;

-- Add new columns to software table for homepage display
ALTER TABLE public.software 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS features TEXT[], -- Array of feature bullet points
ADD COLUMN IF NOT EXISTS retail_price NUMERIC,
ADD COLUMN IF NOT EXISTS learn_more_link TEXT;

-- Make description NOT NULL (we need to set a default first for existing rows)
UPDATE public.software SET description = '' WHERE description IS NULL;
ALTER TABLE public.software ALTER COLUMN description SET NOT NULL;
ALTER TABLE public.software ALTER COLUMN description SET DEFAULT '';

-- Create a function to auto-update is_active based on end_date
CREATE OR REPLACE FUNCTION public.update_license_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If end_date is in the past, set is_active to false
  IF NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run on insert and update
DROP TRIGGER IF EXISTS check_license_expiry ON public.licenses;
CREATE TRIGGER check_license_expiry
BEFORE INSERT OR UPDATE ON public.licenses
FOR EACH ROW
EXECUTE FUNCTION public.update_license_status();

-- Also update existing expired licenses
UPDATE public.licenses 
SET is_active = false 
WHERE end_date IS NOT NULL AND end_date < CURRENT_DATE AND is_active = true;