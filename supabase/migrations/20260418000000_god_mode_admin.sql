/*
  LOXER God Mode Admin
  - Feature flags
  - IP block list
  - Broadcast campaigns
  - Moderation queue
  - Analytics snapshots
  - Admin sessions
*/

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  rollout_pct integer NOT NULL DEFAULT 100 CHECK (rollout_pct BETWEEN 0 AND 100),
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.feature_flags (key, label, description, enabled, rollout_pct)
VALUES
  ('maintenance_mode', 'Maintenance Mode', 'Show maintenance page to non-admin users', false, 100),
  ('ai_job_scoring', 'AI Job Scoring', 'Enable ML quality score on jobs', true, 100),
  ('employer_verification', 'Employer Verification', 'Require manual verification for new companies', true, 100),
  ('new_seeker_ui', 'New Seeker Dashboard', 'Rollout seeker UI bertahap', false, 0),
  ('api_rate_limiting', 'API Rate Limiting', 'Enable tighter API guardrails', true, 100)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ip_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  reason text DEFAULT '',
  blocked_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_blocks_ip_address ON public.ip_blocks(ip_address);

CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'push', 'in_app')),
  audience text NOT NULL CHECK (audience IN ('all', 'seekers', 'employers', 'verified_employers', 'inactive')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('job', 'company', 'user', 'application')),
  entity_id uuid NOT NULL,
  reason text NOT NULL,
  ai_score numeric(4,2),
  ai_flags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_entity ON public.moderation_queue(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  total_users integer NOT NULL DEFAULT 0,
  new_users integer NOT NULL DEFAULT 0,
  active_users integer NOT NULL DEFAULT 0,
  total_jobs integer NOT NULL DEFAULT 0,
  new_jobs integer NOT NULL DEFAULT 0,
  total_apps integer NOT NULL DEFAULT 0,
  new_apps integer NOT NULL DEFAULT 0,
  conversion_rate numeric(5,2) NOT NULL DEFAULT 0,
  avg_time_to_hire numeric(6,1) NOT NULL DEFAULT 0,
  platform_score numeric(5,1) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  impersonating uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_select_feature_flags ON public.feature_flags;
CREATE POLICY admin_select_feature_flags ON public.feature_flags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_insert_feature_flags ON public.feature_flags;
CREATE POLICY admin_insert_feature_flags ON public.feature_flags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_update_feature_flags ON public.feature_flags;
CREATE POLICY admin_update_feature_flags ON public.feature_flags
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_delete_feature_flags ON public.feature_flags;
CREATE POLICY admin_delete_feature_flags ON public.feature_flags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_select_ip_blocks ON public.ip_blocks;
CREATE POLICY admin_select_ip_blocks ON public.ip_blocks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_insert_ip_blocks ON public.ip_blocks;
CREATE POLICY admin_insert_ip_blocks ON public.ip_blocks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_delete_ip_blocks ON public.ip_blocks;
CREATE POLICY admin_delete_ip_blocks ON public.ip_blocks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_select_broadcast_campaigns ON public.broadcast_campaigns;
CREATE POLICY admin_select_broadcast_campaigns ON public.broadcast_campaigns
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_insert_broadcast_campaigns ON public.broadcast_campaigns;
CREATE POLICY admin_insert_broadcast_campaigns ON public.broadcast_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_update_broadcast_campaigns ON public.broadcast_campaigns;
CREATE POLICY admin_update_broadcast_campaigns ON public.broadcast_campaigns
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_select_moderation_queue ON public.moderation_queue;
CREATE POLICY admin_select_moderation_queue ON public.moderation_queue
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_insert_moderation_queue ON public.moderation_queue;
CREATE POLICY admin_insert_moderation_queue ON public.moderation_queue
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_update_moderation_queue ON public.moderation_queue;
CREATE POLICY admin_update_moderation_queue ON public.moderation_queue
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_select_analytics_snapshots ON public.analytics_snapshots;
CREATE POLICY admin_select_analytics_snapshots ON public.analytics_snapshots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_insert_analytics_snapshots ON public.analytics_snapshots;
CREATE POLICY admin_insert_analytics_snapshots ON public.analytics_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_update_analytics_snapshots ON public.analytics_snapshots;
CREATE POLICY admin_update_analytics_snapshots ON public.analytics_snapshots
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_select_admin_sessions ON public.admin_sessions;
CREATE POLICY admin_select_admin_sessions ON public.admin_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_insert_admin_sessions ON public.admin_sessions;
CREATE POLICY admin_insert_admin_sessions ON public.admin_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_update_admin_sessions ON public.admin_sessions;
CREATE POLICY admin_update_admin_sessions ON public.admin_sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );
