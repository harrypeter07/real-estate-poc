-- Preview advisors matching these names (case-insensitive, trimmed).
-- Run first. Confirm ids/names before running delete_advisors_by_names.sql.

WITH target_names AS (
  SELECT unnest(ARRAY[
    'Abhishek Dongre',
    'Santosh Sahu',
    'Arvind Kamde'
  ]) AS raw_name
),
matched AS (
  SELECT a.id, a.name, a.phone, a.code, a.auth_user_id, a.created_at
  FROM public.advisors a
  JOIN target_names t ON lower(btrim(a.name)) = lower(btrim(t.raw_name))
)
SELECT
  m.*,
  (SELECT count(*)::int FROM public.plot_sales ps WHERE ps.advisor_id = m.id) AS plot_sales_rows,
  (SELECT count(*)::int FROM public.advisor_commissions ac WHERE ac.advisor_id = m.id) AS commission_rows,
  (SELECT count(*)::int FROM public.customers c WHERE c.advisor_id = m.id) AS customer_rows,
  (SELECT count(*)::int FROM public.advisor_project_commissions apc WHERE apc.advisor_id = m.id) AS project_commission_rows
FROM matched m
ORDER BY m.name;

-- Rows in advisors that did NOT match (optional sanity check):
-- SELECT id, name FROM public.advisors
-- WHERE lower(btrim(name)) IN (
--   lower(btrim('Abhishek Dongre')),
--   lower(btrim('Santosh Sahu')),
--   lower(btrim('Arvind Kamde'))
-- );
