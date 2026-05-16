-- =============================================================================
-- Receipt generation: RLS + Storage diagnostics and fixes
-- =============================================================================
-- Symptom: "new row violates row-level security policy" when generating receipts.
-- Causes this script addresses:
--   1) plot_sales.business_id NULL → multitenant RLS (plot_sales_tenant_access)
--      rejects UPDATE (receipt_path) because row must match app_business_id().
--   2) storage.objects has RLS but no policies for bucket "receipts" → upload fails.
--   3) Missing "receipts" bucket row in storage.buckets.
--
-- Run in Supabase SQL Editor (prefer service role / postgres so storage + RLS apply).
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT / DROP IF EXISTS patterns.
--
-- After running: hard-refresh the app; if upload still fails, confirm bucket
-- "receipts" exists in Dashboard → Storage and is public if you rely on public URLs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Diagnostics (messages in "Messages" / notices panel)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  ps_null int;
  pay_null int;
  pl_null int;
  cust_null int;
  bucket_missing boolean;
  pol_count int;
  def_biz text;
BEGIN
  SELECT count(*) INTO ps_null FROM public.plot_sales WHERE business_id IS NULL;
  SELECT count(*) INTO pay_null FROM public.payments WHERE business_id IS NULL;
  SELECT count(*) INTO pl_null FROM public.plots WHERE business_id IS NULL;
  SELECT count(*) INTO cust_null FROM public.customers WHERE business_id IS NULL;

  SELECT value INTO def_biz FROM public._app_kv WHERE key = 'default_business_id' LIMIT 1;

  SELECT NOT EXISTS (
    SELECT 1 FROM storage.buckets b WHERE b.id = 'receipts'
  ) INTO bucket_missing;

  SELECT count(*) INTO pol_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname ILIKE '%receipt%';

  RAISE NOTICE '[receipt-fix] plot_sales with NULL business_id: %', ps_null;
  RAISE NOTICE '[receipt-fix] payments with NULL business_id: %', pay_null;
  RAISE NOTICE '[receipt-fix] plots with NULL business_id: %', pl_null;
  RAISE NOTICE '[receipt-fix] customers with NULL business_id: %', cust_null;
  RAISE NOTICE '[receipt-fix] _app_kv default_business_id: %', COALESCE(def_biz, '(not set)');
  RAISE NOTICE '[receipt-fix] storage.buckets missing receipts: %', bucket_missing;
  RAISE NOTICE '[receipt-fix] storage.objects policies with name like %%receipt%%: %', pol_count;
END $$;

-- ---------------------------------------------------------------------------
-- B) Backfill business_id on plot_sales (fixes plot_sales UPDATE RLS)
-- ---------------------------------------------------------------------------
-- Prefer project.business_id via plot link.
UPDATE public.plot_sales s
SET business_id = p.business_id,
    updated_at = COALESCE(s.updated_at, now())
FROM public.plots pl
JOIN public.projects p ON p.id = pl.project_id
WHERE s.plot_id = pl.id
  AND s.business_id IS NULL
  AND p.business_id IS NOT NULL;

-- Rows still NULL: align to plot.business_id if set.
UPDATE public.plot_sales s
SET business_id = pl.business_id,
    updated_at = COALESCE(s.updated_at, now())
FROM public.plots pl
WHERE s.plot_id = pl.id
  AND s.business_id IS NULL
  AND pl.business_id IS NOT NULL;

-- Still NULL: use default tenant from _app_kv (same idea as app_business_id fallback).
UPDATE public.plot_sales s
SET business_id = (SELECT value::uuid FROM public._app_kv WHERE key = 'default_business_id' LIMIT 1),
    updated_at = COALESCE(s.updated_at, now())
WHERE s.business_id IS NULL
  AND EXISTS (SELECT 1 FROM public._app_kv WHERE key = 'default_business_id' AND value ~* '^[0-9a-f-]{36}$');

-- ---------------------------------------------------------------------------
-- C) Backfill payments.business_id from sale (receipt flow also touches payments elsewhere)
-- ---------------------------------------------------------------------------
UPDATE public.payments pay
SET business_id = s.business_id,
    updated_at = COALESCE(pay.updated_at, now())
FROM public.plot_sales s
WHERE pay.sale_id = s.id
  AND pay.business_id IS NULL
  AND s.business_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- D) Ensure receipts bucket exists (Dashboard may still need to toggle "Public")
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET
  public = COALESCE(EXCLUDED.public, storage.buckets.public);

-- ---------------------------------------------------------------------------
-- E) Storage RLS policies for bucket "receipts" (admin dashboard users only)
--     Paths used by app: sale-receipts/..., business-logos/{businessId}/...
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "receipts_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "receipts_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipts_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "receipts_admin_delete" ON storage.objects;

CREATE POLICY "receipts_admin_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.is_admin_app_user()
);

CREATE POLICY "receipts_admin_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND public.is_admin_app_user()
);

CREATE POLICY "receipts_admin_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.is_admin_app_user()
)
WITH CHECK (
  bucket_id = 'receipts'
  AND public.is_admin_app_user()
);

CREATE POLICY "receipts_admin_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.is_admin_app_user()
);

-- ---------------------------------------------------------------------------
-- F) Re-report plot_sales NULL count (should be 0 if backfill succeeded)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  ps_null int;
BEGIN
  SELECT count(*) INTO ps_null FROM public.plot_sales WHERE business_id IS NULL;
  IF ps_null > 0 THEN
    RAISE WARNING '[receipt-fix] % plot_sales rows still have NULL business_id — set projects.business_id / _app_kv default_business_id, then re-run section B.', ps_null;
  ELSE
    RAISE NOTICE '[receipt-fix] plot_sales: no NULL business_id rows remaining.';
  END IF;
END $$;
