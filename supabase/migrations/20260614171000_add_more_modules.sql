-- Migration to register and backfill new modules for independent toggling in Superadmin

-- 1. Insert new modules if they do not exist
INSERT INTO public.modules (key, name, description)
VALUES
  ('advisors', 'Advisors', 'Advisor management'),
  ('advisor_analytics', 'Advisor Analytics', 'Analytics and advisor commissions dashboard'),
  ('customers', 'Customers', 'Customer tracking & profiles'),
  ('due_payments', 'Due Payments', 'EMI schedules & payment reminders'),
  ('recovery', 'Recovery', 'Payment recovery tracking')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2. Backfill for all existing businesses (enabled by default)
INSERT INTO public.business_modules (business_id, module_key, enabled)
SELECT b.id, m.key, true
FROM public.businesses b
CROSS JOIN (
  SELECT 'advisors'::text AS key
  UNION ALL SELECT 'advisor_analytics'
  UNION ALL SELECT 'customers'
  UNION ALL SELECT 'due_payments'
  UNION ALL SELECT 'recovery'
) m
ON CONFLICT (business_id, module_key) DO NOTHING;
