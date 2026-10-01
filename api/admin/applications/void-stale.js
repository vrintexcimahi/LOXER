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
    .select('role, email')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (callerMetaError) return { error: { status: 500, message: callerMetaError.message } };
  if (callerMeta?.role !== 'admin' && callerMeta?.role !== 'superadmin') {
    return { error: { status: 403, message: 'Forbidden' } };
  }

  return { ok: true, user: userData.user, meta: callerMeta };
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
    const daysThreshold = Math.max(1, parseInt(req.body?.days_threshold || '30', 10));
    const dryRun = req.body?.dry_run === true;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
    const cutoffISO = cutoffDate.toISOString();

    const { data: staleApps, error: fetchError } = await adminClient
      .from('applications')
      .select('id, job_id, seeker_id, status, applied_at')
      .in('status', ['applied', 'reviewed'])
      .lt('applied_at', cutoffISO)
      .order('applied_at', { ascending: true });

    if (fetchError) {
      res.status(500).json({ message: fetchError.message });
      return;
    }

    const apps = staleApps || [];

    if (dryRun) {
      res.status(200).json({
        ok: true,
        dry_run: true,
        days_threshold: daysThreshold,
        cutoff_date: cutoffISO,
        stale_count: apps.length,
        stale_ids: apps.map((a) => a.id),
      });
      return;
    }

    if (apps.length === 0) {
      res.status(200).json({ ok: true, voided: 0, message: 'Tidak ada lamaran kadaluarsa.' });
      return;
    }

    const ids = apps.map((a) => a.id);
    const now = new Date().toISOString();

    const { error: updateError } = await adminClient
      .from('applications')
      .update({ status: 'expired', updated_at: now })
      .in('id', ids);

    if (updateError) {
      res.status(500).json({ message: updateError.message });
      return;
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      admin_id: authResult.user.id,
      admin_email: authResult.meta?.email || authResult.user.email || '',
      action: 'void_stale_applications',
      target_type: 'applications',
      target_id: 'bulk',
      detail: JSON.stringify({ voided: ids.length, days_threshold: daysThreshold, ids }),
      created_at: now,
    });

    res.status(200).json({
      ok: true,
      voided: ids.length,
      days_threshold: daysThreshold,
      cutoff_date: cutoffISO,
      voided_ids: ids,
    });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'Gagal memproses auto-void lamaran.' });
  }
}
