-- Remove extension_id column from licenses table
ALTER TABLE public.licenses DROP COLUMN IF EXISTS extension_id;