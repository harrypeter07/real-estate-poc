-- Seed business_modules for the auto-created Default Business
-- so existing tenants don't have missing entitlement rows.

DO $$
DECLARE
  default_business_id UUID;
BEGIN
  SELECT value::uuid INTO default_business_id
  FROM public._app_kv
  WHERE key = 'default_business_id';

  IF default_business_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.business_modules (business_id, module_key, enabled)
  SELECT default_business_id, m.key, true
  FROM public.modules m
  ON CONFLICT (business_id, module_key) DO NOTHING;
END $$;

