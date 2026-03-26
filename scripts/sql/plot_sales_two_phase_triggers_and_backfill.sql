-- Two-phase workflow + auto status transitions
-- Requirements:
-- - Only two visible phases: token / booking and payment completed / sold
-- - Token -> Sold should happen automatically when remaining becomes 0 via payment triggers
-- - Revoked sales (plot_sales.is_cancelled=true) must return plot status to available
--
-- Run in Supabase SQL editor (or as part of a migration).

BEGIN;

-- 1) Backfill sale_phase + plots.status for existing active sales
--    Canonical rule: remaining_amount <= 0 => full_payment (sold), else => token
UPDATE plot_sales
SET
  sale_phase = CASE
    WHEN remaining_amount <= 0 THEN 'full_payment'::sale_phase
    ELSE 'token'::sale_phase
  END
WHERE is_cancelled = false;

-- Set all plots to available first.
UPDATE plots SET status = 'available';

-- Active token plots
UPDATE plots p
SET status = 'token'
FROM plot_sales ps
WHERE ps.plot_id = p.id
  AND ps.is_cancelled = false
  AND COALESCE(ps.remaining_amount, ps.total_sale_amount) > 0;

-- Active sold plots
UPDATE plots p
SET status = 'sold'
FROM plot_sales ps
WHERE ps.plot_id = p.id
  AND ps.is_cancelled = false
  AND COALESCE(ps.remaining_amount, ps.total_sale_amount) <= 0;

-- 2) Replace plot status trigger to use the 2-phase logic
CREATE OR REPLACE FUNCTION update_plot_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If sale is revoked/cancelled, plot becomes available.
  IF NEW.is_cancelled IS TRUE THEN
    UPDATE plots SET status = 'available' WHERE id = NEW.plot_id;
    RETURN NEW;
  END IF;

  -- Remaining-based guard: remaining <= 0 => sold, otherwise token.
  -- remaining_amount is maintained by update_sale_amounts trigger.
  IF COALESCE(NEW.remaining_amount, 0) <= 0 OR NEW.sale_phase = 'full_payment'::sale_phase THEN
    UPDATE plots SET status = 'sold' WHERE id = NEW.plot_id;
  ELSE
    UPDATE plots SET status = 'token' WHERE id = NEW.plot_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists with the same name (safe if already present).
DROP TRIGGER IF EXISTS trigger_plot_status ON plot_sales;
CREATE TRIGGER trigger_plot_status
AFTER INSERT OR UPDATE ON plot_sales
FOR EACH ROW EXECUTE FUNCTION update_plot_status();

-- 3) Replace update_sale_amounts trigger:
--    Keep plot_sales.amount_paid & remaining_amount updated on payments,
--    and also set sale_phase to token/full_payment based on remaining.
CREATE OR REPLACE FUNCTION update_sale_amounts()
RETURNS TRIGGER AS $$
DECLARE
  sale_total DECIMAL(12,2);
  confirmed_sum DECIMAL(12,2);
  next_remaining DECIMAL(12,2);
BEGIN
  SELECT total_sale_amount INTO sale_total
  FROM plot_sales
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);

  SELECT COALESCE(SUM(amount), 0) INTO confirmed_sum
  FROM payments
  WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
    AND is_confirmed = true;

  next_remaining := sale_total - confirmed_sum;

  UPDATE plot_sales
  SET
    amount_paid = confirmed_sum,
    remaining_amount = next_remaining,
    -- Keep sale_phase unchanged for cancelled sales, otherwise sync it.
    sale_phase = CASE
      WHEN is_cancelled IS TRUE THEN sale_phase
      WHEN next_remaining <= 0 THEN 'full_payment'::sale_phase
      ELSE 'token'::sale_phase
    END
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sale_amounts ON payments;
CREATE TRIGGER trigger_sale_amounts
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION update_sale_amounts();

COMMIT;

