-- Login brute-force throttling (server-only via service role; no client access)
CREATE TABLE IF NOT EXISTS public.login_throttle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  failed_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_throttle_key_hash ON public.login_throttle (key_hash);

ALTER TABLE public.login_throttle ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.login_throttle FROM PUBLIC;
REVOKE ALL ON public.login_throttle FROM anon;
REVOKE ALL ON public.login_throttle FROM authenticated;
GRANT ALL ON public.login_throttle TO service_role;

COMMENT ON TABLE public.login_throttle IS 'Failed sign-in counters; accessed only with Supabase service role from app server.';
