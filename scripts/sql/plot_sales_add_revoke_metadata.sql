-- Adds revoke metadata fields to plot_sales
-- Run this once before using the revoke UI/actions.

ALTER TABLE plot_sales
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE plot_sales
  ADD COLUMN IF NOT EXISTS revoked_by TEXT;

