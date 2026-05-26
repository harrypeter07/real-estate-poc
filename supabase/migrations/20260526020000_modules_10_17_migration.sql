-- ============================================================
-- MODULES 10-17 — FINAL CONFLICT-FREE MIGRATION
-- Verified against actual DB schema — May 2026
-- ============================================================
-- FINAL AUDIT (what actually exists vs what's needed):
--
-- businesses            ✅ COMPLETE — id,name,status,display_name,tagline,
--                          address,phone,email,gst_number,pan_number,
--                          receipt_footer,logo_path — NO ALTER needed
-- business_modules      ✅ COMPLETE — NO ALTER needed
-- modules               ✅ COMPLETE — NO ALTER needed
-- reminders             ✅ COMPLETE — already has sale_id,project_id,business_id
--                          only missing: reminder_type,reference_id,
--                          reference_type,is_sent,sent_at,created_by
-- office_expenses       ✅ HAS category enum, expense_date, project_id
--                          MISSING: status,bill_path,approved_by,approved_at,
--                          rejected_reason,vendor_name,invoice_number
-- advisor_commissions   ✅ HAS 12 cols
--                          MISSING: sub_advisor_id,sub_advisor_split_pct,
--                          hold_status,hold_reason,held_at,released_at,
--                          auto_calculated
-- projects              ✅ FULLY COMPLETE — NO ALTER needed
-- superadmin_audit_logs ✅ COMPLETE — NO ALTER needed
-- ============================================================
 
 
-- ============================================================
-- STEP 1: ENUM TYPES (all safe with duplicate check)
-- ============================================================
 
DO $$ BEGIN
  CREATE TYPE commission_hold_reason AS ENUM (
    'dispute', 'pending_kyc', 'manual_hold', 'policy_violation', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
 
DO $$ BEGIN
  CREATE TYPE commission_ledger_type AS ENUM (
    'earned', 'paid', 'held', 'released', 'adjusted', 'reversed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
 
DO $$ BEGIN
  CREATE TYPE expense_status AS ENUM (
    'pending', 'approved', 'rejected', 'paid'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
 
DO $$ BEGIN
  CREATE TYPE announcement_type AS ENUM (
    'general', 'payment_reminder', 'follow_up_reminder',
    'alert', 'policy', 'whatsapp'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
 
DO $$ BEGIN
  CREATE TYPE recovery_stage AS ENUM (
    'reminder', 'follow_up', 'warning', 'legal_notice'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
 
DO $$ BEGIN
  CREATE TYPE promise_status AS ENUM (
    'pending', 'kept', 'broken', 'rescheduled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
 
DO $$ BEGIN
  CREATE TYPE legal_stage AS ENUM (
    'notice_sent', 'response_received', 'court_filed',
    'settled', 'withdrawn', 'pending'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
 
DO $$ BEGIN
  CREATE TYPE export_format AS ENUM ('excel', 'pdf', 'csv');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
 
DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM (
    'pending', 'approved', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
 
 
-- ============================================================
-- MODULE 10: COMMISSIONS
-- ALTER advisor_commissions — add 7 missing columns only
-- ============================================================
 
ALTER TABLE public.advisor_commissions
  ADD COLUMN IF NOT EXISTS sub_advisor_id        UUID REFERENCES public.advisors(id),
  ADD COLUMN IF NOT EXISTS sub_advisor_split_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hold_status           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hold_reason           commission_hold_reason,
  ADD COLUMN IF NOT EXISTS held_at               TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS released_at           TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS auto_calculated       BOOLEAN DEFAULT true;
 
CREATE INDEX IF NOT EXISTS idx_ac_sub_advisor ON public.advisor_commissions(sub_advisor_id);
CREATE INDEX IF NOT EXISTS idx_ac_hold_status ON public.advisor_commissions(hold_status);
 
-- commission_holds table
CREATE TABLE IF NOT EXISTS public.commission_holds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES public.advisor_commissions(id) ON DELETE CASCADE,
  advisor_id    UUID NOT NULL REFERENCES public.advisors(id),
  business_id   UUID REFERENCES public.businesses(id),
  held_by       UUID REFERENCES public.business_admins(id),
  hold_reason   commission_hold_reason NOT NULL,
  hold_notes    TEXT,
  held_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  released_by   UUID REFERENCES public.business_admins(id),
  release_notes TEXT,
  released_at   TIMESTAMP WITH TIME ZONE,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_hold_commission_id ON public.commission_holds(commission_id);
CREATE INDEX IF NOT EXISTS idx_hold_advisor_id    ON public.commission_holds(advisor_id);
CREATE INDEX IF NOT EXISTS idx_hold_business_id   ON public.commission_holds(business_id);
CREATE INDEX IF NOT EXISTS idx_hold_is_active     ON public.commission_holds(is_active);
 
-- commission_ledger table
CREATE TABLE IF NOT EXISTS public.commission_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id      UUID NOT NULL REFERENCES public.advisors(id),
  business_id     UUID REFERENCES public.businesses(id),
  commission_id   UUID REFERENCES public.advisor_commissions(id),
  payment_id      UUID REFERENCES public.advisor_commission_payments(id),
  ledger_type     commission_ledger_type NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  running_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  description     TEXT,
  reference_id    UUID,
  reference_type  TEXT,
  created_by      UUID REFERENCES public.business_admins(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_ledger_advisor_id    ON public.commission_ledger(advisor_id);
CREATE INDEX IF NOT EXISTS idx_ledger_business_id   ON public.commission_ledger(business_id);
CREATE INDEX IF NOT EXISTS idx_ledger_commission_id ON public.commission_ledger(commission_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type          ON public.commission_ledger(ledger_type);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at    ON public.commission_ledger(created_at);
 
 
-- ============================================================
-- MODULE 11: EXPENSES
-- office_expenses already has: id, description, amount,
-- expense_date, category(enum), receipt_note, receipt_path,
-- created_at, updated_at, project_id, payment_type,
-- paid_amount, business_id
-- ONLY add truly missing columns
-- ============================================================
 
ALTER TABLE public.office_expenses
  ADD COLUMN IF NOT EXISTS status          expense_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS bill_path       TEXT,
  ADD COLUMN IF NOT EXISTS approved_by     UUID REFERENCES public.business_admins(id),
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS vendor_name     TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number  TEXT;
 
CREATE INDEX IF NOT EXISTS idx_expense_status     ON public.office_expenses(status);
CREATE INDEX IF NOT EXISTS idx_expense_project_id ON public.office_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expense_date       ON public.office_expenses(expense_date);
 
-- expense_approvals — workflow log
CREATE TABLE IF NOT EXISTS public.expense_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID NOT NULL REFERENCES public.office_expenses(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id),
  action      expense_status NOT NULL,
  actioned_by UUID REFERENCES public.business_admins(id),
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_exp_approval_expense_id  ON public.expense_approvals(expense_id);
CREATE INDEX IF NOT EXISTS idx_exp_approval_business_id ON public.expense_approvals(business_id);
 
 
-- ============================================================
-- MODULE 12: MESSAGING
-- reminders already has: id, title, type, phone, description,
-- reminder_date, reminder_time, customer_id, is_completed,
-- created_at, updated_at, sale_id, project_id, business_id
-- ONLY add truly missing columns
-- ============================================================
 
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS reminder_type  TEXT DEFAULT 'follow_up',
  ADD COLUMN IF NOT EXISTS reference_id   UUID,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,
  ADD COLUMN IF NOT EXISTS is_sent        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sent_at        TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS created_by     UUID REFERENCES public.business_admins(id);
 
CREATE INDEX IF NOT EXISTS idx_reminder_type       ON public.reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminder_is_sent    ON public.reminders(is_sent);
 
-- internal_announcements
CREATE TABLE IF NOT EXISTS public.internal_announcements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by        UUID REFERENCES public.business_admins(id),
  announcement_type announcement_type NOT NULL DEFAULT 'general',
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  target_roles      TEXT[],
  target_admin_ids  UUID[],
  is_pinned         BOOLEAN DEFAULT false,
  expires_at        TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_announcement_business_id ON public.internal_announcements(business_id);
CREATE INDEX IF NOT EXISTS idx_announcement_type        ON public.internal_announcements(announcement_type);
CREATE INDEX IF NOT EXISTS idx_announcement_created_at  ON public.internal_announcements(created_at);
 
-- announcement_reads
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.internal_announcements(id) ON DELETE CASCADE,
  admin_id        UUID NOT NULL REFERENCES public.business_admins(id),
  read_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, admin_id)
);
 
CREATE INDEX IF NOT EXISTS idx_ann_read_announcement ON public.announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_ann_read_admin        ON public.announcement_reads(admin_id);
CREATE INDEX IF NOT EXISTS idx_ann_read_business_id  ON public.announcement_reads(business_id);
 
-- whatsapp_share_log
CREATE TABLE IF NOT EXISTS public.whatsapp_share_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID REFERENCES public.businesses(id),
  shared_by      UUID REFERENCES public.business_admins(id),
  share_type     TEXT NOT NULL,
  reference_id   UUID,
  reference_type TEXT,
  phone_number   TEXT NOT NULL,
  message_text   TEXT,
  shared_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_wa_log_business_id ON public.whatsapp_share_log(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_log_shared_by   ON public.whatsapp_share_log(shared_by);
CREATE INDEX IF NOT EXISTS idx_wa_log_shared_at   ON public.whatsapp_share_log(shared_at);
 
 
-- ============================================================
-- MODULE 13: HR
-- hr_employees already has: id, name, employee_code, phone,
-- staff_role, salary_type, salary_rate, overtime_rate,
-- required_hours_per_week, grace_hours, deduction_enabled,
-- created_at, updated_at, birth_date, business_id
-- ONLY add truly missing columns
-- ============================================================
 
ALTER TABLE public.hr_employees
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS email         TEXT,
  ADD COLUMN IF NOT EXISTS address       TEXT,
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auth_user_id  UUID,
  ADD COLUMN IF NOT EXISTS profile_photo TEXT,
  ADD COLUMN IF NOT EXISTS joining_date  DATE,
  ADD COLUMN IF NOT EXISTS exit_date     DATE;
 
CREATE INDEX IF NOT EXISTS idx_hr_emp_is_active   ON public.hr_employees(is_active);
CREATE INDEX IF NOT EXISTS idx_hr_emp_department  ON public.hr_employees(department_id);
 
-- hr_departments
CREATE TABLE IF NOT EXISTS public.hr_departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  head_id     UUID REFERENCES public.hr_employees(id),
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_dept_business_id ON public.hr_departments(business_id);
 
-- Add FK from hr_employees.department_id → hr_departments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_hr_emp_department'
      AND table_name = 'hr_employees'
  ) THEN
    ALTER TABLE public.hr_employees
      ADD CONSTRAINT fk_hr_emp_department
      FOREIGN KEY (department_id) REFERENCES public.hr_departments(id);
  END IF;
END $$;
 
-- hr_leave_requests
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  business_id     UUID REFERENCES public.businesses(id),
  leave_from      DATE NOT NULL,
  leave_to        DATE NOT NULL,
  leave_days      INTEGER NOT NULL DEFAULT 1,
  leave_type      TEXT NOT NULL DEFAULT 'casual',
  reason          TEXT,
  status          leave_status NOT NULL DEFAULT 'pending',
  approved_by     UUID REFERENCES public.business_admins(id),
  approved_at     TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_leave_employee_id ON public.hr_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_business_id ON public.hr_leave_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_leave_status      ON public.hr_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_dates       ON public.hr_leave_requests(leave_from, leave_to);
 
 
-- ============================================================
-- MODULE 14: REPORTS
-- ============================================================
 
CREATE TABLE IF NOT EXISTS public.report_exports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES public.businesses(id),
  generated_by  UUID REFERENCES public.business_admins(id),
  report_type   TEXT NOT NULL,
  format        export_format NOT NULL DEFAULT 'excel',
  filters       JSONB,
  file_path     TEXT,
  file_name     TEXT,
  row_count     INTEGER,
  status        TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_report_business_id ON public.report_exports(business_id);
CREATE INDEX IF NOT EXISTS idx_report_type        ON public.report_exports(report_type);
CREATE INDEX IF NOT EXISTS idx_report_created_at  ON public.report_exports(created_at);
 
 
-- ============================================================
-- MODULE 15: RECOVERY
-- ============================================================
 
-- recovery_notes
CREATE TABLE IF NOT EXISTS public.recovery_notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID REFERENCES public.businesses(id),
  customer_id    UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id        UUID REFERENCES public.plot_sales(id),
  added_by       UUID REFERENCES public.business_admins(id),
  recovery_stage recovery_stage NOT NULL DEFAULT 'reminder',
  note           TEXT NOT NULL,
  follow_up_date DATE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_rec_note_customer_id ON public.recovery_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_rec_note_business_id ON public.recovery_notes(business_id);
CREATE INDEX IF NOT EXISTS idx_rec_note_stage       ON public.recovery_notes(recovery_stage);
 
-- promise_to_pay
CREATE TABLE IF NOT EXISTS public.promise_to_pay (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID REFERENCES public.businesses(id),
  customer_id        UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id            UUID REFERENCES public.plot_sales(id),
  emi_id             UUID REFERENCES public.emi_schedule(id),
  promised_amount    NUMERIC(12,2) NOT NULL,
  promised_date      DATE NOT NULL,
  actual_paid_date   DATE,
  actual_paid_amount NUMERIC(12,2),
  status             promise_status NOT NULL DEFAULT 'pending',
  recorded_by        UUID REFERENCES public.business_admins(id),
  notes              TEXT,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_ptp_customer_id  ON public.promise_to_pay(customer_id);
CREATE INDEX IF NOT EXISTS idx_ptp_business_id  ON public.promise_to_pay(business_id);
CREATE INDEX IF NOT EXISTS idx_ptp_status       ON public.promise_to_pay(status);
CREATE INDEX IF NOT EXISTS idx_ptp_promise_date ON public.promise_to_pay(promised_date);
 
-- legal_escalations
CREATE TABLE IF NOT EXISTS public.legal_escalations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID REFERENCES public.businesses(id),
  customer_id      UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id          UUID REFERENCES public.plot_sales(id),
  escalated_by     UUID REFERENCES public.business_admins(id),
  legal_stage      legal_stage NOT NULL DEFAULT 'pending',
  total_overdue    NUMERIC(12,2) NOT NULL,
  notice_sent_date DATE,
  notice_reference TEXT,
  lawyer_name      TEXT,
  lawyer_contact   TEXT,
  court_date       DATE,
  case_number      TEXT,
  resolution_notes TEXT,
  is_resolved      BOOLEAN DEFAULT false,
  resolved_at      TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_legal_customer_id ON public.legal_escalations(customer_id);
CREATE INDEX IF NOT EXISTS idx_legal_business_id ON public.legal_escalations(business_id);
CREATE INDEX IF NOT EXISTS idx_legal_stage       ON public.legal_escalations(legal_stage);
CREATE INDEX IF NOT EXISTS idx_legal_is_resolved ON public.legal_escalations(is_resolved);
 
 
-- ============================================================
-- MODULE 17: BUSINESS SETTINGS
-- businesses already has all needed cols — NO ALTER needed
-- ============================================================
 
-- business_settings — JSONB config store
CREATE TABLE IF NOT EXISTS public.business_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  section     TEXT NOT NULL,
  settings    JSONB NOT NULL DEFAULT '{}',
  updated_by  UUID REFERENCES public.business_admins(id),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, section)
);
 
CREATE INDEX IF NOT EXISTS idx_biz_settings_business_id ON public.business_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_biz_settings_section     ON public.business_settings(section);
 
-- role_permissions — module access per role
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role_name   TEXT NOT NULL,
  module_key  TEXT NOT NULL,
  can_view    BOOLEAN DEFAULT false,
  can_create  BOOLEAN DEFAULT false,
  can_edit    BOOLEAN DEFAULT false,
  can_delete  BOOLEAN DEFAULT false,
  can_export  BOOLEAN DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, role_name, module_key)
);
 
CREATE INDEX IF NOT EXISTS idx_role_perm_business_id ON public.role_permissions(business_id);
CREATE INDEX IF NOT EXISTS idx_role_perm_role        ON public.role_permissions(role_name);
 
-- Seed default business_settings for existing businesses
-- (only inserts if not already present)
INSERT INTO public.business_settings (business_id, section, settings)
SELECT
  b.id,
  s.section,
  s.settings::jsonb
FROM public.businesses b
CROSS JOIN (VALUES
  ('company',
   '{"logo_url":null,"gst_number":null,"pan_number":null,"address":null,"primary_color":"#3B82F6","secondary_color":"#1E40AF"}'),
  ('crm',
   '{"lead_stages":["new","contacted","follow_up","site_visit","negotiation","converted","lost"],"lead_sources":["website","referral","walk_in","social_media","advertisement","advisor","exhibition","other"],"site_visit_required":false,"auto_assign_advisor":false}'),
  ('financial',
   '{"emi_templates":[],"commission_defaults":{"token":2,"agreement":2,"registry":1,"full_payment":1},"penalty_per_day":0,"penalty_grace_days":5,"receipt_prefix":"REC"}'),
  ('notifications',
   '{"emi_reminder_days_before":3,"follow_up_alert":true,"overdue_alert":true,"daily_digest":false}')
) AS s(section, settings)
ON CONFLICT (business_id, section) DO NOTHING;
 
-- Seed default role_permissions for existing businesses
INSERT INTO public.role_permissions
  (business_id, role_name, module_key, can_view, can_create, can_edit, can_delete, can_export)
SELECT
  b.id,
  r.role_name,
  m.module_key,
  r.can_view, r.can_create, r.can_edit, r.can_delete, r.can_export
FROM public.businesses b
CROSS JOIN (VALUES
  ('admin',    true,  true,  true,  true,  true),
  ('sales',    true,  true,  true,  false, false),
  ('recovery', true,  true,  true,  false, false),
  ('accounts', true,  true,  true,  false, true),
  ('legal',    true,  false, false, false, false),
  ('hr',       true,  true,  true,  false, false)
) AS r(role_name, can_view, can_create, can_edit, can_delete, can_export)
CROSS JOIN (VALUES
  ('dashboard'), ('enquiries'), ('sales'), ('payments'),
  ('commissions'), ('expenses'), ('messaging'), ('hr'),
  ('reports'), ('recovery'), ('advisors'), ('settings')
) AS m(module_key)
ON CONFLICT (business_id, role_name, module_key) DO NOTHING;
 
 
-- ============================================================
-- TRIGGERS — updated_at for all new tables
-- ============================================================
 
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
 
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'commission_holds',
    'expense_approvals',
    'internal_announcements',
    'hr_departments',
    'hr_leave_requests',
    'recovery_notes',
    'promise_to_pay',
    'legal_escalations',
    'business_settings',
    'role_permissions'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%s;
       CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON public.%s
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      t, t, t, t
    );
  END LOOP;
END $$;
 
 
-- ============================================================
-- RLS POLICIES
-- ============================================================
 
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'commission_holds',
    'commission_ledger',
    'expense_approvals',
    'internal_announcements',
    'announcement_reads',
    'whatsapp_share_log',
    'hr_departments',
    'hr_leave_requests',
    'report_exports',
    'recovery_notes',
    'promise_to_pay',
    'legal_escalations',
    'business_settings',
    'role_permissions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS %s_tenant_access ON public.%s;
       CREATE POLICY %s_tenant_access ON public.%s
         FOR ALL TO authenticated
         USING (public.is_superadmin() OR business_id = public.app_business_id())
         WITH CHECK (public.is_superadmin() OR business_id = public.app_business_id());',
      t, t, t, t
    );
  END LOOP;
END $$;
 
 
-- ============================================================
-- DAILY CRON FUNCTION — auto-escalate overdue promises
-- Call via pg_cron: SELECT fn_check_broken_promises();
-- ============================================================
 
CREATE OR REPLACE FUNCTION fn_check_broken_promises()
RETURNS void AS $$
BEGIN
  UPDATE public.promise_to_pay
  SET status = 'broken', updated_at = NOW()
  WHERE status = 'pending'
    AND promised_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
 
 
-- ============================================================
-- FINAL SUMMARY OF CHANGES
-- ============================================================
-- Tables ALTERED (columns added safely with IF NOT EXISTS):
--   advisor_commissions  → +7 cols
--   office_expenses      → +7 cols
--   reminders            → +6 cols
--   hr_employees         → +8 cols
--
-- Tables CREATED (14 new tables):
--   commission_holds
--   commission_ledger
--   expense_approvals
--   internal_announcements
--   announcement_reads
--   whatsapp_share_log
--   hr_departments
--   hr_leave_requests
--   report_exports
--   recovery_notes
--   promise_to_pay
--   legal_escalations
--   business_settings    (+ seeded with defaults)
--   role_permissions     (+ seeded with defaults)
--
-- Tables SKIPPED (already complete — no changes):
--   businesses, business_modules, modules, projects,
--   superadmin_audit_logs, hr_attendance,
--   hr_employee_payouts, hr_payout_batches,
--   staff, staff_attendance
-- ============================================================
