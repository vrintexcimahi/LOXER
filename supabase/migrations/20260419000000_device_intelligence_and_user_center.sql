/*
  LOXER Device Intelligence & User Data Center
  - Add user_devices table + RLS
  - Add user_preferences table + RLS
  - Add user_activity_logs table + RLS
  - Add indexes for fast lookup and pagination
*/

-- 1) user_devices table
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  ui_profile TEXT NOT NULL DEFAULT 'desktop-standard',
  device_brand TEXT,
  device_model TEXT,
  os_name TEXT,
  os_version TEXT,
  browser_name TEXT,
  browser_version TEXT,
  platform TEXT,
  architecture TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  viewport_width INTEGER,
  viewport_height INTEGER,
  pixel_ratio NUMERIC,
  orientation TEXT,
  touch BOOLEAN NOT NULL DEFAULT FALSE,
  max_touch_points INTEGER DEFAULT 0,
  pointer_type TEXT,
  hover_supported BOOLEAN NOT NULL DEFAULT TRUE,
  pwa BOOLEAN NOT NULL DEFAULT FALSE,
  language TEXT,
  timezone TEXT,
  first_ip TEXT,
  last_ip TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Users can read their own devices
DROP POLICY IF EXISTS user_devices_owner_select ON public.user_devices;
CREATE POLICY user_devices_owner_select ON public.user_devices
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

-- Users can insert/upsert their own device
DROP POLICY IF EXISTS user_devices_insert ON public.user_devices;
CREATE POLICY user_devices_insert ON public.user_devices
  FOR INSERT
  WITH CHECK (
    user_id IS NULL
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

-- Users can update/revoke their own devices, Admins can update any
DROP POLICY IF EXISTS user_devices_update ON public.user_devices;
CREATE POLICY user_devices_update ON public.user_devices
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

-- 2) user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  language TEXT NOT NULL DEFAULT 'id',
  font_scale NUMERIC NOT NULL DEFAULT 1.0,
  sidebar_state TEXT NOT NULL DEFAULT 'expanded',
  navigation_mode TEXT NOT NULL DEFAULT 'standard',
  density TEXT NOT NULL DEFAULT 'normal',
  preferred_ui_profile TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_preferences_owner_select ON public.user_preferences;
CREATE POLICY user_preferences_owner_select ON public.user_preferences
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS user_preferences_owner_insert ON public.user_preferences;
CREATE POLICY user_preferences_owner_insert ON public.user_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_preferences_owner_update ON public.user_preferences;
CREATE POLICY user_preferences_owner_update ON public.user_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3) user_activity_logs table
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT,
  session_id TEXT,
  event_type TEXT NOT NULL,
  route TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all activity logs, users can view their own
DROP POLICY IF EXISTS user_activity_logs_select ON public.user_activity_logs;
CREATE POLICY user_activity_logs_select ON public.user_activity_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS user_activity_logs_insert ON public.user_activity_logs;
CREATE POLICY user_activity_logs_insert ON public.user_activity_logs
  FOR INSERT
  WITH CHECK (
    user_id IS NULL
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users_meta um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON public.user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON public.user_devices(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_devices_type ON public.user_devices(device_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_device_id ON public.user_activity_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_event_type ON public.user_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity_logs(created_at DESC);
