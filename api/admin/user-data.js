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

function maskIp(ip) {
  if (!ip || ip === '—') return '—';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 2).join(':')}:xxxx:xxxx`;
  }
  return ip;
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
    const search = (req.query?.search || '').trim().toLowerCase();
    const role = req.query?.role || 'all';
    const status = req.query?.status || 'all';
    const sort = req.query?.sort || 'last_active';
    const sortOrder = (req.query?.order || 'desc').toLowerCase() === 'asc';
    const page = Number(req.query?.page || '1') || 1;
    const pageSize = Number(req.query?.page_size || '20') || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = adminClient.from('users_meta').select('*', { count: 'exact' });

    if (role !== 'all') query = query.eq('role', role);
    if (status === 'active') query = query.eq('is_banned', false);
    if (status === 'banned') query = query.eq('is_banned', true);

    if (sort === 'created_at') query = query.order('created_at', { ascending: sortOrder });
    else if (sort === 'email') query = query.order('email', { ascending: sortOrder });
    else query = query.order('created_at', { ascending: false });

    const { data: users, count, error } = await query.range(from, to);
    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }

    const userIds = (users || []).map((u) => u.id);

    const [seekersRes, companiesRes, devicesRes] = await Promise.all([
      userIds.length ? adminClient.from('seeker_profiles').select('user_id, full_name').in('user_id', userIds) : { data: [] },
      userIds.length ? adminClient.from('companies').select('user_id, name').in('user_id', userIds) : { data: [] },
      userIds.length ? adminClient.from('user_devices').select('*').in('user_id', userIds).order('last_seen_at', { ascending: false }) : { data: [] },
    ]);

    const seekerMap = new Map((seekersRes.data || []).map((s) => [s.user_id, s.full_name]));
    const companyMap = new Map((companiesRes.data || []).map((c) => [c.user_id, c.name]));
    const deviceMap = new Map();
    for (const d of devicesRes.data || []) {
      if (!deviceMap.has(d.user_id)) {
        deviceMap.set(d.user_id, d);
      }
    }

    const rows = (users || []).map((u, i) => {
      const dev = deviceMap.get(u.id);
      const isOnline = dev?.last_seen_at ? new Date(dev.last_seen_at).getTime() >= Date.now() - 5 * 60 * 1000 : false;
      return {
        index: from + i + 1,
        id: u.id,
        email: u.email,
        name: seekerMap.get(u.id) || companyMap.get(u.id) || u.email.split('@')[0],
        role: u.role,
        isBanned: Boolean(u.is_banned),
        isOnline,
        deviceId: dev?.device_id || null,
        deviceType: dev?.device_type || null,
        uiProfile: dev?.ui_profile || null,
        deviceModel: dev?.device_model || dev?.device_brand || null,
        os: dev?.os_name ? `${dev.os_name}${dev.os_version ? ' ' + dev.os_version : ''}` : null,
        browser: dev?.browser_name ? `${dev.browser_name}${dev.browser_version ? ' ' + dev.browser_version : ''}` : null,
        lastIp: dev?.last_ip || null,
        maskedIp: maskIp(dev?.last_ip),
        resolution: dev?.viewport_width && dev?.viewport_height ? `${dev.viewport_width} × ${dev.viewport_height}` : null,
        pwa: Boolean(dev?.pwa),
        timezone: dev?.timezone || null,
        lastActive: dev?.last_seen_at || null,
        createdAt: u.created_at,
      };
    });

    res.status(200).json({ rows, total: count || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
}
