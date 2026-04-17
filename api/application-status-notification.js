import { createClient } from '@supabase/supabase-js';
import { buildApplicationStatusNotification } from '../services/applicationStatusNotification.js';

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
}

async function verifyCaller(adminClient, token) {
  if (!token) {
    return { error: { status: 401, message: 'Unauthorized' } };
  }

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return { error: { status: 401, message: 'Unauthorized' } };
  }

  const caller = userData.user;
  const { data: meta, error: metaError } = await adminClient
    .from('users_meta')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();

  if (metaError) {
    return { error: { status: 500, message: metaError.message } };
  }

  if (!meta || !['admin', 'employer'].includes(meta.role)) {
    return { error: { status: 403, message: 'Forbidden' } };
  }

  return { caller, role: meta.role };
}

async function loadApplicationContext(adminClient, applicationId) {
  const { data: application, error } = await adminClient
    .from('applications')
    .select('id, job_id, seeker_id, job_listings!inner(id, title, company_id), seeker_profiles!inner(id, user_id)')
    .eq('id', applicationId)
    .maybeSingle();

  if (error) return { error };

  const job = Array.isArray(application?.job_listings) ? application.job_listings[0] : application?.job_listings;
  const seeker = Array.isArray(application?.seeker_profiles) ? application.seeker_profiles[0] : application?.seeker_profiles;

  return {
    application,
    job,
    seeker,
  };
}

async function ensureEmployerOwnsApplication(adminClient, callerId, companyId) {
  const { data: companyOwner, error: companyError } = await adminClient
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('user_id', callerId)
    .maybeSingle();

  if (companyError) {
    return { error: { status: 500, message: companyError.message } };
  }

  if (companyOwner) return { ok: true };

  const { data: membership, error: membershipError } = await adminClient
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', callerId)
    .maybeSingle();

  if (membershipError) {
    return { error: { status: 500, message: membershipError.message } };
  }

  if (!membership) {
    return { error: { status: 403, message: 'Forbidden' } };
  }

  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method tidak didukung' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: 'Server notifikasi belum dikonfigurasi.' });
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authResult = await verifyCaller(adminClient, getBearerToken(req));
  if (authResult.error) {
    res.status(authResult.error.status).json({ message: authResult.error.message });
    return;
  }

  const { applicationId, status } = req.body || {};
  if (!applicationId || !status) {
    res.status(400).json({ message: 'applicationId dan status wajib diisi.' });
    return;
  }

  const payload = buildApplicationStatusNotification(status, '');
  if (!payload && !['shortlisted', 'interview_scheduled', 'hired', 'rejected'].includes(status)) {
    res.status(200).json({ ok: true, skipped: true });
    return;
  }

  const contextResult = await loadApplicationContext(adminClient, applicationId);
  if (contextResult.error) {
    res.status(500).json({ message: contextResult.error.message });
    return;
  }

  const { application, job, seeker } = contextResult;
  if (!application || !job || !seeker) {
    res.status(404).json({ message: 'Aplikasi tidak ditemukan.' });
    return;
  }

  if (authResult.role === 'employer') {
    const ownership = await ensureEmployerOwnsApplication(adminClient, authResult.caller.id, job.company_id);
    if (ownership.error) {
      res.status(ownership.error.status).json({ message: ownership.error.message });
      return;
    }
  }

  const notification = buildApplicationStatusNotification(status, job.title || 'lowongan ini');
  if (!notification) {
    res.status(200).json({ ok: true, skipped: true });
    return;
  }

  const { error: insertError } = await adminClient.from('notifications').insert({
    user_id: seeker.user_id,
    type: 'application_update',
    title: notification.title,
    message: notification.message,
    metadata: {
      application_id: application.id,
      job_id: job.id,
      status,
    },
  });

  if (insertError) {
    res.status(500).json({ message: insertError.message });
    return;
  }

  res.status(200).json({ ok: true });
}
