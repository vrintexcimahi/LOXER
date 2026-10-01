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

  return { ok: true, user: userData.user };
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
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
    const [countRes, oldestRes, newestRes] = await Promise.all([
      adminClient.from('audit_logs').select('id', { count: 'exact', head: true }),
      adminClient.from('audit_logs').select('created_at').order('created_at', { ascending: true }).limit(1).maybeSingle(),
      adminClient.from('audit_logs').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    res.status(200).json({
      total: countRes.count || 0,
      oldestDate: oldestRes.data?.created_at || null,
      newestDate: newestRes.data?.created_at || null,
    });
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'Gagal memuat statistik audit log.' });
  }
}
