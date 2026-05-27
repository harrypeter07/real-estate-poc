-- Step 1: Create Missing ENUM Types
DO $$ BEGIN
  CREATE TYPE kyc_doc_type AS ENUM (
    'aadhaar', 'pan', 'passport', 'voter_id',
    'driving_license', 'bank_passbook', 'photo', 'agreement', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE recovery_status AS ENUM ('pending', 'in_progress', 'recovered', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Create advisor_kyc_documents Table
CREATE TABLE IF NOT EXISTS advisor_kyc_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id          UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  business_id         UUID REFERENCES businesses(id) ON DELETE CASCADE,
  document_type       kyc_doc_type NOT NULL,
  document_number     TEXT,
  file_path           TEXT NOT NULL,
  file_name           TEXT,
  file_size           INTEGER,
  mime_type           TEXT,
  status              kyc_status NOT NULL DEFAULT 'pending',
  verified_by         UUID REFERENCES business_admins(id),
  verified_at         TIMESTAMP WITH TIME ZONE,
  rejection_reason    TEXT,
  expiry_date         DATE,
  notes               TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisor_kyc_advisor_id   ON advisor_kyc_documents(advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_kyc_business_id  ON advisor_kyc_documents(business_id);
CREATE INDEX IF NOT EXISTS idx_advisor_kyc_status       ON advisor_kyc_documents(status);
CREATE INDEX IF NOT EXISTS idx_advisor_kyc_doc_type     ON advisor_kyc_documents(document_type);

-- Step 3: Create advisor_recovery_tracking Table
CREATE TABLE IF NOT EXISTS advisor_recovery_tracking (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id            UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  business_id           UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  sale_id               UUID,
  total_due_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  recovered_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_amount        NUMERIC(12,2) GENERATED ALWAYS AS (total_due_amount - recovered_amount) STORED,
  recovery_status       recovery_status NOT NULL DEFAULT 'pending',
  due_date              DATE,
  last_follow_up_date   DATE,
  next_follow_up_date   DATE,
  follow_up_count       INTEGER NOT NULL DEFAULT 0,
  recovery_notes        TEXT,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_advisor_id   ON advisor_recovery_tracking(advisor_id);
CREATE INDEX IF NOT EXISTS idx_recovery_business_id  ON advisor_recovery_tracking(business_id);
CREATE INDEX IF NOT EXISTS idx_recovery_customer_id  ON advisor_recovery_tracking(customer_id);
CREATE INDEX IF NOT EXISTS idx_recovery_status       ON advisor_recovery_tracking(recovery_status);
CREATE INDEX IF NOT EXISTS idx_recovery_due_date     ON advisor_recovery_tracking(due_date);

-- Step 4: Auto-update updated_at trigger (apply to both new tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_advisor_kyc_updated_at ON advisor_kyc_documents;
CREATE TRIGGER trg_advisor_kyc_updated_at
  BEFORE UPDATE ON advisor_kyc_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_advisor_recovery_updated_at ON advisor_recovery_tracking;
CREATE TRIGGER trg_advisor_recovery_updated_at
  BEFORE UPDATE ON advisor_recovery_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and add basic policies
ALTER TABLE advisor_kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_recovery_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access" ON advisor_kyc_documents;
CREATE POLICY "Authenticated full access" ON advisor_kyc_documents
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated full access" ON advisor_recovery_tracking;
CREATE POLICY "Authenticated full access" ON advisor_recovery_tracking
  FOR ALL USING (auth.role() = 'authenticated');
