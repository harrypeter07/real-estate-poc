-- Multi-tenant scaffolding: businesses, admins, modules, entitlements, audit logs

-- 1) Tenants (businesses)
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active / disabled
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_status
  ON public.businesses (status);

-- 2) Business admins (link auth.users to a business)
CREATE TABLE IF NOT EXISTS public.business_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, auth_user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_admins_business
  ON public.business_admins (business_id);

CREATE INDEX IF NOT EXISTS idx_business_admins_auth_user
  ON public.business_admins (auth_user_id);

-- 3) Modules catalog (static list of features that can be toggled per tenant)
CREATE TABLE IF NOT EXISTS public.modules (
  key TEXT PRIMARY KEY, -- e.g. 'projects','sales','payments','commissions','expenses','messaging','enquiries','hr','reports'
  name TEXT NOT NULL,
  description TEXT
);

-- Seed common modules if table is empty
INSERT INTO public.modules (key, name, description)
SELECT m.key, m.name, m.description
FROM (
  VALUES
    ('projects', 'Projects', 'Project & plot management'),
    ('sales', 'Sales', 'Plot sales & booking'),
    ('payments', 'Payments', 'Customer payment tracking'),
    ('commissions', 'Commissions', 'Advisor commission management'),
    ('expenses', 'Expenses', 'Office expense tracking'),
    ('messaging', 'Messaging', 'Bulk & templated messaging'),
    ('enquiries', 'Enquiries', 'Lead and enquiry management'),
    ('hr', 'HR', 'Employee attendance & payouts'),
    ('reports', 'Reports', 'Analytics & reports dashboard')
) AS m(key, name, description)
LEFT JOIN public.modules existing ON existing.key = m.key
WHERE existing.key IS NULL;

-- 4) Business module entitlements
CREATE TABLE IF NOT EXISTS public.business_modules (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL REFERENCES public.modules(key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_business_modules_business
  ON public.business_modules (business_id);

CREATE INDEX IF NOT EXISTS idx_business_modules_module
  ON public.business_modules (module_key);

-- 5) Super admin audit logs
CREATE TABLE IF NOT EXISTS public.superadmin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  target_admin_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. business.create, admin.disable, module.toggle
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_superadmin_audit_logs_actor
  ON public.superadmin_audit_logs (actor_auth_user_id);

CREATE INDEX IF NOT EXISTS idx_superadmin_audit_logs_business
  ON public.superadmin_audit_logs (target_business_id);

CREATE INDEX IF NOT EXISTS idx_superadmin_audit_logs_created_at
  ON public.superadmin_audit_logs (created_at DESC);

