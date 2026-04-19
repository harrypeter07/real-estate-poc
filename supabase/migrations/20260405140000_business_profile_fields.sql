-- Printable business / tenant profile for receipts and branding
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS pan_number TEXT,
  ADD COLUMN IF NOT EXISTS receipt_footer TEXT;

COMMENT ON COLUMN public.businesses.display_name IS 'Shown on receipts; falls back to name if null.';
COMMENT ON COLUMN public.businesses.tagline IS 'Short line under business name on receipts.';
