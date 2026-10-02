import { createClient } from '@supabase/supabase-js';
import { extractSmartJobAd } from '../../services/smartJobExtractorService.js';

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
}

async function verifyAdmin(adminClient, token) {
  if (!token) return { error: { status: 401, message: 'Unauthorized: Sesi admin tidak ditemukan.' } };

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData?.user) return { error: { status: 401, message: 'Unauthorized: Token tidak valid.' } };

  const { data: callerMeta, error: callerMetaError } = await adminClient
    .from('users_meta')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (callerMetaError) return { error: { status: 500, message: callerMetaError.message } };
  if (callerMeta?.role !== 'admin' && callerMeta?.role !== 'superadmin') {
    return { error: { status: 403, message: 'Forbidden: Hanya Admin atau Superadmin yang diizinkan mengakses fitur ini.' } };
  }

  return { ok: true, user: userData.user };
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'POST') {
    res.status(405).json({ message: 'Method tidak didukung. Gunakan POST.' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (supabaseUrl && serviceRoleKey) {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = getBearerToken(req);
    const authResult = await verifyAdmin(adminClient, token);
    if (authResult.error) {
      res.status(authResult.error.status).json({ message: authResult.error.message });
      return;
    }
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { imageBase64, postUrl, postText } = body;

    if (!imageBase64 && !postUrl && !postText) {
      res.status(400).json({ message: 'Harap lampirkan gambar poster loker atau masukkan link postingan Facebook / teks info loker.' });
      return;
    }

    const extractedJob = await extractSmartJobAd({ imageBase64, postUrl, postText });
    res.status(200).json({ ok: true, job: extractedJob });
  } catch (err) {
    console.error('[smart-job-extract API Error]:', err);
    res.status(500).json({ message: err.message || 'Gagal mengekstrak iklan loker dengan AI Gemini 3.8' });
  }
}
