-- Pipeline stage for CRM
DO $$ BEGIN
  CREATE TYPE enquiry_pipeline_stage AS ENUM (
    'new', 'contacted', 'follow_up', 'site_visit',
    'negotiation', 'converted', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Lead source
DO $$ BEGIN
  CREATE TYPE lead_source_type AS ENUM (
    'website', 'referral', 'social_media', 'walk_in',
    'phone_call', 'advertisement', 'advisor', 'exhibition', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Site visit status
DO $$ BEGIN
  CREATE TYPE site_visit_status AS ENUM (
    'scheduled', 'completed', 'cancelled', 'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- EMI status
DO $$ BEGIN
  CREATE TYPE emi_status AS ENUM (
    'pending', 'paid', 'partial', 'overdue', 'waived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Due risk level
DO $$ BEGIN
  CREATE TYPE due_risk_level AS ENUM (
    'upcoming', 'delayed', 'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Penalty type
DO $$ BEGIN
  CREATE TYPE penalty_type AS ENUM (
    'late_payment', 'cancellation', 'bounced_cheque', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: ALTER existing tables — Add missing columns
ALTER TABLE public.enquiry_customers
  ADD COLUMN IF NOT EXISTS pipeline_stage    enquiry_pipeline_stage NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS lead_source       lead_source_type DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS lost_reason       TEXT,
  ADD COLUMN IF NOT EXISTS site_visit_count  INTEGER NOT NULL DEFAULT 0;

-- Migrate existing enquiry_status values to pipeline_stage where possible
UPDATE public.enquiry_customers
SET pipeline_stage = CASE
  WHEN enquiry_status = 'new'         THEN 'new'::enquiry_pipeline_stage
  WHEN enquiry_status = 'contacted'   THEN 'contacted'::enquiry_pipeline_stage
  WHEN enquiry_status = 'follow_up'   THEN 'follow_up'::enquiry_pipeline_stage
  WHEN enquiry_status = 'site_visit'  THEN 'site_visit'::enquiry_pipeline_stage
  WHEN enquiry_status = 'negotiation' THEN 'negotiation'::enquiry_pipeline_stage
  WHEN enquiry_status = 'converted'   THEN 'converted'::enquiry_pipeline_stage
  WHEN enquiry_status = 'lost'        THEN 'lost'::enquiry_pipeline_stage
  ELSE 'new'::enquiry_pipeline_stage
END
WHERE pipeline_stage = 'new';

-- plot_sales: add discount + cancellation fields
ALTER TABLE public.plot_sales
  ADD COLUMN IF NOT EXISTS discount_amount       NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_approved_by  UUID REFERENCES public.business_admins(id),
  ADD COLUMN IF NOT EXISTS discount_reason       TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason   TEXT,
  ADD COLUMN IF NOT EXISTS lead_source           lead_source_type DEFAULT 'other';

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_enquiry_pipeline_stage ON public.enquiry_customers(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_enquiry_lead_source    ON public.enquiry_customers(lead_source);
CREATE INDEX IF NOT EXISTS idx_plot_sales_lead_source ON public.plot_sales(lead_source);

-- Step 3: Create enquiry_follow_ups Table
CREATE TABLE IF NOT EXISTS public.enquiry_follow_ups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id        UUID NOT NULL REFERENCES public.enquiry_customers(id) ON DELETE CASCADE,
  business_id       UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  followed_by       UUID REFERENCES public.business_admins(id),
  follow_up_date    DATE NOT NULL,
  follow_up_time    TIME,
  follow_up_type    TEXT NOT NULL DEFAULT 'call',
  -- call, whatsapp, email, meeting, site_visit
  outcome           TEXT,
  notes             TEXT,
  next_follow_up_date DATE,
  pipeline_stage_at_time enquiry_pipeline_stage,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_enquiry_id  ON public.enquiry_follow_ups(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_business_id ON public.enquiry_follow_ups(business_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_date        ON public.enquiry_follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_followed_by ON public.enquiry_follow_ups(followed_by);

-- Step 4: Create enquiry_site_visits Table
CREATE TABLE IF NOT EXISTS public.enquiry_site_visits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id        UUID NOT NULL REFERENCES public.enquiry_customers(id) ON DELETE CASCADE,
  business_id       UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  project_id        UUID REFERENCES public.projects(id),
  scheduled_date    DATE NOT NULL,
  scheduled_time    TIME,
  actual_visit_date DATE,
  status            site_visit_status NOT NULL DEFAULT 'scheduled',
  conducted_by      UUID REFERENCES public.business_admins(id),
  accompanied_by    TEXT,
  plots_shown       TEXT[],
  customer_feedback TEXT,
  interest_level    INTEGER CHECK (interest_level BETWEEN 1 AND 5),
  -- 1=low, 5=very high
  follow_up_required BOOLEAN DEFAULT true,
  notes             TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visit_enquiry_id  ON public.enquiry_site_visits(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_site_visit_business_id ON public.enquiry_site_visits(business_id);
CREATE INDEX IF NOT EXISTS idx_site_visit_date        ON public.enquiry_site_visits(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_site_visit_status      ON public.enquiry_site_visits(status);

-- Step 5: Create emi_schedule Table
CREATE TABLE IF NOT EXISTS public.emi_schedule (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id           UUID NOT NULL REFERENCES public.plot_sales(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id       UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  emi_number        INTEGER NOT NULL,
  -- 1, 2, 3... sequence
  due_date          DATE NOT NULL,
  emi_amount        NUMERIC(12,2) NOT NULL,
  paid_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount  NUMERIC(12,2) GENERATED ALWAYS AS (emi_amount - paid_amount) STORED,
  status            emi_status NOT NULL DEFAULT 'pending',
  paid_date         DATE,
  payment_id        UUID REFERENCES public.payments(id),
  -- linked payment when paid
  penalty_amount    NUMERIC(12,2) DEFAULT 0,
  waiver_amount     NUMERIC(12,2) DEFAULT 0,
  waiver_reason     TEXT,
  overdue_days      INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN status IN ('pending', 'partial') AND due_date < CURRENT_DATE
      THEN (CURRENT_DATE - due_date)
      ELSE 0
    END
  ) STORED,
  notes             TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sale_id, emi_number)
);

CREATE INDEX IF NOT EXISTS idx_emi_sale_id     ON public.emi_schedule(sale_id);
CREATE INDEX IF NOT EXISTS idx_emi_customer_id ON public.emi_schedule(customer_id);
CREATE INDEX IF NOT EXISTS idx_emi_due_date    ON public.emi_schedule(due_date);
CREATE INDEX IF NOT EXISTS idx_emi_status      ON public.emi_schedule(status);
CREATE INDEX IF NOT EXISTS idx_emi_business_id ON public.emi_schedule(business_id);

-- Step 6: Create payment_penalties Table
CREATE TABLE IF NOT EXISTS public.payment_penalties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES public.plot_sales(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id     UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  emi_id          UUID REFERENCES public.emi_schedule(id) ON DELETE SET NULL,
  penalty_type    penalty_type NOT NULL DEFAULT 'late_payment',
  penalty_amount  NUMERIC(12,2) NOT NULL,
  penalty_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reason          TEXT,
  is_waived       BOOLEAN DEFAULT false,
  waived_by       UUID REFERENCES public.business_admins(id),
  waived_at       TIMESTAMP WITH TIME ZONE,
  waiver_reason   TEXT,
  is_paid         BOOLEAN DEFAULT false,
  paid_date       DATE,
  payment_id      UUID REFERENCES public.payments(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_penalty_sale_id     ON public.payment_penalties(sale_id);
CREATE INDEX IF NOT EXISTS idx_penalty_customer_id ON public.payment_penalties(customer_id);
CREATE INDEX IF NOT EXISTS idx_penalty_business_id ON public.payment_penalties(business_id);
CREATE INDEX IF NOT EXISTS idx_penalty_is_paid     ON public.payment_penalties(is_paid);

-- Step 7: Create due_payment_reminders Table
CREATE TABLE IF NOT EXISTS public.due_payment_reminders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id             UUID NOT NULL REFERENCES public.plot_sales(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id         UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  emi_id              UUID REFERENCES public.emi_schedule(id) ON DELETE CASCADE,
  risk_level          due_risk_level NOT NULL DEFAULT 'upcoming',
  -- upcoming = yellow, delayed = orange, critical = red
  overdue_emis_count  INTEGER NOT NULL DEFAULT 0,
  total_overdue_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_reminder_sent  TIMESTAMP WITH TIME ZONE,
  reminder_count      INTEGER NOT NULL DEFAULT 0,
  next_reminder_date  DATE,
  assigned_to         UUID REFERENCES public.business_admins(id),
  resolution_notes    TEXT,
  is_resolved         BOOLEAN DEFAULT false,
  resolved_at         TIMESTAMP WITH TIME ZONE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_due_reminder_sale_id     ON public.due_payment_reminders(sale_id);
CREATE INDEX IF NOT EXISTS idx_due_reminder_customer_id ON public.due_payment_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_due_reminder_business_id ON public.due_payment_reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_due_reminder_risk_level  ON public.due_payment_reminders(risk_level);
CREATE INDEX IF NOT EXISTS idx_due_reminder_resolved    ON public.due_payment_reminders(is_resolved);

-- Step 8: Auto-update triggers for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'enquiry_follow_ups',
    'enquiry_site_visits',
    'emi_schedule',
    'payment_penalties',
    'due_payment_reminders'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
      CREATE TRIGGER trg_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.enquiry_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry_site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emi_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.due_payment_reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS enquiry_follow_ups_tenant_access ON public.enquiry_follow_ups;
DROP POLICY IF EXISTS enquiry_site_visits_tenant_access ON public.enquiry_site_visits;
DROP POLICY IF EXISTS emi_schedule_tenant_access ON public.emi_schedule;
DROP POLICY IF EXISTS payment_penalties_tenant_access ON public.payment_penalties;
DROP POLICY IF EXISTS due_payment_reminders_tenant_access ON public.due_payment_reminders;

-- Tenant Access Policies
CREATE POLICY enquiry_follow_ups_tenant_access ON public.enquiry_follow_ups
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

CREATE POLICY enquiry_site_visits_tenant_access ON public.enquiry_site_visits
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

CREATE POLICY emi_schedule_tenant_access ON public.emi_schedule
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

CREATE POLICY payment_penalties_tenant_access ON public.payment_penalties
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());

CREATE POLICY due_payment_reminders_tenant_access ON public.due_payment_reminders
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR business_id = public.app_business_id())
  WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());
