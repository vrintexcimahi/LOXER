/*
  Production hardening
  - Restrict seeker profile access to related applications only
  - Restrict CMS editing to admins only
  - Restrict notifications insert to service_role only
  - Add composite indexes for production query patterns
*/

-- Restrict employer access to seeker data to applicants linked to their own jobs
DROP POLICY IF EXISTS "Employers can read seeker profiles" ON public.seeker_profiles;
DROP POLICY IF EXISTS "Employers can read seeker education" ON public.seeker_education;
DROP POLICY IF EXISTS "Employers can read seeker experience" ON public.seeker_experience;
DROP POLICY IF EXISTS "Employers can read seeker skills" ON public.seeker_skills;

CREATE POLICY "Employers can read applicant seeker profiles"
  ON public.seeker_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_listings jl ON jl.id = a.job_id
      JOIN public.companies c ON c.id = jl.company_id
      WHERE a.seeker_id = seeker_profiles.id
        AND (
          c.user_id = auth.uid() OR
          EXISTS (
            SELECT 1
            FROM public.company_members cm
            WHERE cm.company_id = c.id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Employers can read applicant seeker education"
  ON public.seeker_education FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seeker_profiles sp
      JOIN public.applications a ON a.seeker_id = sp.id
      JOIN public.job_listings jl ON jl.id = a.job_id
      JOIN public.companies c ON c.id = jl.company_id
      WHERE sp.id = seeker_education.seeker_id
        AND (
          c.user_id = auth.uid() OR
          EXISTS (
            SELECT 1
            FROM public.company_members cm
            WHERE cm.company_id = c.id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Employers can read applicant seeker experience"
  ON public.seeker_experience FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seeker_profiles sp
      JOIN public.applications a ON a.seeker_id = sp.id
      JOIN public.job_listings jl ON jl.id = a.job_id
      JOIN public.companies c ON c.id = jl.company_id
      WHERE sp.id = seeker_experience.seeker_id
        AND (
          c.user_id = auth.uid() OR
          EXISTS (
            SELECT 1
            FROM public.company_members cm
            WHERE cm.company_id = c.id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Employers can read applicant seeker skills"
  ON public.seeker_skills FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seeker_profiles sp
      JOIN public.applications a ON a.seeker_id = sp.id
      JOIN public.job_listings jl ON jl.id = a.job_id
      JOIN public.companies c ON c.id = jl.company_id
      WHERE sp.id = seeker_skills.seeker_id
        AND (
          c.user_id = auth.uid() OR
          EXISTS (
            SELECT 1
            FROM public.company_members cm
            WHERE cm.company_id = c.id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );

-- Restrict CMS editing to admins only
DROP POLICY IF EXISTS "Employers can insert pages" ON public.pages;
DROP POLICY IF EXISTS "Employers can update pages" ON public.pages;
DROP POLICY IF EXISTS "Employers can delete pages" ON public.pages;

CREATE POLICY "Admins can insert pages"
  ON public.pages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

CREATE POLICY "Admins can update pages"
  ON public.pages FOR UPDATE TO authenticated
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

CREATE POLICY "Admins can delete pages"
  ON public.pages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

-- Restrict notification inserts to server-side service role
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT TO service_role
  WITH CHECK (true);

-- Production indexes for common access paths
CREATE INDEX IF NOT EXISTS idx_job_listings_company_created_at
  ON public.job_listings(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_listings_status_created_at
  ON public.job_listings(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_job_applied_at
  ON public.applications(job_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_seeker_applied_at
  ON public.applications(seeker_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_members_company_user
  ON public.company_members(company_id, user_id);

CREATE INDEX IF NOT EXISTS idx_users_meta_role_created_at
  ON public.users_meta(role, created_at DESC);
