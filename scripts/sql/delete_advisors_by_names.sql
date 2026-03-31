-- Delete advisors by exact name (case-insensitive): Abhishek Dongre, Santosh Sahu, Arvind Kamde.
-- 1) Run preview_delete_advisors_by_names.sql first and backup your DB.
-- 2) Run this entire file in Supabase SQL Editor (postgres role bypasses RLS).
--
-- Clears: commission payments → commissions → plot_sales.advisor_id → customers.advisor_id
--         → birthday reminders → advisor row (advisor_project_commissions CASCADE on advisor delete).
--
-- Auth: after delete, remove orphaned users in Dashboard → Authentication using auth_user_id
-- from the preview, or leave them (they will fail login if advisor row is gone).

BEGIN;

CREATE TEMP TABLE _adv_to_delete ON COMMIT DROP AS
SELECT a.id, a.name, a.auth_user_id
FROM public.advisors a
WHERE lower(btrim(a.name)) IN (
  lower(btrim('Abhishek Dongre')),
  lower(btrim('Santosh Sahu')),
  lower(btrim('Arvind Kamde'))
);

-- 1) Commission payment lines
DELETE FROM public.advisor_commission_payments p
USING public.advisor_commissions c
WHERE p.commission_id = c.id
  AND c.advisor_id IN (SELECT id FROM _adv_to_delete);

-- 2) Commission rows
DELETE FROM public.advisor_commissions c
WHERE c.advisor_id IN (SELECT id FROM _adv_to_delete);

-- 3) Sales: advisor column is nullable (admin-direct sales)
UPDATE public.plot_sales ps
SET advisor_id = NULL, updated_at = now()
WHERE ps.advisor_id IN (SELECT id FROM _adv_to_delete);

-- 4) Customers
UPDATE public.customers c
SET advisor_id = NULL, updated_at = now()
WHERE c.advisor_id IN (SELECT id FROM _adv_to_delete);

-- 5) Birthday reminders synced for advisors
DELETE FROM public.reminders r
WHERE r.description IN (
  SELECT 'AUTO_BIRTHDAY:advisor:' || t.id::text FROM _adv_to_delete t
);

-- 6) Advisor rows (advisor_project_commissions: ON DELETE CASCADE)
DELETE FROM public.advisors a
WHERE a.id IN (SELECT id FROM _adv_to_delete)
RETURNING a.id, a.name, a.phone;

COMMIT;
