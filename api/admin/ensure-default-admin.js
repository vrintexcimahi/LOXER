import { createClient } from '@supabase/supabase-js';

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
}

function normalizeComparableEmail(value) {
  return String(value || '')
    .replace(/\\r|\\n|\r|\n/g, '')
    .trim()
    .toLowerCase();
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ message: 'Method tidak didukung' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const defaultAdminEmail = normalizeComparableEmail(
    process.env.DEFAULT_ADMIN_EMAIL ||
    process.env.VITE_DEFAULT_ADMIN_EMAIL ||
    'loxer-admin-1776448925326@example.com'
  );

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: 'Server ensure default admin belum dikonfigurasi.' });
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
  const signedInUser = userData?.user;
  if (userError || !signedInUser) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const email = normalizeComparableEmail(signedInUser.email);
  if (email !== defaultAdminEmail) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const payload = {
    id: signedInUser.id,
    email: signedInUser.email || defaultAdminEmail,
    role: 'admin',
  };

  const { data: upserted, error: upsertError } = await adminClient
    .from('users_meta')
    .upsert(payload, { onConflict: 'id' })
    .select('id, email, role, created_at, is_banned')
    .maybeSingle();

  if (upsertError) {
    res.status(500).json({ message: upsertError.message });
    return;
  }

  res.status(200).json({ ok: true, meta: upserted ?? payload });
}
