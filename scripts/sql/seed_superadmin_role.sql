-- Seed/promote a Supabase Auth user to superadmin role.
-- Use this when the auth user already exists in auth.users.
--
-- HOW TO USE:
-- 1) Replace the email below.
-- 2) Run in Supabase SQL editor as service role.
--
-- NOTE:
-- - This script sets role in both raw_user_meta_data and raw_app_meta_data.
-- - If the user does not exist yet, create it first via:
--   node scripts/create-superadmin.js

DO $$
DECLARE
  target_email text := 'superadmin@mginfra.com';
  v_user_id uuid;
BEGIN
  SELECT id
    INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(target_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found for email: %. Create it first (node scripts/create-superadmin.js), then rerun.', target_email;
  END IF;

  UPDATE auth.users
  SET
    raw_user_meta_data = jsonb_set(
      coalesce(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb('superadmin'::text),
      true
    ),
    raw_app_meta_data = jsonb_set(
      coalesce(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb('superadmin'::text),
      true
    ),
    updated_at = now()
  WHERE id = v_user_id;

  RAISE NOTICE 'Superadmin role set for user id: %', v_user_id;
END $$;
