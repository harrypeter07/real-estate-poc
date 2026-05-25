-- 1) Add KYC URL columns to customers table if not already present
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS aadhaar_url TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pan_url TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Optional columns mentioned in the spec:
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending';

-- 2) Update Storage Policies for the new path layout: tenant/{tenant-slug}/customers/{customer-id}/aadhaar/...
-- Note: the customer-docs bucket RLS policies are set up.
-- We can add select/insert/update/delete policies for this structure.

-- Drop existing policies if they overlap
DROP POLICY IF EXISTS "customer_docs_tenant_select" ON storage.objects;
DROP POLICY IF EXISTS "customer_docs_tenant_insert" ON storage.objects;
DROP POLICY IF EXISTS "customer_docs_tenant_update" ON storage.objects;
DROP POLICY IF EXISTS "customer_docs_tenant_delete" ON storage.objects;

-- Select policy
CREATE POLICY "customer_docs_tenant_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-docs'
  AND split_part(name, '/', 1) = 'tenant'
  AND exists (
    SELECT 1
    FROM public.customers c
    WHERE c.id = (
      CASE
        WHEN split_part(name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN split_part(name, '/', 4)::uuid
        ELSE null
      END
    )
    AND (
      -- Superadmin has full access
      public.is_superadmin()
      -- Admin can access any customer within their business
      OR (public.is_admin_app_user() AND c.business_id = public.app_business_id())
      -- Advisor can access their own customer within their business
      OR (public.is_advisor() AND c.advisor_id = (
        CASE
          WHEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          ELSE null
        END
      ) AND c.business_id = public.app_business_id())
    )
  )
);

-- Insert policy
CREATE POLICY "customer_docs_tenant_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-docs'
  AND split_part(name, '/', 1) = 'tenant'
  AND exists (
    SELECT 1
    FROM public.customers c
    WHERE c.id = (
      CASE
        WHEN split_part(name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN split_part(name, '/', 4)::uuid
        ELSE null
      END
    )
    AND (
      -- Superadmin has full access
      public.is_superadmin()
      -- Admin can insert for any customer within their business
      OR (public.is_admin_app_user() AND c.business_id = public.app_business_id())
      -- Advisor can insert for their own customer within their business
      OR (public.is_advisor() AND c.advisor_id = (
        CASE
          WHEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          ELSE null
        END
      ) AND c.business_id = public.app_business_id())
    )
  )
);

-- Update policy
CREATE POLICY "customer_docs_tenant_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'customer-docs'
  AND split_part(name, '/', 1) = 'tenant'
  AND exists (
    SELECT 1
    FROM public.customers c
    WHERE c.id = (
      CASE
        WHEN split_part(name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN split_part(name, '/', 4)::uuid
        ELSE null
      END
    )
    AND (
      -- Superadmin has full access
      public.is_superadmin()
      -- Admin can update for any customer within their business
      OR (public.is_admin_app_user() AND c.business_id = public.app_business_id())
      -- Advisor can update for their own customer within their business
      OR (public.is_advisor() AND c.advisor_id = (
        CASE
          WHEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          ELSE null
        END
      ) AND c.business_id = public.app_business_id())
    )
  )
)
WITH CHECK (
  bucket_id = 'customer-docs'
  AND split_part(name, '/', 1) = 'tenant'
  AND exists (
    SELECT 1
    FROM public.customers c
    WHERE c.id = (
      CASE
        WHEN split_part(name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN split_part(name, '/', 4)::uuid
        ELSE null
      END
    )
    AND (
      -- Superadmin has full access
      public.is_superadmin()
      -- Admin can update for any customer within their business
      OR (public.is_admin_app_user() AND c.business_id = public.app_business_id())
      -- Advisor can update for their own customer within their business
      OR (public.is_advisor() AND c.advisor_id = (
        CASE
          WHEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          ELSE null
        END
      ) AND c.business_id = public.app_business_id())
    )
  )
);

-- Delete policy
CREATE POLICY "customer_docs_tenant_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'customer-docs'
  AND split_part(name, '/', 1) = 'tenant'
  AND exists (
    SELECT 1
    FROM public.customers c
    WHERE c.id = (
      CASE
        WHEN split_part(name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN split_part(name, '/', 4)::uuid
        ELSE null
      END
    )
    AND (
      -- Superadmin has full access
      public.is_superadmin()
      -- Admin can delete for any customer within their business
      OR (public.is_admin_app_user() AND c.business_id = public.app_business_id())
      -- Advisor can delete for their own customer within their business
      OR (public.is_advisor() AND c.advisor_id = (
        CASE
          WHEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN nullif(auth.jwt() -> 'user_metadata' ->> 'advisor_id', '')::uuid
          ELSE null
        END
      ) AND c.business_id = public.app_business_id())
    )
  )
);
