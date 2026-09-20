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
  if (callerMeta?.role !== 'admin') return { error: { status: 403, message: 'Forbidden' } };

  return { ok: true };
}

export default async function handler(req, res) {
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

  // Handle revoke
  if (req.method === 'POST') {
    const deviceId = req.body?.deviceId || req.body?.id;
    if (!deviceId) {
      res.status(400).json({ message: 'deviceId wajib diisi' });
      return;
    }

    await adminClient.from('user_devices').update({ is_revoked: true }).eq('device_id', deviceId);
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'GET') {
    const page = Number(req.query?.page || '1') || 1;
    const pageSize = Number(req.query?.page_size || '20') || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: devices, count, error } = await adminClient
      .from('user_devices')
      .select('*', { count: 'exact' })
      .order('last_seen_at', { ascending: false })
      .range(from, to);

    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }

    res.status(200).json({ rows: devices || [], total: count || 0 });
    return;
  }

  res.status(405).json({ message: 'Method tidak didukung' });
}
