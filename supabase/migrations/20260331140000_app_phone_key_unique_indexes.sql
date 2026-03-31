-- Normalized phone key (last 10 digits) for uniqueness per business.
-- Run scripts/sql/preview_duplicate_phones.sql first if migration fails on duplicates.
--
-- If CREATE UNIQUE INDEX advisors_phone_unique fails (23505 duplicate key), merge duplicates
-- then create the index: scripts/sql/merge_duplicate_advisors_phone_then_index.sql

CREATE OR REPLACE FUNCTION public.app_phone_key(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN NULL
    ELSE right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10)
  END;
$$;

-- Customers: unique on (business_id, normalized phone)
DROP INDEX IF EXISTS public.customers_phone_unique;
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique
  ON public.customers (business_id, public.app_phone_key(phone))
  WHERE public.app_phone_key(phone) IS NOT NULL
    AND length(public.app_phone_key(phone)) = 10;

-- HR employees
DROP INDEX IF EXISTS public.hr_employees_phone_unique;
CREATE UNIQUE INDEX IF NOT EXISTS hr_employees_phone_unique
  ON public.hr_employees (business_id, public.app_phone_key(phone))
  WHERE public.app_phone_key(phone) IS NOT NULL
    AND length(public.app_phone_key(phone)) = 10;

-- Advisors (same business cannot have two rows with the same normalized phone)
CREATE UNIQUE INDEX IF NOT EXISTS advisors_phone_unique
  ON public.advisors (business_id, public.app_phone_key(phone))
  WHERE public.app_phone_key(phone) IS NOT NULL
    AND length(public.app_phone_key(phone)) = 10;
