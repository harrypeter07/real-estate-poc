-- Purpose:
-- 1) Fix business display-name sync gaps (fallback-ready data + auth mappings).
-- 2) Fix planned-vs-created plot mismatches for numeric plot-number projects.
-- Safe to run multiple times (idempotent updates/inserts).

BEGIN;

-- A) Business profile normalization so UI does not show "not set" unnecessarily.
UPDATE public.businesses
SET display_name = NULLIF(BTRIM(name), '')
WHERE NULLIF(BTRIM(display_name), '') IS NULL
  AND NULLIF(BTRIM(name), '') IS NOT NULL;

UPDATE public.businesses
SET
  display_name = NULLIF(BTRIM(display_name), ''),
  tagline = NULLIF(BTRIM(tagline), ''),
  address = NULLIF(BTRIM(address), ''),
  phone = NULLIF(BTRIM(phone), ''),
  email = NULLIF(BTRIM(email), ''),
  gst_number = NULLIF(BTRIM(gst_number), ''),
  pan_number = NULLIF(BTRIM(pan_number), ''),
  receipt_footer = NULLIF(BTRIM(receipt_footer), '');

-- B) Advisor auth mapping repair (helps business resolution for advisor logins).
-- Collision-safe: assigns only one advisor row per auth user id, and skips ids already used.
WITH advisor_candidates AS (
  SELECT
    a.id AS advisor_id,
    u.id AS auth_user_id,
    ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY a.created_at NULLS LAST, a.id) AS rn
  FROM public.advisors a
  JOIN auth.users u
    ON LOWER(BTRIM(a.email)) = LOWER(BTRIM(u.email))
  WHERE a.auth_user_id IS NULL
    AND NULLIF(BTRIM(a.email), '') IS NOT NULL
),
safe_candidates AS (
  SELECT c.advisor_id, c.auth_user_id
  FROM advisor_candidates c
  LEFT JOIN public.advisors used
    ON used.auth_user_id = c.auth_user_id
  WHERE c.rn = 1
    AND used.id IS NULL
)
UPDATE public.advisors a
SET auth_user_id = sc.auth_user_id
FROM safe_candidates sc
WHERE a.id = sc.advisor_id;

-- C) Business-admin mapping repair from known advisor auth mappings.
-- (Only adds rows that do not already exist.)
INSERT INTO public.business_admins (business_id, auth_user_id, is_active)
SELECT DISTINCT a.business_id, a.auth_user_id, TRUE
FROM public.advisors a
LEFT JOIN public.business_admins ba
  ON ba.business_id = a.business_id
 AND ba.auth_user_id = a.auth_user_id
WHERE a.business_id IS NOT NULL
  AND a.auth_user_id IS NOT NULL
  AND ba.auth_user_id IS NULL;

-- D) Planned-lot sync repair for numeric plot-number projects:
-- Insert missing rows from starting_plot_number .. starting_plot_number + total_plots_count - 1
-- only when a project has no plots OR all existing plot_number values are numeric.
WITH project_mode AS (
  SELECT
    p.id AS project_id,
    p.business_id,
    GREATEST(COALESCE(p.starting_plot_number, 1), 1) AS start_no,
    GREATEST(COALESCE(p.total_plots_count, 0), 0) AS total_count,
    COUNT(pl.id) AS existing_count,
    COUNT(pl.id) FILTER (WHERE pl.plot_number ~ '^\d+$') AS numeric_count
  FROM public.projects p
  LEFT JOIN public.plots pl ON pl.project_id = p.id
  GROUP BY p.id, p.business_id, p.starting_plot_number, p.total_plots_count
),
eligible_projects AS (
  SELECT *
  FROM project_mode
  WHERE total_count > 0
    AND (existing_count = 0 OR existing_count = numeric_count)
),
seed_values AS (
  SELECT
    ep.project_id,
    COALESCE(MAX(NULLIF(pl.size_sqft, 0)), 0) AS seed_size_sqft,
    COALESCE(MAX(NULLIF(pl.rate_per_sqft, 0)), 0) AS seed_rate_per_sqft
  FROM eligible_projects ep
  LEFT JOIN public.plots pl ON pl.project_id = ep.project_id
  GROUP BY ep.project_id
),
required_numbers AS (
  SELECT
    ep.project_id,
    ep.business_id,
    gs.n::text AS plot_number,
    sv.seed_size_sqft,
    sv.seed_rate_per_sqft
  FROM eligible_projects ep
  JOIN seed_values sv ON sv.project_id = ep.project_id
  JOIN LATERAL generate_series(ep.start_no, ep.start_no + ep.total_count - 1) AS gs(n) ON TRUE
)
INSERT INTO public.plots (
  business_id,
  project_id,
  plot_number,
  size_sqft,
  rate_per_sqft,
  facing,
  notes
)
SELECT
  rn.business_id,
  rn.project_id,
  rn.plot_number,
  rn.seed_size_sqft,
  rn.seed_rate_per_sqft,
  NULL,
  NULL
FROM required_numbers rn
LEFT JOIN public.plots pl
  ON pl.project_id = rn.project_id
 AND pl.plot_number = rn.plot_number
WHERE pl.id IS NULL;

COMMIT;

-- Verification (run after COMMIT):
-- 1) Businesses that still have no effective name:
--    SELECT id, name, display_name FROM public.businesses WHERE NULLIF(BTRIM(COALESCE(display_name, name)), '') IS NULL;
-- 2) Advisors missing auth mapping:
--    SELECT id, name, email FROM public.advisors WHERE auth_user_id IS NULL;
-- 3) Numeric projects still missing expected plots:
--    WITH p AS (
--      SELECT id, COALESCE(starting_plot_number, 1) s, COALESCE(total_plots_count, 0) c
--      FROM public.projects
--      WHERE COALESCE(total_plots_count, 0) > 0
--    )
--    SELECT p.id
--    FROM p
--    WHERE EXISTS (
--      SELECT 1
--      FROM generate_series(p.s, p.s + p.c - 1) g(n)
--      LEFT JOIN public.plots pl ON pl.project_id = p.id AND pl.plot_number = g.n::text
--      WHERE pl.id IS NULL
--    );
