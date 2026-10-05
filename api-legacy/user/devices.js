import { createClient } from '@supabase/supabase-js';

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
}

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !anonKey) {
    res.status(500).json({ message: 'Server configuration missing' });
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const userId = userData.user.id;

  if (req.method === 'GET') {
    const { data: devices, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('is_revoked', false)
      .order('last_seen_at', { ascending: false });

    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }

    res.status(200).json({ devices: devices || [] });
    return;
  }

  if (req.method === 'POST') {
    const deviceId = req.body?.deviceId || req.body?.id;
    if (!deviceId) {
      res.status(400).json({ message: 'deviceId wajib diisi' });
      return;
    }

    const { error } = await supabase
      .from('user_devices')
      .update({ is_revoked: true })
      .eq('device_id', deviceId)
      .eq('user_id', userId);

    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ message: 'Method tidak didukung' });
}
