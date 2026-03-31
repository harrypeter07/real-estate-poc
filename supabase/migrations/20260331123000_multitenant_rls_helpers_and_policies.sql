-- Multi-tenant RLS: helper functions + tenant-scoped policies

-- 0) Helper: safe UUID parsing from JWT metadata
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT lower(trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '')));
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.app_role() = 'superadmin';
$$;

CREATE OR REPLACE FUNCTION public.is_advisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.app_role() = 'advisor';
$$;

CREATE OR REPLACE FUNCTION public.is_admin_app_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  -- Align with lib/hr/auth-route.ts: non-advisor dashboard users count as admin by default
  SELECT (
    public.app_role() IN ('admin', 'owner', 'superadmin')
    OR nullif(public.app_role(), '') IS NULL
  ) AND public.app_role() <> 'advisor';
$$;

CREATE OR REPLACE FUNCTION public.app_business_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  raw text;
BEGIN
  raw := trim(coalesce((auth.jwt() -> 'user_metadata' ->> 'business_id'), ''));
  IF raw = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN raw::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_advisor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_app_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_advisor() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_app_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.app_business_id() TO service_role;

-- 1) Ensure enquiry_customers is tenant-scoped too
ALTER TABLE public.enquiry_customers ADD COLUMN IF NOT EXISTS business_id UUID;
CREATE INDEX IF NOT EXISTS idx_enquiry_customers_business_id
  ON public.enquiry_customers (business_id);

-- Backfill enquiry_customers.business_id from linked project if present, else default business
DO $$
DECLARE
  default_business_id UUID;
BEGIN
  SELECT value::uuid INTO default_business_id FROM public._app_kv WHERE key = 'default_business_id';

  UPDATE public.enquiry_customers e
  SET business_id = pr.business_id
  FROM public.projects pr
  WHERE e.project_id = pr.id
    AND e.business_id IS NULL;

  UPDATE public.enquiry_customers
  SET business_id = default_business_id
  WHERE business_id IS NULL;
END $$;

-- 2) Tenant policies template
-- For most tables: superadmin sees all; admin/advisor see only rows in their business.
-- We drop overly-broad policies when present.

-- businesses: superadmin manages, admins can read their own business row
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS businesses_superadmin_all ON public.businesses;
DROP POLICY IF EXISTS businesses_admin_read_own ON public.businesses;
CREATE POLICY businesses_superadmin_all ON public.businesses
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
CREATE POLICY businesses_admin_read_own ON public.businesses
  FOR SELECT TO authenticated
  USING (public.is_admin_app_user() AND id = public.app_business_id());

-- business_admins: superadmin manages; admins can read their own mapping row
ALTER TABLE public.business_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS business_admins_superadmin_all ON public.business_admins;
DROP POLICY IF EXISTS business_admins_admin_read_own ON public.business_admins;
CREATE POLICY business_admins_superadmin_all ON public.business_admins
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
CREATE POLICY business_admins_admin_read_own ON public.business_admins
  FOR SELECT TO authenticated
  USING (public.is_admin_app_user() AND business_id = public.app_business_id());

-- modules: readable by any authenticated user (UI needs it), write only by superadmin
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS modules_auth_read ON public.modules;
DROP POLICY IF EXISTS modules_superadmin_write ON public.modules;
CREATE POLICY modules_auth_read ON public.modules
  FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');
CREATE POLICY modules_superadmin_write ON public.modules
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- business_modules: superadmin manages; admins can read their own entitlements
ALTER TABLE public.business_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS business_modules_superadmin_all ON public.business_modules;
DROP POLICY IF EXISTS business_modules_admin_read_own ON public.business_modules;
CREATE POLICY business_modules_superadmin_all ON public.business_modules
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
CREATE POLICY business_modules_admin_read_own ON public.business_modules
  FOR SELECT TO authenticated
  USING (public.is_admin_app_user() AND business_id = public.app_business_id());

-- audit logs: superadmin-only
ALTER TABLE public.superadmin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS superadmin_audit_logs_superadmin_all ON public.superadmin_audit_logs;
CREATE POLICY superadmin_audit_logs_superadmin_all ON public.superadmin_audit_logs
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- 3) Domain tables tenant policies
-- Drop broad policies that may exist from schema.sql

-- projects
DROP POLICY IF EXISTS "Authenticated full access" ON public.projects;
DROP POLICY IF EXISTS projects_tenant_access ON public.projects;
CREATE POLICY projects_tenant_access ON public.projects
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

-- plots
DROP POLICY IF EXISTS "Authenticated full access" ON public.plots;
DROP POLICY IF EXISTS plots_tenant_access ON public.plots;
CREATE POLICY plots_tenant_access ON public.plots
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

-- advisors
DROP POLICY IF EXISTS "Authenticated full access" ON public.advisors;
DROP POLICY IF EXISTS advisors_tenant_access ON public.advisors;
CREATE POLICY advisors_tenant_access ON public.advisors
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

-- customers
DROP POLICY IF EXISTS "Authenticated full access" ON public.customers;
DROP POLICY IF EXISTS customers_admin_all ON public.customers;
DROP POLICY IF EXISTS customers_tenant_access ON public.customers;
CREATE POLICY customers_tenant_access ON public.customers
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

-- plot_sales
DROP POLICY IF EXISTS "Authenticated full access" ON public.plot_sales;
DROP POLICY IF EXISTS plot_sales_tenant_access ON public.plot_sales;
CREATE POLICY plot_sales_tenant_access ON public.plot_sales
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

-- payments
DROP POLICY IF EXISTS "Authenticated full access" ON public.payments;
DROP POLICY IF EXISTS payments_tenant_access ON public.payments;
CREATE POLICY payments_tenant_access ON public.payments
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

-- commissions
DROP POLICY IF EXISTS "Authenticated full access" ON public.advisor_project_commissions;
DROP POLICY IF EXISTS advisor_project_commissions_tenant_access ON public.advisor_project_commissions;
CREATE POLICY advisor_project_commissions_tenant_access ON public.advisor_project_commissions
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

DROP POLICY IF EXISTS "Authenticated full access" ON public.advisor_commissions;
DROP POLICY IF EXISTS advisor_commissions_tenant_access ON public.advisor_commissions;
CREATE POLICY advisor_commissions_tenant_access ON public.advisor_commissions
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

DROP POLICY IF EXISTS "Authenticated full access" ON public.advisor_commission_payments;
DROP POLICY IF EXISTS advisor_commission_payments_tenant_access ON public.advisor_commission_payments;
CREATE POLICY advisor_commission_payments_tenant_access ON public.advisor_commission_payments
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

-- ops
DROP POLICY IF EXISTS "Authenticated full access" ON public.office_expenses;
DROP POLICY IF EXISTS office_expenses_tenant_access ON public.office_expenses;
CREATE POLICY office_expenses_tenant_access ON public.office_expenses
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

DROP POLICY IF EXISTS "Authenticated full access" ON public.reminders;
DROP POLICY IF EXISTS reminders_tenant_access ON public.reminders;
CREATE POLICY reminders_tenant_access ON public.reminders
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

-- docs
DROP POLICY IF EXISTS "Authenticated full access" ON public.customer_documents;
DROP POLICY IF EXISTS customer_documents_tenant_access ON public.customer_documents;
CREATE POLICY customer_documents_tenant_access ON public.customer_documents
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

-- enquiry_customers: admin-only but tenant scoped; superadmin can do all
DROP POLICY IF EXISTS enquiry_admin_all ON public.enquiry_customers;
DROP POLICY IF EXISTS enquiry_tenant_admin_all ON public.enquiry_customers;
CREATE POLICY enquiry_tenant_admin_all ON public.enquiry_customers
  FOR ALL TO authenticated
  USING (
    public.is_superadmin()
    OR (public.is_admin_app_user() AND business_id = public.app_business_id())
  )
  WITH CHECK (
    public.is_superadmin()
    OR (public.is_admin_app_user() AND business_id = public.app_business_id())
  );

-- HR tables: update the existing helper to include tenant filter in policies
-- Keep hr_is_admin_app_user() as-is, but require business match as well.
DROP POLICY IF EXISTS hr_employees_admin_all ON public.hr_employees;
DROP POLICY IF EXISTS hr_attendance_admin_all ON public.hr_attendance;
DROP POLICY IF EXISTS hr_payout_batches_admin_all ON public.hr_payout_batches;
DROP POLICY IF EXISTS hr_employee_payouts_admin_all ON public.hr_employee_payouts;

CREATE POLICY hr_employees_admin_all ON public.hr_employees
  FOR ALL TO authenticated
  USING (public.hr_is_admin_app_user() AND (public.is_superadmin() OR business_id = public.app_business_id()))
  WITH CHECK (public.hr_is_admin_app_user() AND (public.is_superadmin() OR business_id = public.app_business_id()));

CREATE POLICY hr_attendance_admin_all ON public.hr_attendance
  FOR ALL TO authenticated
  USING (public.hr_is_admin_app_user() AND (public.is_superadmin() OR business_id = public.app_business_id()))
  WITH CHECK (public.hr_is_admin_app_user() AND (public.is_superadmin() OR business_id = public.app_business_id()));

CREATE POLICY hr_payout_batches_admin_all ON public.hr_payout_batches
  FOR ALL TO authenticated
  USING (public.hr_is_admin_app_user() AND (public.is_superadmin() OR business_id = public.app_business_id()))
  WITH CHECK (public.hr_is_admin_app_user() AND (public.is_superadmin() OR business_id = public.app_business_id()));

CREATE POLICY hr_employee_payouts_admin_all ON public.hr_employee_payouts
  FOR ALL TO authenticated
  USING (public.hr_is_admin_app_user() AND (public.is_superadmin() OR business_id = public.app_business_id()))
  WITH CHECK (public.hr_is_admin_app_user() AND (public.is_superadmin() OR business_id = public.app_business_id()));

