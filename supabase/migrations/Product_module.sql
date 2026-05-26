-- Add all missing columns
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS amenities TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS nearby_locations TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS internal_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_code TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_link TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'Plot',
  ADD COLUMN IF NOT EXISTS rate_per_sqft NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plc_charges NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registration_charges NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS down_payment_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emi_months INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emi_type TEXT DEFAULT 'Fixed',
  ADD COLUMN IF NOT EXISTS offer_details TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Force cache reload
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects'
AND column_name IN ('amenities','nearby_locations','internal_notes','description')
ORDER BY column_name;

-- Create complete projects table from scratch
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  business_id UUID,
  project_name TEXT NOT NULL,
  project_code TEXT,
  location TEXT DEFAULT '',
  google_maps_link TEXT DEFAULT '',
  project_type TEXT DEFAULT 'Plot',
  total_plots_count INTEGER DEFAULT 0,
  starting_plot_number INTEGER DEFAULT 1,
  layout_expense NUMERIC(15,2) DEFAULT 0,
  starting_price NUMERIC(15,2) DEFAULT 0,
  rate_per_sqft NUMERIC(10,2) DEFAULT 0,
  plc_charges NUMERIC(10,2) DEFAULT 0,
  registration_charges NUMERIC(10,2) DEFAULT 0,
  down_payment_percent NUMERIC(5,2) DEFAULT 0,
  emi_months INTEGER DEFAULT 0,
  emi_type TEXT DEFAULT 'Fixed',
  offer_details TEXT DEFAULT '',
  status TEXT DEFAULT 'Active',
  description TEXT DEFAULT '',
  amenities TEXT DEFAULT '',
  nearby_locations TEXT DEFAULT '',
  internal_notes TEXT DEFAULT ''
);

-- Force cache reload
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects'
ORDER BY ordinal_position;


CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  business_id UUID,
  project_name TEXT NOT NULL,
  project_code TEXT,
  location TEXT DEFAULT '',
  google_maps_link TEXT DEFAULT '',
  project_type TEXT DEFAULT 'Plot',
  total_plots_count INTEGER DEFAULT 0,
  starting_plot_number INTEGER DEFAULT 1,
  layout_expense NUMERIC(15,2) DEFAULT 0,
  starting_price NUMERIC(15,2) DEFAULT 0,
  rate_per_sqft NUMERIC(10,2) DEFAULT 0,
  plc_charges NUMERIC(10,2) DEFAULT 0,
  registration_charges NUMERIC(10,2) DEFAULT 0,
  down_payment_percent NUMERIC(5,2) DEFAULT 0,
  emi_months INTEGER DEFAULT 0,
  emi_type TEXT DEFAULT 'Fixed',
  offer_details TEXT DEFAULT '',
  status TEXT DEFAULT 'Active',
  description TEXT DEFAULT '',
  amenities TEXT DEFAULT '',
  nearby_locations TEXT DEFAULT '',
  internal_notes TEXT DEFAULT ''
);

-- Add missing columns if table already exists
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS amenities TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS nearby_locations TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS internal_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_code TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_link TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'Plot',
  ADD COLUMN IF NOT EXISTS rate_per_sqft NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plc_charges NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registration_charges NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS down_payment_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emi_months INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emi_type TEXT DEFAULT 'Fixed',
  ADD COLUMN IF NOT EXISTS offer_details TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS layout_expense NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starting_plot_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_plots_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starting_price NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS business_id UUID;

NOTIFY pgrst, 'reload schema';

-- Confirm
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects'
ORDER BY ordinal_position;

-- The table has 'name' column, not 'project_name'
-- Add project_name as alias column
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Copy existing name data into project_name
UPDATE public.projects 
SET project_name = name 
WHERE project_name IS NULL AND name IS NOT NULL;

-- Force cache reload
NOTIFY pgrst, 'reload schema';

-- Make old 'name' column auto-filled from project_name
ALTER TABLE public.projects 
  ALTER COLUMN name DROP NOT NULL;

-- Create a trigger to auto-sync name = project_name
CREATE OR REPLACE FUNCTION sync_project_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name = COALESCE(NEW.project_name, NEW.name, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_project_name ON public.projects;
CREATE TRIGGER trg_sync_project_name
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION sync_project_name();

NOTIFY pgrst, 'reload schema';