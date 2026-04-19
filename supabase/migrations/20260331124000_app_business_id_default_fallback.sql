-- Multi-tenant compatibility: if auth JWT has no business_id, fall back to default_business_id.
-- This keeps existing single-tenant users working until their metadata is updated.

CREATE OR REPLACE FUNCTION public.app_business_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  raw text;
  fallback text;
BEGIN
  raw := trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'business_id'), ''));
  IF raw <> '' THEN
    BEGIN
      RETURN raw::uuid;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;

  -- No business_id in token; use default_business_id (single-tenant compatibility).
  SELECT value INTO fallback FROM public._app_kv WHERE key = 'default_business_id';
  IF fallback IS NULL OR trim(fallback) = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN fallback::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

