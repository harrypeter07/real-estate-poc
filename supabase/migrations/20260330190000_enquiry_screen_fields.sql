-- Enquiry screen fields (match UI reference)
-- Adds additional CRM attributes to `enquiry_customers` and email to `customers` (optional).

-- Enquiry-specific fields
ALTER TABLE public.enquiry_customers
  ADD COLUMN IF NOT EXISTS email_id TEXT,
  ADD COLUMN IF NOT EXISTS property_type TEXT,
  ADD COLUMN IF NOT EXISTS segment TEXT,
  ADD COLUMN IF NOT EXISTS budget_min DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS budget_max DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS preferred_location TEXT,
  ADD COLUMN IF NOT EXISTS bhk_size_requirement TEXT,
  ADD COLUMN IF NOT EXISTS assigned_advisor_id UUID REFERENCES public.advisors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_enquiry_customers_assigned_advisor
  ON public.enquiry_customers(assigned_advisor_id);

-- Optional: store enquiry email into customers on upgrade
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email TEXT;

