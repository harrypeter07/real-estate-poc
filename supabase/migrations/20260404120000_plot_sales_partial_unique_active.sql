-- Re-sell after revoke: keep the cancelled plot_sales row (payments/history) but allow a new active sale.
-- Replaces UNIQUE(plot_id) with "at most one non-cancelled sale per plot".

ALTER TABLE public.plot_sales DROP CONSTRAINT IF EXISTS plot_sales_plot_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS plot_sales_one_active_sale_per_plot
  ON public.plot_sales (plot_id)
  WHERE NOT COALESCE(is_cancelled, false);
