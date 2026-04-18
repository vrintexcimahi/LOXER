/*
  Admin dashboard RLS completion
  - Grant admin read/write/delete policies needed by AdminDashboard
  - Keep existing owner/employer/seeker policies intact
*/

-- Admin helper policies for users_meta write/delete
DROP POLICY IF EXISTS admin_update_all_users_meta ON public.users_meta;
CREATE POLICY admin_update_all_users_meta ON public.users_meta
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS admin_delete_all_users_meta ON public.users_meta;
CREATE POLICY admin_delete_all_users_meta ON public.users_meta
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

-- Admin helper policies for job_listings moderation
DROP POLICY IF EXISTS admin_read_all_job_listings ON public.job_listings;
CREATE POLICY admin_read_all_job_listings ON public.job_listings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_update_all_job_listings ON public.job_listings;
CREATE POLICY admin_update_all_job_listings ON public.job_listings
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS admin_delete_all_job_listings ON public.job_listings;
CREATE POLICY admin_delete_all_job_listings ON public.job_listings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

-- Admin helper policies for application moderation
DROP POLICY IF EXISTS admin_read_all_applications ON public.applications;
CREATE POLICY admin_read_all_applications ON public.applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_update_all_applications ON public.applications;
CREATE POLICY admin_update_all_applications ON public.applications
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS admin_delete_all_applications ON public.applications;
CREATE POLICY admin_delete_all_applications ON public.applications
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

-- Admin helper policy for company deletion
DROP POLICY IF EXISTS admin_delete_companies ON public.companies;
CREATE POLICY admin_delete_companies ON public.companies
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

-- Admin helper policies for seeker detail reads from admin user detail modal
DROP POLICY IF EXISTS admin_read_all_seeker_profiles ON public.seeker_profiles;
CREATE POLICY admin_read_all_seeker_profiles ON public.seeker_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_read_all_seeker_education ON public.seeker_education;
CREATE POLICY admin_read_all_seeker_education ON public.seeker_education
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_read_all_seeker_experience ON public.seeker_experience;
CREATE POLICY admin_read_all_seeker_experience ON public.seeker_experience
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_read_all_seeker_skills ON public.seeker_skills;
CREATE POLICY admin_read_all_seeker_skills ON public.seeker_skills
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users_meta um
      WHERE um.id = auth.uid()
        AND um.role = 'admin'
    )
  );

-- Indexes to keep admin pages snappy
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_created_at
  ON public.audit_logs(target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_status_applied_at
  ON public.applications(status, applied_at DESC);
