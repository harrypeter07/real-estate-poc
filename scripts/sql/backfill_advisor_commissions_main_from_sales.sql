-- One-time backfill: create a MAIN advisor_commissions row for advisor sales that have none.
-- Profit = total_sale_amount - (plot.size_sqft * plot.rate_per_sqft). Sub-advisor rows are NOT inferred (add manually if needed).
--
-- Run in SQL editor after review. Adjust business_id if your tenant model requires it.

INSERT INTO public.advisor_commissions (
  business_id,
  advisor_id,
  sale_id,
  commission_percentage,
  total_commission_amount,
  amount_paid,
  notes
)
SELECT
  ps.business_id,
  ps.advisor_id,
  ps.id,
  0,
  GREATEST(
    0,
    ROUND(
      (COALESCE(ps.total_sale_amount, 0)::numeric
        - (COALESCE(pl.size_sqft, 0) * COALESCE(pl.rate_per_sqft, 0))::numeric),
      2
    )
  ),
  0,
  'Backfill: estimated profit-share (main). Review amount if advisor rate differed from plot base.'
FROM public.plot_sales ps
INNER JOIN public.plots pl ON pl.id = ps.plot_id
WHERE COALESCE(ps.sold_by_admin, false) = false
  AND ps.advisor_id IS NOT NULL
  AND COALESCE(ps.is_cancelled, false) = false
  AND ps.business_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.advisor_commissions ac
    WHERE ac.sale_id = ps.id
      AND ac.advisor_id = ps.advisor_id
  );

-- Verify counts
-- SELECT COUNT(*) FROM advisor_commissions WHERE notes LIKE 'Backfill:%';
