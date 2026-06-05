-- Migration to add project-specific sub-advisor commission rates and sale-level registry amount

-- 1. Add sub-advisor commission rate to advisor_project_commissions
ALTER TABLE public.advisor_project_commissions
  ADD COLUMN IF NOT EXISTS sub_advisor_commission_rate DECIMAL(5,2) DEFAULT 0;

COMMENT ON COLUMN public.advisor_project_commissions.sub_advisor_commission_rate IS
  'Default commission percentage override for the sub-advisor under this advisor for this project.';

-- 2. Add registry_amount to plot_sales
ALTER TABLE public.plot_sales
  ADD COLUMN IF NOT EXISTS registry_amount DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN public.plot_sales.registry_amount IS
  'Registry fees/charges amount, independent of other EMI/payments, set after all installments are paid.';

-- 3. Update update_sale_amounts trigger function to count registry_amount
CREATE OR REPLACE FUNCTION update_sale_amounts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE plot_sales
  SET
    amount_paid = (
      SELECT COALESCE(SUM(amount), 0)
      FROM payments
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
        AND is_confirmed = true
    ),
    remaining_amount = total_sale_amount + COALESCE(registry_amount, 0) - (
      SELECT COALESCE(SUM(amount), 0)
      FROM payments
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
        AND is_confirmed = true
    ),
    sale_phase = CASE
      WHEN is_cancelled IS TRUE THEN sale_phase
      WHEN (total_sale_amount + COALESCE(registry_amount, 0) - (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
          AND is_confirmed = true
      )) <= 0 THEN 'full_payment'::sale_phase
      ELSE 'token'::sale_phase
    END
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update prevent_sale_overpayment trigger function to count registry_amount
CREATE OR REPLACE FUNCTION prevent_sale_overpayment()
RETURNS TRIGGER AS $$
DECLARE
  sale_total DECIMAL(12,2);
  reg_total DECIMAL(12,2);
  confirmed_sum DECIMAL(12,2);
BEGIN
  IF NEW.is_confirmed IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  SELECT total_sale_amount, COALESCE(registry_amount, 0) INTO sale_total, reg_total
  FROM plot_sales
  WHERE id = NEW.sale_id;

  SELECT COALESCE(SUM(amount), 0) INTO confirmed_sum
  FROM payments
  WHERE sale_id = NEW.sale_id
    AND is_confirmed = true
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF confirmed_sum + COALESCE(NEW.amount, 0) > COALESCE(sale_total, 0) + reg_total THEN
    RAISE EXCEPTION 'Confirmed payments exceed sale total + registry for sale %', NEW.sale_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
