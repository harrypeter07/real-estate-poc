-- 1. Alter the column type of down_payment_percent to NUMERIC(15,2) (safely widens column capacity, no data loss)
ALTER TABLE public.projects ALTER COLUMN down_payment_percent TYPE NUMERIC(15,2);

-- 2. Rename the column to down_payment_amount to reflect it stores Rupee amounts instead of percentage
ALTER TABLE public.projects RENAME COLUMN down_payment_percent TO down_payment_amount;

-- 3. Force cache reload
NOTIFY pgrst, 'reload schema';
