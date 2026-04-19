-- Deletes duplicate advisor rows that have NO dependent data (sales, commissions, customers, assignments).
-- Keeps the oldest row (created_at, then id) per (business_id, app_phone_key(phone)).
-- Review preview_duplicate_phones.sql output first. Backup recommended.

WITH ranked AS (
  SELECT
    id,
    business_id,
    public.app_phone_key(phone) AS pk,
    row_number() OVER (
      PARTITION BY business_id, public.app_phone_key(phone)
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.advisors
  WHERE public.app_phone_key(phone) IS NOT NULL
    AND length(public.app_phone_key(phone)) = 10
),
candidates AS (
  SELECT r.id
  FROM ranked r
  WHERE r.rn > 1
    AND NOT EXISTS (SELECT 1 FROM public.plot_sales ps WHERE ps.advisor_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.advisor_commissions ac WHERE ac.advisor_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.advisor_project_commissions apc WHERE apc.advisor_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.advisor_id = r.id)
    AND NOT EXISTS (SELECT 1 FROM public.enquiry_customers ec WHERE ec.assigned_advisor_id = r.id)
)
DELETE FROM public.advisors a
WHERE a.id IN (SELECT id FROM candidates)
RETURNING a.id, a.name, a.phone;
