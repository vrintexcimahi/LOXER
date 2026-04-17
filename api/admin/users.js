import { createClient } from '@supabase/supabase-js';

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
}

async function verifyAdmin(adminClient, token) {
  if (!token) {
    return { error: { status: 401, message: 'Unauthorized' } };
  }

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return { error: { status: 401, message: 'Unauthorized' } };
  }

  const callerId = userData.user.id;
  const { data: callerMeta, error: callerMetaError } = await adminClient
    .from('users_meta')
    .select('role')
    .eq('id', callerId)
    .maybeSingle();

  if (callerMetaError) {
    return { error: { status: 500, message: callerMetaError.message } };
  }

  if (callerMeta?.role !== 'admin') {
    return { error: { status: 403, message: 'Forbidden' } };
  }

  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ message: 'Method tidak didukung' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: 'Server admin users belum dikonfigurasi.' });
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
    const role = req.query?.role || 'all';
    const sort = req.query?.sort || 'newest';
    const page = Number(req.query?.page || '1') || 1;
    const pageSize = Number(req.query?.page_size || '20') || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const baseSelectWithBan = 'id, email, role, created_at, is_banned';
    const baseSelectNoBan = 'id, email, role, created_at';

    let query = adminClient.from('users_meta').select(baseSelectWithBan, { count: 'exact' });

    if (role !== 'all') query = query.eq('role', role);
    if (sort === 'newest') query = query.order('created_at', { ascending: false });
    if (sort === 'oldest') query = query.order('created_at', { ascending: true });
    if (sort === 'email') query = query.order('email', { ascending: true });

    let { data, count, error } = await query.range(from, to);

    if (error && /is_banned/i.test(error.message)) {
      query = adminClient.from('users_meta').select(baseSelectNoBan, { count: 'exact' });
      if (role !== 'all') query = query.eq('role', role);
      if (sort === 'newest') query = query.order('created_at', { ascending: false });
      if (sort === 'oldest') query = query.order('created_at', { ascending: true });
      if (sort === 'email') query = query.order('email', { ascending: true });
      ({ data, count, error } = await query.range(from, to));

      if (!error) {
        data = (data || []).map((row) => ({ ...row, is_banned: false }));
      }
    }

    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }

    const users = data || [];
    const userIds = users.map((item) => item.id);

    const [seekersRes, companiesRes] = await Promise.all([
      userIds.length
        ? adminClient.from('seeker_profiles').select('user_id, full_name').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? adminClient.from('companies').select('user_id, name').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const seekerMap = new Map((seekersRes.data || []).map((item) => [item.user_id, item.full_name]));
    const companyMap = new Map((companiesRes.data || []).map((item) => [item.user_id, item.name]));

    const rows = users.map((row) => ({
      ...row,
      full_name: seekerMap.get(row.id),
      company_name: companyMap.get(row.id),
    }));

    res.status(200).json({ rows, total: count || 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat users admin.';
    res.status(500).json({ message });
  }
}
