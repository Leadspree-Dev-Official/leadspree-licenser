-- Add currency column to licenses table
ALTER TABLE public.licenses 
ADD COLUMN currency TEXT DEFAULT 'USD';