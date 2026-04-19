-- Preview duplicate normalized phones before applying advisors_phone_unique / customers_phone_unique.
-- Run in Supabase SQL editor.

SELECT 'advisors' AS entity, business_id, public.app_phone_key(phone) AS phone_key, count(*) AS n,
       array_agg(id ORDER BY created_at) AS ids
FROM public.advisors
WHERE public.app_phone_key(phone) IS NOT NULL
  AND length(public.app_phone_key(phone)) = 10
GROUP BY business_id, public.app_phone_key(phone)
HAVING count(*) > 1;

SELECT 'customers' AS entity, business_id, public.app_phone_key(phone) AS phone_key, count(*) AS n,
       array_agg(id ORDER BY created_at) AS ids
FROM public.customers
WHERE public.app_phone_key(phone) IS NOT NULL
  AND length(public.app_phone_key(phone)) = 10
GROUP BY business_id, public.app_phone_key(phone)
HAVING count(*) > 1;

SELECT 'hr_employees' AS entity, business_id, public.app_phone_key(phone) AS phone_key, count(*) AS n,
       array_agg(id ORDER BY created_at) AS ids
FROM public.hr_employees
WHERE public.app_phone_key(phone) IS NOT NULL
  AND length(public.app_phone_key(phone)) = 10
GROUP BY business_id, public.app_phone_key(phone)
HAVING count(*) > 1;
