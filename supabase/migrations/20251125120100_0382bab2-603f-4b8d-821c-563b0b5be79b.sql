-- Add new fields to licenses table
ALTER TABLE public.licenses
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date DATE,
  ADD COLUMN amount NUMERIC(10, 2),
  ADD COLUMN pay_mode TEXT,
  ADD COLUMN reseller_id UUID REFERENCES public.profiles(id),
  ADD COLUMN issue_date DATE DEFAULT CURRENT_DATE;

-- Make buyer_email and buyer_phone nullable
ALTER TABLE public.licenses
  ALTER COLUMN buyer_email DROP NOT NULL,
  ALTER COLUMN buyer_phone DROP NOT NULL;

-- Add check constraint for pay_mode
ALTER TABLE public.licenses
  ADD CONSTRAINT pay_mode_check CHECK (pay_mode IN ('UPI', 'Bank', 'Cash') OR pay_mode IS NULL);