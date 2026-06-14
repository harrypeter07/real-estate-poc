-- Migration to create user_modules table for user-specific module overrides

CREATE TABLE IF NOT EXISTS public.user_modules (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL, -- references auth.users.id
  module_key TEXT NOT NULL REFERENCES public.modules(key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (auth_user_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_user_modules_business ON public.user_modules (business_id);
CREATE INDEX IF NOT EXISTS idx_user_modules_user ON public.user_modules (auth_user_id);

-- Enable RLS
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

-- Superadmin policy
DROP POLICY IF EXISTS user_modules_superadmin_all ON public.user_modules;
CREATE POLICY user_modules_superadmin_all ON public.user_modules
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Read own policy
DROP POLICY IF EXISTS user_modules_read_own ON public.user_modules;
CREATE POLICY user_modules_read_own ON public.user_modules
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);
