import { createClient } from '@supabase/supabase-js';

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
}

async function verifyAdmin(adminClient, token) {
  if (!token) return { error: { status: 401, message: 'Unauthorized' } };

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData?.user) return { error: { status: 401, message: 'Unauthorized' } };

  const { data: callerMeta, error: callerMetaError } = await adminClient
    .from('users_meta')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (callerMetaError) return { error: { status: 500, message: callerMetaError.message } };
  if (callerMeta?.role !== 'admin' && callerMeta?.role !== 'superadmin') {
    return { error: { status: 403, message: 'Forbidden' } };
  }

  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ message: 'Method tidak didukung' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: 'Server configuration missing' });
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authResult = await verifyAdmin(adminClient, getBearerToken(req));
  if (authResult.error) {
    res.status(authResult.error.status).json({ message: authResult.error.message });
    return;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      usersRes,
      seekersRes,
      employersRes,
      jobsRes,
      activeJobsRes,
      appsRes,
      interviewsRes,
    ] = await Promise.all([
      adminClient.from('users').select('id', { count: 'exact', head: true }),
      adminClient.from('users_meta').select('id', { count: 'exact', head: true }).eq('role', 'seeker'),
      adminClient.from('users_meta').select('id', { count: 'exact', head: true }).eq('role', 'employer'),
      adminClient.from('job_listings').select('id', { count: 'exact', head: true }),
      adminClient.from('job_listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      adminClient.from('applications').select('id', { count: 'exact', head: true }),
      adminClient.from('interview_invitations').select('id', { count: 'exact', head: true }),
    ]);

    const snapshotData = {
      snapshot_date: today,
      total_users: usersRes.count || 0,
      total_seekers: seekersRes.count || 0,
      total_employers: employersRes.count || 0,
      total_jobs: jobsRes.count || 0,
      active_jobs: activeJobsRes.count || 0,
      total_applications: appsRes.count || 0,
      total_interviews: interviewsRes.count || 0,
      metadata: JSON.stringify({ generated_by: 'api_admin', timestamp: new Date().toISOString() }),
    };

    const { data: snapshot, error: insertError } = await adminClient
      .from('analytics_snapshots')
      .upsert(snapshotData, { onConflict: 'snapshot_date' })
      .select('*')
      .maybeSingle();

    if (insertError) {
      res.status(500).json({ success: false, message: insertError.message });
      return;
    }

    res.status(200).json({ success: true, snapshot: snapshot || snapshotData });
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Gagal membuat snapshot analitik.' });
  }
}
