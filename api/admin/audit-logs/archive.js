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
    const retentionDays = Math.max(1, parseInt(req.body?.retention_days || '30', 10));
    const purgeOnly = req.body?.purge_only === true;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    const { data: oldRows, error: fetchError } = await adminClient
      .from('audit_logs')
      .select('*')
      .lt('created_at', cutoffISO)
      .order('created_at', { ascending: true });

    if (fetchError) {
      res.status(500).json({ message: fetchError.message });
      return;
    }

    const rowsToArchive = oldRows || [];

    if (rowsToArchive.length > 0) {
      const ids = rowsToArchive.map((r) => r.id);
      const { error: deleteError } = await adminClient
        .from('audit_logs')
        .delete()
        .in('id', ids);

      if (deleteError) {
        res.status(500).json({ message: deleteError.message });
        return;
      }
    }

    // Record audit log for the archive action
    await adminClient.from('audit_logs').insert({
      admin_id: authResult.user.id,
      admin_email: authResult.meta?.email || authResult.user.email || '',
      action: 'archive_audit_logs',
      target_type: 'system',
      target_id: 'audit_logs',
      detail: `Archived and purged ${rowsToArchive.length} audit logs older than ${retentionDays} days`,
      created_at: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      archivedCount: rowsToArchive.length,
      rows: purgeOnly ? [] : rowsToArchive,
    });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'Gagal mengarsipkan audit log.' });
  }
}
