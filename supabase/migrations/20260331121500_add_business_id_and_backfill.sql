-- Multi-tenant: add business_id to domain tables + backfill to a default tenant.
-- Safe rollout: columns added nullable, then backfilled. Enforce NOT NULL later after app writes business_id.

-- 0) Ensure extension for gen_random_uuid exists (usually present in Supabase)
-- create extension if not exists pgcrypto;

-- 1) Create (or reuse) a default business for existing single-tenant data
CREATE TABLE IF NOT EXISTS public._app_kv (
  key TEXT PRIMARY KEY,
  value TEXT
);

DO $$
DECLARE
  default_business_id UUID;
BEGIN
  -- Create default business if missing, and store its id in _app_kv.
  SELECT value::uuid INTO default_business_id
  FROM public._app_kv
  WHERE key = 'default_business_id';

  IF default_business_id IS NULL THEN
    INSERT INTO public.businesses (name, status, notes)
    VALUES ('Default Business', 'active', 'Auto-created during multi-tenant migration')
    RETURNING id INTO default_business_id;

    INSERT INTO public._app_kv (key, value)
    VALUES ('default_business_id', default_business_id::text)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  END IF;
END $$;

-- 2) Add business_id columns (nullable for now)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.plot_sales ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.advisors ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.advisor_project_commissions ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.advisor_commissions ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.advisor_commission_payments ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.office_expenses ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.customer_documents ADD COLUMN IF NOT EXISTS business_id UUID;

-- HR tables
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.hr_attendance ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.hr_payout_batches ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.hr_employee_payouts ADD COLUMN IF NOT EXISTS business_id UUID;

-- Legacy attendance tables (if still used)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.staff_attendance ADD COLUMN IF NOT EXISTS business_id UUID;

-- 3) Backfill business_id to default_business_id
DO $$
DECLARE
  default_business_id UUID;
BEGIN
  SELECT value::uuid INTO default_business_id
  FROM public._app_kv
  WHERE key = 'default_business_id';

  -- Root tables
  UPDATE public.projects SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.customers SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.advisors SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.office_expenses SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.reminders SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.customer_documents SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.staff SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.staff_attendance SET business_id = default_business_id WHERE business_id IS NULL;

  -- Tables linked via project/plot/sale (best-effort joins)
  UPDATE public.plots p
  SET business_id = pr.business_id
  FROM public.projects pr
  WHERE p.project_id = pr.id
    AND p.business_id IS NULL;

  UPDATE public.plot_sales s
  SET business_id = p.business_id
  FROM public.plots p
  WHERE s.plot_id = p.id
    AND s.business_id IS NULL;

  UPDATE public.payments pay
  SET business_id = s.business_id
  FROM public.plot_sales s
  WHERE pay.sale_id = s.id
    AND pay.business_id IS NULL;

  UPDATE public.advisor_project_commissions apc
  SET business_id = pr.business_id
  FROM public.projects pr
  WHERE apc.project_id = pr.id
    AND apc.business_id IS NULL;

  UPDATE public.advisor_commissions ac
  SET business_id = s.business_id
  FROM public.plot_sales s
  WHERE ac.sale_id = s.id
    AND ac.business_id IS NULL;

  UPDATE public.advisor_commission_payments acp
  SET business_id = ac.business_id
  FROM public.advisor_commissions ac
  WHERE acp.commission_id = ac.id
    AND acp.business_id IS NULL;

  -- HR tables (best-effort: default)
  UPDATE public.hr_employees SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.hr_payout_batches SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.hr_attendance SET business_id = default_business_id WHERE business_id IS NULL;
  UPDATE public.hr_employee_payouts SET business_id = default_business_id WHERE business_id IS NULL;
END $$;

-- 4) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_projects_business_id ON public.projects (business_id);
CREATE INDEX IF NOT EXISTS idx_plots_business_id ON public.plots (business_id);
CREATE INDEX IF NOT EXISTS idx_plot_sales_business_id ON public.plot_sales (business_id);
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON public.payments (business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers (business_id);
CREATE INDEX IF NOT EXISTS idx_advisors_business_id ON public.advisors (business_id);
CREATE INDEX IF NOT EXISTS idx_office_expenses_business_id ON public.office_expenses (business_id);
CREATE INDEX IF NOT EXISTS idx_reminders_business_id ON public.reminders (business_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_business_id ON public.customer_documents (business_id);

CREATE INDEX IF NOT EXISTS idx_hr_employees_business_id ON public.hr_employees (business_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_business_id ON public.hr_attendance (business_id);
CREATE INDEX IF NOT EXISTS idx_hr_payout_batches_business_id ON public.hr_payout_batches (business_id);
CREATE INDEX IF NOT EXISTS idx_hr_employee_payouts_business_id ON public.hr_employee_payouts (business_id);

-- 5) Convert global unique indexes to tenant-safe composite unique indexes
-- customers(phone) was globally unique → now unique per business
DROP INDEX IF EXISTS public.customers_phone_unique;
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique
  ON public.customers (business_id, phone);

-- hr_employees(phone) partial unique: make it tenant-scoped too
DROP INDEX IF EXISTS public.hr_employees_phone_unique;
CREATE UNIQUE INDEX IF NOT EXISTS hr_employees_phone_unique
  ON public.hr_employees (business_id, phone)
  WHERE phone IS NOT NULL;

-- hr_employees(employee_code) is a UNIQUE constraint: replace with composite unique index
ALTER TABLE public.hr_employees
  DROP CONSTRAINT IF EXISTS hr_employees_employee_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS hr_employees_employee_code_unique
  ON public.hr_employees (business_id, employee_code);

-- hr_payout_batches(month_label) is a UNIQUE constraint: replace with composite unique index
ALTER TABLE public.hr_payout_batches
  DROP CONSTRAINT IF EXISTS hr_payout_batches_month_label_key;
CREATE UNIQUE INDEX IF NOT EXISTS hr_payout_batches_month_label_unique
  ON public.hr_payout_batches (business_id, month_label);

-- advisors(code) is a UNIQUE constraint in base schema: replace with composite unique index
ALTER TABLE public.advisors
  DROP CONSTRAINT IF EXISTS advisors_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS advisors_code_unique
  ON public.advisors (business_id, code);

