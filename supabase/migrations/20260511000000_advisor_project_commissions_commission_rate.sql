-- App writes advisor_project_commissions.commission_rate (₹/sqft selling price for advisor on project).
-- Older schema only had per-phase columns; align DB with app/actions/advisor-projects.ts

ALTER TABLE public.advisor_project_commissions
  ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.advisor_project_commissions.commission_rate IS
  'Advisor selling rate for this project (₹/sqft). Used by assignment UI and sales; legacy reads may fall back to commission_token.';

-- Best-effort: if data was only stored in commission_token before this column existed
UPDATE public.advisor_project_commissions
SET commission_rate = commission_token
WHERE commission_token IS NOT NULL
  AND commission_token <> 0
  AND commission_rate = 0;
