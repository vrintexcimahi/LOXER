-- ==============================================================================
-- LOXER Local Database Schema (SQLite)
-- Fully compatible with Supabase PostgreSQL schema
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. Users Auth Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Users Metadata Table
CREATE TABLE IF NOT EXISTS users_meta (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('seeker', 'employer', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_banned INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Seeker Profiles Table
CREATE TABLE IF NOT EXISTS seeker_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  domicile_city TEXT NOT NULL DEFAULT '',
  domicile_lat REAL,
  domicile_lng REAL,
  about TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  expected_salary_min INTEGER NOT NULL DEFAULT 0,
  expected_salary_max INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Seeker Education Table
CREATE TABLE IF NOT EXISTS seeker_education (
  id TEXT PRIMARY KEY,
  seeker_id TEXT NOT NULL,
  school_name TEXT NOT NULL DEFAULT '',
  degree TEXT DEFAULT '',
  major TEXT DEFAULT '',
  start_year INTEGER,
  end_year INTEGER,
  is_current INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (seeker_id) REFERENCES seeker_profiles(id) ON DELETE CASCADE
);

-- 5. Seeker Experience Table
CREATE TABLE IF NOT EXISTS seeker_experience (
  id TEXT PRIMARY KEY,
  seeker_id TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  is_current INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (seeker_id) REFERENCES seeker_profiles(id) ON DELETE CASCADE
);

-- 6. Seeker Skills Table
CREATE TABLE IF NOT EXISTS seeker_skills (
  id TEXT PRIMARY KEY,
  seeker_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (seeker_id) REFERENCES seeker_profiles(id) ON DELETE CASCADE
);

-- 7. Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  employee_count TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Company Members Table
CREATE TABLE IF NOT EXISTS company_members (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Job Listings Table
CREATE TABLE IF NOT EXISTS job_listings (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  location_city TEXT NOT NULL DEFAULT '',
  job_type TEXT NOT NULL DEFAULT 'full-time',
  salary_min INTEGER NOT NULL DEFAULT 0,
  salary_max INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '',
  quota INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 10. Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  seeker_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'hired', 'rejected')),
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES job_listings(id) ON DELETE CASCADE,
  FOREIGN KEY (seeker_id) REFERENCES seeker_profiles(id) ON DELETE CASCADE,
  UNIQUE(job_id, seeker_id)
);

-- 11. Interview Invitations Table
CREATE TABLE IF NOT EXISTS interview_invitations (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  location_or_link TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- 12. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Pages Table (CMS Puck Visual Editor)
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  data TEXT NOT NULL,
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

-- 14. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  admin_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT DEFAULT '',
  detail TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 15. Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  rollout_pct INTEGER NOT NULL DEFAULT 100,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 16. Moderation Queue Table
CREATE TABLE IF NOT EXISTS moderation_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  risk_score INTEGER NOT NULL DEFAULT 0,
  flags TEXT DEFAULT '[]',
  reviewed_by TEXT,
  reviewed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 17. Broadcast Campaigns Table
CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  audience TEXT NOT NULL DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'draft',
  sent_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at TEXT,
  sent_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 18. IP Blocks Table
CREATE TABLE IF NOT EXISTS ip_blocks (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocked_by TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 19. Admin Sessions Table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  impersonating TEXT,
  ip_address TEXT,
  user_agent TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT
);

-- 20. User Devices Registry Table
CREATE TABLE IF NOT EXISTS user_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT,
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
  pixel_ratio REAL,
  orientation TEXT,
  touch INTEGER NOT NULL DEFAULT 0,
  max_touch_points INTEGER DEFAULT 0,
  pointer_type TEXT,
  hover_supported INTEGER NOT NULL DEFAULT 1,
  pwa INTEGER NOT NULL DEFAULT 0,
  language TEXT,
  timezone TEXT,
  first_ip TEXT,
  last_ip TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 21. User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  theme TEXT NOT NULL DEFAULT 'system',
  language TEXT NOT NULL DEFAULT 'id',
  font_scale REAL NOT NULL DEFAULT 1.0,
  sidebar_state TEXT NOT NULL DEFAULT 'expanded',
  navigation_mode TEXT NOT NULL DEFAULT 'standard',
  density TEXT NOT NULL DEFAULT 'normal',
  preferred_ui_profile TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 22. User Activity Logs Table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  device_id TEXT,
  session_id TEXT,
  event_type TEXT NOT NULL,
  route TEXT,
  ip_address TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for Fast Queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_meta_role ON users_meta(role);
CREATE INDEX IF NOT EXISTS idx_seeker_user_id ON seeker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_company ON job_listings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_status ON job_listings(status);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_seeker ON applications(seeker_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON user_devices(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_user_devices_type ON user_devices(device_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_device_id ON user_activity_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_event_type ON user_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_logs(created_at);

