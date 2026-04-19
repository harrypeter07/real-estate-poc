-- Allow advisors to read their business module entitlements.
-- Needed for entitlement checks in middleware/server.

CREATE POLICY business_modules_advisor_read_own ON public.business_modules
  FOR SELECT TO authenticated
  USING (public.is_advisor() AND public.app_business_id() = business_id);

