import { createClient } from '@supabase/supabase-js';

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method tidak didukung' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: 'Server audit belum dikonfigurasi.' });
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  const caller = userData?.user;
  if (userError || !caller) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { data: callerMeta, error: callerMetaError } = await adminClient
    .from('users_meta')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();

  if (callerMetaError) {
    res.status(500).json({ message: callerMetaError.message });
    return;
  }

  if (callerMeta?.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const { action, targetType, targetId, detail } = req.body || {};
  if (!action || !targetType) {
    res.status(400).json({ message: 'action dan targetType wajib diisi.' });
    return;
  }

  const { error: insertError } = await adminClient.from('audit_logs').insert({
    admin_id: caller.id,
    admin_email: caller.email || '',
    action,
    target_type: targetType,
    target_id: targetId || '',
    detail: detail || '',
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    res.status(500).json({ message: insertError.message });
    return;
  }

  res.status(200).json({ ok: true });
}
