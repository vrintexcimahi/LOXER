import { createClient } from '@supabase/supabase-js';

function getClientIp(req) {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return String(cfIp).trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return String(list).split(',')[0].trim();
  }

  return req.socket?.remoteAddress || '127.0.0.1';
}

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

  const body = req.body || {};
  const platform = String(body.platform || 'unknown').toLowerCase();
  const deviceId = String(body.device_id || body.deviceId || '').trim().slice(0, 128);
  const pushToken = String(body.push_token || body.pushToken || '').trim();
  const appVersion = String(body.app_version || body.appVersion || '1.0.0').slice(0, 32);
  const tenant = body.tenant ? String(body.tenant).slice(0, 64) : null;
  const userId = body.user_id ? String(body.user_id) : null;

  if (!deviceId) {
    res.status(400).json({ error: { message: 'device_id wajib diisi' } });
    return;
  }

  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const ip = getClientIp(req);
      const now = new Date().toISOString();

      const deviceData = {
        device_id: deviceId,
        user_id: userId,
        platform: platform,
        app_version: appVersion,
        push_token: pushToken || null,
        tenant_id: tenant,
        last_ip: ip,
        last_seen_at: now,
        updated_at: now
      };

      const { data: existing } = await supabase
        .from('user_devices')
        .select('id')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_devices')
          .update(deviceData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_devices')
          .insert({
            ...deviceData,
            first_ip: ip,
            first_seen_at: now,
            is_revoked: false
          });
      }
    } catch (e) {
      console.warn('[Mobile Device Registration] Non-blocking warning:', e.message);
    }
  }

  res.status(200).json({
    ok: true,
    registered: true,
    device_id: deviceId,
    platform: platform,
    push_token_registered: Boolean(pushToken)
  });
}
