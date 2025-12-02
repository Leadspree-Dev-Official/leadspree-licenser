-- Allow resellers to delete their own licenses
CREATE POLICY "Resellers can delete their licenses"
ON public.licenses
FOR DELETE
USING (
  auth.uid() = created_by
  AND is_active_reseller(auth.uid())
);