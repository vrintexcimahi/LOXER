
/*
  # LOXER Clone - Core Schema (Part 1)
  Creates users_meta, seeker tables, companies, company_members.
  Policies for cross-table references will be added after all tables exist.
*/

-- 1. USERS META
CREATE TABLE IF NOT EXISTS users_meta (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL CHECK (role IN ('seeker', 'employer')),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE users_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own meta"
  ON users_meta FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own meta"
  ON users_meta FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own meta"
  ON users_meta FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. SEEKER PROFILES
CREATE TABLE IF NOT EXISTS seeker_profiles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name             text NOT NULL DEFAULT '',
  photo_url             text DEFAULT '',
  domicile_city         text DEFAULT '',
  domicile_lat          double precision,
  domicile_lng          double precision,
  about                 text DEFAULT '',
  phone                 text DEFAULT '',
  expected_salary_min   bigint DEFAULT 0,
  expected_salary_max   bigint DEFAULT 0,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
ALTER TABLE seeker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers can read own profile"
  ON seeker_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Seekers can insert own profile"
  ON seeker_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Seekers can update own profile"
  ON seeker_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. SEEKER EDUCATION
CREATE TABLE IF NOT EXISTS seeker_education (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id   uuid NOT NULL REFERENCES seeker_profiles(id) ON DELETE CASCADE,
  school_name text NOT NULL DEFAULT '',
  degree      text DEFAULT '',
  major       text DEFAULT '',
  start_year  int,
  end_year    int,
  is_current  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE seeker_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers can select own education"
  ON seeker_education FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));
CREATE POLICY "Seekers can insert own education"
  ON seeker_education FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));
CREATE POLICY "Seekers can update own education"
  ON seeker_education FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));
CREATE POLICY "Seekers can delete own education"
  ON seeker_education FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));

-- 4. SEEKER EXPERIENCE
CREATE TABLE IF NOT EXISTS seeker_experience (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id     uuid NOT NULL REFERENCES seeker_profiles(id) ON DELETE CASCADE,
  company_name  text NOT NULL DEFAULT '',
  position      text DEFAULT '',
  start_date    date,
  end_date      date,
  is_current    boolean DEFAULT false,
  description   text DEFAULT '',
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE seeker_experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers can select own experience"
  ON seeker_experience FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));
CREATE POLICY "Seekers can insert own experience"
  ON seeker_experience FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));
CREATE POLICY "Seekers can update own experience"
  ON seeker_experience FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));
CREATE POLICY "Seekers can delete own experience"
  ON seeker_experience FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));

-- 5. SEEKER SKILLS
CREATE TABLE IF NOT EXISTS seeker_skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id   uuid NOT NULL REFERENCES seeker_profiles(id) ON DELETE CASCADE,
  skill_name  text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE seeker_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers can select own skills"
  ON seeker_skills FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));
CREATE POLICY "Seekers can insert own skills"
  ON seeker_skills FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));
CREATE POLICY "Seekers can delete own skills"
  ON seeker_skills FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));

-- 6. COMPANIES
CREATE TABLE IF NOT EXISTS companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT '',
  industry        text DEFAULT '',
  city            text DEFAULT '',
  logo_url        text DEFAULT '',
  description     text DEFAULT '',
  website         text DEFAULT '',
  employee_count  text DEFAULT '',
  verified        boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read companies"
  ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can insert company"
  ON companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 7. COMPANY MEMBERS
CREATE TABLE IF NOT EXISTS company_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'viewer')),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read company members"
  ON company_members FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM companies c WHERE c.id = company_id AND c.user_id = auth.uid()) OR
    user_id = auth.uid()
  );
CREATE POLICY "Owners can insert members"
  ON company_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = company_id AND c.user_id = auth.uid()));
CREATE POLICY "Owners can delete members"
  ON company_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = company_id AND c.user_id = auth.uid()));

-- Now add the update policy for companies that references company_members
CREATE POLICY "Owners and admins can update company"
  ON companies FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = id AND cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin'))
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = id AND cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin'))
  );

-- 8. JOB LISTINGS
CREATE TABLE IF NOT EXISTS job_listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT '',
  category        text DEFAULT '',
  location_city   text DEFAULT '',
  job_type        text DEFAULT 'full-time' CHECK (job_type IN ('full-time', 'part-time', 'contract', 'freelance', 'internship')),
  salary_min      bigint DEFAULT 0,
  salary_max      bigint DEFAULT 0,
  description     text DEFAULT '',
  requirements    text DEFAULT '',
  quota           int DEFAULT 1,
  status          text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
  created_at      timestamptz DEFAULT now(),
  expires_at      timestamptz,
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active jobs"
  ON job_listings FOR SELECT TO authenticated
  USING (
    status = 'active' OR
    EXISTS (
      SELECT 1 FROM companies c WHERE c.id = company_id AND (
        c.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Employers can insert job listings"
  ON job_listings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c WHERE c.id = company_id AND (
        c.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid() AND cm.role IN ('owner','admin'))
      )
    )
  );

CREATE POLICY "Employers can update job listings"
  ON job_listings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies c WHERE c.id = company_id AND (
        c.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid() AND cm.role IN ('owner','admin'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c WHERE c.id = company_id AND (
        c.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid() AND cm.role IN ('owner','admin'))
      )
    )
  );

-- 9. APPLICATIONS
CREATE TABLE IF NOT EXISTS applications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  seeker_id   uuid NOT NULL REFERENCES seeker_profiles(id) ON DELETE CASCADE,
  status      text DEFAULT 'applied' CHECK (status IN ('applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'hired', 'rejected')),
  applied_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(job_id, seeker_id)
);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers can read own applications"
  ON applications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));

CREATE POLICY "Employers can read applications to their jobs"
  ON applications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_listings jl JOIN companies c ON c.id = jl.company_id
      WHERE jl.id = job_id AND (
        c.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Seekers can insert applications"
  ON applications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM seeker_profiles sp WHERE sp.id = seeker_id AND sp.user_id = auth.uid()));

CREATE POLICY "Employers can update application status"
  ON applications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_listings jl JOIN companies c ON c.id = jl.company_id
      WHERE jl.id = job_id AND (
        c.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_listings jl JOIN companies c ON c.id = jl.company_id
      WHERE jl.id = job_id AND (
        c.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
      )
    )
  );

-- 10. INTERVIEW INVITATIONS
CREATE TABLE IF NOT EXISTS interview_invitations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_at      timestamptz NOT NULL,
  location_or_link  text DEFAULT '',
  notes             text DEFAULT '',
  seeker_confirmed  boolean,
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE interview_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers can read own interview invitations"
  ON interview_invitations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a JOIN seeker_profiles sp ON sp.id = a.seeker_id
      WHERE a.id = application_id AND sp.user_id = auth.uid()
    )
  );
CREATE POLICY "Employers can read their interview invitations"
  ON interview_invitations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a JOIN job_listings jl ON jl.id = a.job_id JOIN companies c ON c.id = jl.company_id
      WHERE a.id = application_id AND (
        c.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
      )
    )
  );
CREATE POLICY "Employers can insert interview invitations"
  ON interview_invitations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a JOIN job_listings jl ON jl.id = a.job_id JOIN companies c ON c.id = jl.company_id
      WHERE a.id = application_id AND (
        c.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM company_members cm WHERE cm.company_id = c.id AND cm.user_id = auth.uid())
      )
    )
  );
CREATE POLICY "Seekers can update seeker_confirmed"
  ON interview_invitations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a JOIN seeker_profiles sp ON sp.id = a.seeker_id
      WHERE a.id = application_id AND sp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a JOIN seeker_profiles sp ON sp.id = a.seeker_id
      WHERE a.id = application_id AND sp.user_id = auth.uid()
    )
  );

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT '',
  title       text NOT NULL DEFAULT '',
  message     text DEFAULT '',
  is_read     boolean DEFAULT false,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_seeker_profiles_user_id ON seeker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_company_id ON job_listings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_status ON job_listings(status);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_seeker_id ON applications(seeker_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ADD EMPLOYER RLS FOR SEEKER DATA (now all tables exist)
CREATE POLICY "Employers can read seeker profiles"
  ON seeker_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users_meta WHERE id = auth.uid() AND role = 'employer'));

CREATE POLICY "Employers can read seeker education"
  ON seeker_education FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users_meta WHERE id = auth.uid() AND role = 'employer'));

CREATE POLICY "Employers can read seeker experience"
  ON seeker_experience FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users_meta WHERE id = auth.uid() AND role = 'employer'));

CREATE POLICY "Employers can read seeker skills"
  ON seeker_skills FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users_meta WHERE id = auth.uid() AND role = 'employer'));
