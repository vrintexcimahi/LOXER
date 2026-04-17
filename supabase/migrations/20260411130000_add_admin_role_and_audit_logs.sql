/*
  LOXER Admin Upgrade
  - Add admin role support
  - Add users_meta.is_banned
  - Add audit_logs table + RLS
  - Add admin helper policies
*/

-- 1) Extend users_meta role constraint to include admin
ALTER TABLE public.users_meta
  DROP CONSTRAINT IF EXISTS users_meta_role_check;

ALTER TABLE public.users_meta
  ADD CONSTRAINT users_meta_role_check
  CHECK (role IN ('seeker', 'employer', 'admin'));

-- 2) Add users_meta is_banned flag
ALTER TABLE public.users_meta
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- 3) Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_only_select ON public.audit_logs;
CREATE POLICY admin_only_select ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_only_insert ON public.audit_logs;
CREATE POLICY admin_only_insert ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_users_meta_is_banned ON public.users_meta(is_banned);

-- 5) Admin helper policy for users_meta
DROP POLICY IF EXISTS admin_read_all_users ON public.users_meta;
CREATE POLICY admin_read_all_users ON public.users_meta
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

-- 6) Admin helper policy for companies updates
DROP POLICY IF EXISTS admin_update_companies ON public.companies;
CREATE POLICY admin_update_companies ON public.companies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );
