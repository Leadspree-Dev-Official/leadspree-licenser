-- Create function to increment license usage for reseller allocations
CREATE OR REPLACE FUNCTION public.increment_license_usage(allocation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Increment licenses_used for the allocation
  -- Only if the current user is the reseller for this allocation or is an admin
  UPDATE public.reseller_allocations
  SET licenses_used = licenses_used + 1,
      updated_at = now()
  WHERE id = allocation_id
    AND (reseller_id = auth.uid() OR is_admin(auth.uid()));
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allocation not found or access denied';
  END IF;
END;
$$;