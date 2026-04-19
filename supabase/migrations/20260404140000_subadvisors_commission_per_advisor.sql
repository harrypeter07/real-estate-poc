-- Sub-advisors: parent link on advisors.
-- Multiple commission rows per sale (one per advisor participant).

ALTER TABLE public.advisors
  ADD COLUMN IF NOT EXISTS parent_advisor_id UUID REFERENCES public.advisors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_advisors_parent_advisor_id
  ON public.advisors (parent_advisor_id);

-- Replace global unique(sale_id) with (sale_id, advisor_id) for split commissions.
ALTER TABLE public.advisor_commissions
  DROP CONSTRAINT IF EXISTS advisor_commissions_sale_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS advisor_commissions_sale_id_advisor_id_key
  ON public.advisor_commissions (sale_id, advisor_id);
