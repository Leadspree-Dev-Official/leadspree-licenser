-- Create enum for license type
CREATE TYPE license_type_enum AS ENUM ('Basic', 'Pro', 'Premium');

-- Add columns to licenses table
ALTER TABLE public.licenses 
ADD COLUMN extension_id text,
ADD COLUMN license_type license_type_enum DEFAULT 'Basic' NOT NULL;
