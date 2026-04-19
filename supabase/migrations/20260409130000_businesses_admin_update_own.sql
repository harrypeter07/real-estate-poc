-- Allow tenant admins to update their own business profile.
-- Fixes "0 rows affected" updates caused by RLS on public.businesses.

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS businesses_admin_update_own ON public.businesses;

CREATE POLICY businesses_admin_update_own ON public.businesses
  FOR UPDATE TO authenticated
  USING (public.is_admin_app_user() AND id = public.app_business_id())
  WITH CHECK (public.is_admin_app_user() AND id = public.app_business_id());

