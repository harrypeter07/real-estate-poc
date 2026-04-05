-- Optional per-advisor breakdown of this customer receipt (reference / ops; sum should match payment amount).
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS advisor_distribution jsonb;

COMMENT ON COLUMN public.payments.advisor_distribution IS
  'JSON array: [{ "advisor_id": "<uuid>", "amount": <number> }, ...] — optional split of this payment.';
