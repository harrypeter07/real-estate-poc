-- Business logo for receipts / PDFs (path in storage bucket)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS logo_path TEXT;

COMMENT ON COLUMN public.businesses.logo_path IS 'Storage path for business logo (JPEG recommended for PDFs).';

