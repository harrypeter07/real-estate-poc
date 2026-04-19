-- Run this if CREATE UNIQUE INDEX advisors_phone_unique fails with duplicate key on
-- (business_id, app_phone_key(phone)).
--
-- For each duplicate group: keeps the oldest advisor (created_at, then id), moves FKs from
-- the others to the keeper, then deletes the duplicate rows. Safe for plot_sales, customers,
-- commissions (unique per sale_id), and project commissions (conflicting project rows deleted first).
--
-- Afterward: remove orphan Auth users for deleted advisor ids (Dashboard → Authentication).
-- Backup recommended. Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.app_phone_key(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN NULL
    ELSE right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10)
  END;
$$;

DO $$
DECLARE
  grp RECORD;
  keeper uuid;
  dup_id uuid;
  i int;
BEGIN
  FOR grp IN
    SELECT
      business_id,
      public.app_phone_key(phone) AS pk,
      array_agg(id ORDER BY created_at ASC NULLS LAST, id ASC) AS ids
    FROM public.advisors
    WHERE public.app_phone_key(phone) IS NOT NULL
      AND length(public.app_phone_key(phone)) = 10
    GROUP BY business_id, public.app_phone_key(phone)
    HAVING count(*) > 1
  LOOP
    keeper := grp.ids[1];
    FOR i IN 2..array_length(grp.ids, 1) LOOP
      dup_id := grp.ids[i];

      UPDATE public.plot_sales SET advisor_id = keeper, updated_at = now()
      WHERE advisor_id = dup_id;

      UPDATE public.customers SET advisor_id = keeper, updated_at = now()
      WHERE advisor_id = dup_id;

      UPDATE public.advisor_commissions SET advisor_id = keeper, updated_at = now()
      WHERE advisor_id = dup_id;

      UPDATE public.enquiry_customers SET assigned_advisor_id = keeper
      WHERE assigned_advisor_id = dup_id;

      DELETE FROM public.reminders r
      WHERE r.description = 'AUTO_BIRTHDAY:advisor:' || dup_id::text;

      -- Drop duplicate project-commission rows when keeper already has that project.
      DELETE FROM public.advisor_project_commissions apc
      WHERE apc.advisor_id = dup_id
        AND EXISTS (
          SELECT 1 FROM public.advisor_project_commissions x
          WHERE x.advisor_id = keeper AND x.project_id = apc.project_id
        );

      UPDATE public.advisor_project_commissions SET advisor_id = keeper, updated_at = now()
      WHERE advisor_id = dup_id;

      DELETE FROM public.advisors WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;

-- Create the index if it is still missing (migration may have failed only on this step).
CREATE UNIQUE INDEX IF NOT EXISTS advisors_phone_unique
  ON public.advisors (business_id, public.app_phone_key(phone))
  WHERE public.app_phone_key(phone) IS NOT NULL
    AND length(public.app_phone_key(phone)) = 10;
