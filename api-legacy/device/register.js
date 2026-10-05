import { createClient } from '@supabase/supabase-js';

function getClientIp(req) {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return String(cfIp).trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return String(list).split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) return String(realIp).trim();

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

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: 'Server configuration missing' });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = req.body || {};
    const deviceId = String(body.deviceId || '').trim().slice(0, 128);
    if (!deviceId) {
      res.status(400).json({ error: { message: 'deviceId wajib diisi' } });
      return;
    }

    let userId = null;
    const token = getBearerToken(req);
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;
      }
    }

    const ip = getClientIp(req);
    const now = new Date().toISOString();

    const deviceRecord = {
      device_id: deviceId,
      user_id: userId,
      device_type: String(body.deviceType || 'unknown').slice(0, 32),
      ui_profile: String(body.uiProfile || 'desktop-standard').slice(0, 32),
      device_brand: body.deviceBrand ? String(body.deviceBrand).slice(0, 64) : null,
      device_model: body.deviceModel ? String(body.deviceModel).slice(0, 64) : null,
      os_name: body.osName ? String(body.osName).slice(0, 64) : null,
      os_version: body.osVersion ? String(body.osVersion).slice(0, 32) : null,
      browser_name: body.browserName ? String(body.browserName).slice(0, 64) : null,
      browser_version: body.browserVersion ? String(body.browserVersion).slice(0, 32) : null,
      platform: body.platform ? String(body.platform).slice(0, 64) : null,
      architecture: body.architecture ? String(body.architecture).slice(0, 32) : null,
      screen_width: Number(body.screen?.width) || null,
      screen_height: Number(body.screen?.height) || null,
      viewport_width: Number(body.viewport?.width) || null,
      viewport_height: Number(body.viewport?.height) || null,
      pixel_ratio: Number(body.screen?.pixelRatio) || 1,
      orientation: body.orientation === 'portrait' ? 'portrait' : 'landscape',
      touch: Boolean(body.input?.touch),
      max_touch_points: Number(body.input?.maxTouchPoints) || 0,
      pointer_type: body.input?.pointer ? String(body.input.pointer).slice(0, 16) : null,
      hover_supported: body.input?.hover !== false,
      pwa: Boolean(body.pwa),
      language: body.language ? String(body.language).slice(0, 32) : null,
      timezone: body.timezone ? String(body.timezone).slice(0, 64) : null,
      last_ip: ip,
      last_seen_at: now,
      updated_at: now,
    };

    // Check existing
    const { data: existing } = await supabase
      .from('user_devices')
      .select('id, user_id, first_ip, first_seen_at')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_devices')
        .update({
          ...deviceRecord,
          user_id: userId || existing.user_id,
          is_revoked: false,
        })
        .eq('id', existing.id);

      if (userId && existing.user_id !== userId) {
        await supabase.from('user_activity_logs').insert({
          user_id: userId,
          device_id: deviceId,
          event_type: 'new_device_login',
          ip_address: ip,
          metadata: { browser: deviceRecord.browser_name, os: deviceRecord.os_name },
        });
      }
    } else {
      await supabase.from('user_devices').insert({
        ...deviceRecord,
        first_ip: ip,
        first_seen_at: now,
        is_revoked: false,
      });

      if (userId) {
        await supabase.from('user_activity_logs').insert({
          user_id: userId,
          device_id: deviceId,
          event_type: 'device_registered',
          ip_address: ip,
          metadata: { browser: deviceRecord.browser_name, os: deviceRecord.os_name },
        });
      }
    }

    res.status(200).json({ ok: true, deviceId });
  } catch (err) {
    res.status(500).json({ error: { message: err.message || 'Gagal meregistrasi device' } });
  }
}
