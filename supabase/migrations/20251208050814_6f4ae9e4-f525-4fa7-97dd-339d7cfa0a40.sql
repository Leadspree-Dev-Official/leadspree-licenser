-- Allow public (anonymous) access to view active software for the homepage
CREATE POLICY "Public can view active software"
ON public.software
FOR SELECT
USING (is_active = true);